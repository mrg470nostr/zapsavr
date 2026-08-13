# Architecture — ZapSavr

## The shape of the system

Think of three actors passing a single thread of trust between them. The parent's wallet is the source of real money and real custody, the thing that has actually earned satoshis through work or trade. ZapSavr, the app on the kid's phone, is a thin, permissioned window into that wallet, plus a small local pouch of ecash for quick, offline spending. And wherever a payment is being made, a merchant or another kid, is the destination. Nothing in the middle should ever become a place where money quietly pools up unaccounted for.

```
┌─────────────────────┐        NWC (NIP-47, budgeted,        ┌──────────────────────┐
│  Parent's wallet     │◀──────  revocable connection)  ─────▶│  ZapSavr (kid's app)  │
│  (Alby Hub, Phoenix,  │                                       │  - saving targets     │
│   any NWC-capable     │                                       │  - Lightning spend    │
│   wallet)              │                                       │    via NWC            │
└─────────────────────┘                                       │  - local Cashu wallet │
                                                                 │    (offline spend)    │
                                                                 └──────────────────────┘
                                                                          │
                                                                          │ Cashu tokens,
                                                                          │ phone-to-phone
                                                                          ▼
                                                                 ┌──────────────────────┐
                                                                 │  Other kid's ZapSavr  │
                                                                 │  or a merchant with   │
                                                                 │  a Cashu/Lightning    │
                                                                 │  acceptance point     │
                                                                 └──────────────────────┘
```

## Why NWC and not a custom backend

Building a custodial ledger, "ZapSavr Inc. holds a database of kid balances," would be the fast path and the wrong one. It means ZapSavr becomes a target for regulation, a single point of failure, and a place where a bug or a breach touches children's money directly. NWC (NIP-47) sidesteps all of that: the parent's existing wallet stays in charge of real custody, and what ZapSavr holds is a scoped, revocable permission slip, encrypted and relayed over Nostr, that says "this app may request payments up to this budget, in this window." The `docs.nwc.dev` documentation describes this directly as combining "granular permission management and budget settings to protect users." That sentence is doing the heavy lifting for the entire parental-control model here, so treat it as load-bearing.

Practically, this means: no ZapSavr server ever needs to see or hold a Lightning balance belonging to a family. The worst case if ZapSavr's own infrastructure is compromised is that an attacker sees connection metadata, not that they can drain anyone's sats, because the actual spend authority lives in the parent's wallet, enforcing its own budget.

## Why Cashu sits alongside it, not instead of it

NWC needs a live connection to a Nostr relay and, ultimately, a live Lightning payment. That's fine for the "buy something at a real market stall with a Lightning terminal" case, but it breaks down exactly where a lot of the real behavior will happen: two kids trading a few sats on a school playground with patchy signal, or a small vendor who just has a phone and no proper point of sale. Cashu ecash tokens are bearer instruments, they move by being handed over (QR, NFC tap, or a shared link) and don't need a live connection at the moment of transfer. A kid's local Cashu balance is topped up periodically from the parent-connected Lightning wallet (melting Lightning sats into ecash tokens against a mint) and can be spent instantly, offline, kid-to-kid or kid-to-vendor, reconciling with the mint whenever a connection is available again.

This does introduce one more trust assumption: the Cashu mint itself, which needs to be honest and online often enough to redeem tokens. For a first pilot, the mint should either be one the Amantikir community itself considers trustworthy, or a small mint the community volunteers stand up and control, so the trust boundary stays inside the community rather than depending on an unfamiliar third party. Capture the actual choice made here in a follow-up note once it's decided, this file should stay updated as decisions land.

## One app, one download, two roles

ZapSavr ships as a single app, not separate parent and kid apps. At setup, whoever's holding the phone picks a role, "I'm a parent" or "I'm a kid", and the app adapts around that choice. A parent's instance unlocks the budget, revocation, and progress-viewing screens behind a PIN or biometric; a kid's instance shows the saving target and spend flows. This keeps the pairing step simple, since it's two installs of the same app talking to each other rather than two different products having to agree on a shared format, and it keeps the first build small, since there's one codebase, one app-store listing, one thing to maintain.

A standalone, more capable parent app is a reasonable phase-two idea once the core loop is proven (see `ROADMAP.md`), not a phase-one requirement.

## How parent and child actually connect (pairing)

There's no ZapSavr account system doing the introduction. Pairing is a one-time secret handoff, the same pattern any NWC-compatible app uses:

1. On the parent's device, ZapSavr (in parent mode) talks to the parent's NWC-capable wallet and requests a new connection, scoped to a budget and time window the parent sets. The wallet hands back a connection URI, standard `nostr+walletconnect://` format, which the app renders as a QR code.
2. On the kid's device, ZapSavr (in kid mode) scans that QR once, during setup. That single scan is the entire pairing ceremony, there's no username, password, or server-side account linking the two.
3. From then on, the kid's app uses that connection to request payments, and the parent's wallet enforces the budget on every request. No relay, server, or database anywhere is tracking "this kid belongs to this parent", the relationship exists entirely inside that one scoped credential.
4. Revocation reverses it just as directly: the parent deletes the connection from their own wallet, and the kid's app loses the ability to spend through it immediately, with nothing else to clean up.

Multiple kids just means the parent repeats step 1 once per kid, each with its own independently budgeted, independently revocable connection, so one kid's spending never affects another's and revoking one never touches the rest.

## Family model: one parent view over several kids

This was always implied above ("multiple kids just means the parent repeats step 1 once per kid") but the Phase 1 build only ever stored a single kid's connection. Fixed 2026-08-12: the parent's device now holds a *family*, a list of `{nickname, nwcUrl}` pairs, one entry per kid, each still its own independently-scoped NWC connection exactly as described in the pairing section above. Nothing about the trust model changes, this is a UI/storage fix, not a new architectural idea: a family dashboard lists every paired kid as a card (balance, goal progress), tapping one opens that kid's detail view, and "add a kid" just re-runs the same one-time pairing ceremony against a new connection.

The parent's detail view for a given kid reuses the exact same NWC connection the kid's device holds, calling read methods on it (`get_balance`, `get_budget`, `list_transactions`) the same way the kid's app calls spend methods (`pay_invoice`, `make_invoice`). NWC connections are capability-scoped, not identity-scoped, whoever holds the connection string can call whatever methods it grants, so a parent viewing "read-only" data through the same connection their kid spends through isn't a new trust boundary, it's the existing one used two ways. This does mean anyone holding that connection string (parent or kid) can see the same balance and budget info; it's not a way to give a parent visibility a kid can't see, and shouldn't be presented as one.

A visible, unmissable "kid mode" indicator was added to the kid-facing screens for the same reason a shared family device needs it, so nobody mistakes which surface is showing.

## The parent's own wallet, inside ZapSavr (2026-08-13)

This is a real repositioning worth naming plainly, not just a new screen. Every other section on this page describes ZapSavr as "the app on the kid's phone" plus a control panel the parent uses to manage it, with the parent's actual day-to-day spending assumed to happen in their own separate wallet app entirely outside ZapSavr. That's no longer the whole picture: the family dashboard now has a "Your wallet" card alongside the kid cards, and tapping it gives the parent balance, send, receive, and transaction history for their own money.

The reasoning: a parent who only opens ZapSavr to occasionally check on a kid's allowance opens it rarely. A parent who uses it for their own daily payments too opens it constantly, and manages the kids' side as a natural extension of an app they already have open, better for the business case and for actually noticing if something looks off with a kid's spending. It's also just less annoying than keeping two wallet apps installed.

The safety-critical part: **this is a second, separate NWC connection**, not a reuse of any kid's connection. The parent creates it in their wallet app the same way they'd create a kid's connection, just without a kid-appropriate budget cap, since it represents their own money. Keeping it separate means a kid's spending cap is never touched by the parent's own activity and vice versa, the two connections don't know about each other, exactly the same independence already described for multiple kids above. This does *not* change the non-negotiables in `CLAUDE.md`: ZapSavr still never holds a seed phrase, still never enforces any limits itself, whatever the parent's own connection allows is entirely up to the budget (or lack of one) they set when creating it in their own wallet.

## Ark (Arkade): a self-custodial alternative to watch for the offline layer

Cashu solves the "instant and offline" problem but leans on one trust assumption: the mint has to be honest and needs to be online often enough to redeem tokens against. Ark is a newer Bitcoin layer (mainnet since October 2025, with reference wallets like Arkade Wallet already shipping as an open-source, self-custodial PWA) built specifically to close that gap. Instead of ecash issued by a mint, Ark uses VTXOs, virtual UTXOs backed by pre-signed Bitcoin transactions, coordinated by a server (an ASP) that never actually holds custody. If the coordinating server disappears or misbehaves, a user can unilaterally exit to the Bitcoin base layer and reclaim their funds, something a Cashu mint failure doesn't offer in the same way. In plain terms: Ark aims to give self-custody, speed, low cost, and low complexity all at once, which is exactly the combination this project wants for a kid's day-to-day spending layer.

It isn't the default in this plan yet, mainly because it's young. The ecosystem, wallet SDKs, and operator (ASP) landscape are still forming, where Cashu and NWC both have a longer track record and more battle-tested libraries to build against today. But it's worth designing the wallet layer with an eye toward swapping in Ark later, or running it alongside Cashu, since ASPs can already bridge to Lightning, meaning it could eventually sit in the same architectural slot Cashu occupies now without disturbing the NWC/parent-wallet relationship described above. Whoever picks up implementation should re-check Ark's tooling maturity at build time; if it's solid, seriously consider it over Cashu for the reason above, self-custody without a mint to trust is a better match for this project's values than ecash is, mint quality concerns and all.

**Status check (2026-08-12):** Ark/Arkade itself is live (public-beta mainnet), but Boltz, the bridge that connects Arkade's offchain VTXOs to Lightning liquidity, suspended its swap services on 2026-08-03 after AI-assisted exploit attempts, with no public timeline to resume. That specific Ark-to-Lightning path isn't usable right now, so it's not a real option for Phase 1 or the near-term Phase 3 offline-layer decision. See `docs/RESEARCH.md` for the full note and sources; re-check again once a bridge is back before ruling Ark out longer-term.

## Saving spaces: multiple goals without multiple costly accounts

Kids will want more than one jar, a skateboard fund and a birthday-gift fund shouldn't have to compete for the same number. The trap to avoid is treating each saving space as its own wallet or its own NWC connection, which would mean real payments (with real routing and real fees, however small) just to shuffle money between goals. That's not necessary and shouldn't be built that way.

Saving spaces should be a ledger-level idea, not a payment-level one. The kid's app holds one real balance (Lightning-via-NWC for online spend, Cashu or eventually Ark for offline spend), and saving spaces are just labeled portions of that one balance, tracked locally, the same way envelope budgeting works with a single bank account. Moving 2,000 sats from "skateboard" to "birthday gift" is instant, free, and doesn't touch the network at all, it's a local bookkeeping update, not a transaction. Only spending or receiving real money touches the actual payment rails. This keeps the multi-goal feature genuinely costless while still giving a kid the satisfying feeling of several jars filling up side by side. It's flagged in `docs/PRD.md` and `docs/ROADMAP.md` as a phase 3 feature precisely because it's cheap to add once the single-goal core loop is proven, not because it's technically hard.

**Built 2026-08-13, following exactly this shape.** `KidState.targets` is an array of `{id, name, goalSats, allocatedSats}`; `allocatedSats` per goal is the local bookkeeping number, never touched by network calls. The kid's home screen shows the one real balance (from `get_balance`) up top, then each goal as a "pot" with its own allocated/target progress bar, then whatever's left unallocated ("N sats not in a goal yet"). Moving sats into or out of a goal, renaming it, changing its target, or deleting it (which releases its allocation back to unallocated automatically, since unallocated is *computed* as balance minus the sum of what's allocated, never stored separately) are all pure local state updates. The UX pattern (one total balance, several named pots below it, tap a pot to manage it) follows the same convention as Monzo Pots, Starling Spaces, and NatWest Rooster Money's kid-pocket-money Pots — a well-trodden pattern worth reusing rather than inventing a new mental model for the same job.

One honest limitation stated directly in the goal-detail screen: allocating sats to a goal is a label, not a lock. Nothing in this architecture (or in Lightning generally, without building real sub-wallets) stops a kid from spending sats that happen to be "in" a goal — the real balance is still one shared thing. Don't let a future feature request quietly imply otherwise without actually building isolated balances to back it up.

**"Pay from this goal" (added same day).** A kid can pay an invoice directly from a goal's detail screen, not just from the wallet-level "Pay" button. The one real trick: knowing how much to deduct from that specific goal's `allocatedSats` after paying. NIP-47's `pay_invoice` response only returns `{preimage, fees_paid}`, no amount, so `payInvoice()` in `lib/nwc.ts` decodes the amount straight out of the BOLT11 invoice itself before paying, using `light-bolt11-decoder` (small, audited, same author family as `nostr-tools` which `@getalby/sdk` already depends on — boring dependency, not novel code, per `CLAUDE.md`'s preference). "Any amount" invoices don't encode a value; those just don't touch the goal's allocation, same as paying from the wallet-level button always did.

## Components

**Parent app / parent flow.** Could start as a lightweight companion screen inside the same app (a "parent mode" toggle protected by a PIN or biometric), rather than a fully separate app, to keep the first build small. Responsibilities: help the parent connect (or create) an NWC-capable wallet, set the budget and time window for the connection, view the kid's saving target and rough balance, revoke the connection. A standalone parent app is a reasonable phase-two step once the core loop is proven, not a phase-one requirement.

**Kid app.** The primary surface. Saving target creation and progress display, Lightning spend via the NWC connection (for online, "real" merchant payments), local Cashu wallet for offline and peer-to-peer spend, a simple, jargon-light transaction history.

**NWC layer.** Standard NIP-47 client implementation. Look first at existing SDKs (Alby's `@getalby/sdk` has a mature NWC client) before writing a client from scratch, this is exactly the kind of boring, well-trodden code path called out in `CLAUDE.md`.

**Cashu layer.** A Cashu wallet library (the `cashu-ts` / `cashu-crab` family of implementations, or whatever is most current and audited at build time) handling minting, melting, and token transfer against the chosen mint.

**Storage.** Kid-side local state (saving targets, ecash proofs, connection metadata) lives on-device. If any server component exists at all, it should be as close to stateless as possible, ideally limited to things like push-notification relaying, never balance-of-record.

## Platform note

Both options on the table are cross-platform by default, this isn't a choice between iOS and Android, it's a choice of how to cover both from one codebase. Niek left that choice (native mobile vs. progressive web app) open for Claude Code to weigh in on once implementation actually starts. A rough starting opinion to sanity-check against the SDK ecosystem at build time: a Cashu wallet doing NFC tap-to-pay eventually favors native mobile (React Native, one codebase across iOS and Android), while a browser-based PWA is faster to iterate on with a small pilot group and avoids app-store friction, at the cost of weaker offline/NFC support today. Either way, a parent on an iPhone and a kid on an Android phone (or the reverse) pair and transact with each other the same way, the QR-based NWC pairing above doesn't care what OS is on either end. Confirm current SDK support for both paths (especially Cashu libraries and NWC clients in a PWA context) before locking this in.

**Decision (Phase 1 build, 2026-08-12):** Building as a PWA (React + TypeScript + Vite), not native mobile, for the first prototype. Reasoning: Phase 1's whole point per `ROADMAP.md` is a small, fast, testable loop with a volunteer team and a handful of real kids, and a PWA gets there without app-store review friction or two native codebases to keep in sync while the core loop is still being figured out. The trade-off being accepted deliberately: NFC tap-to-pay and true offline Cashu are weaker in a PWA today, so Phase 1 ships the online (NWC/Lightning) spend path as real and working, and marks the Cashu offline path as a stub to fill in once a mint is chosen (see the open question in `docs/PRD.md` and `docs/RESEARCH.md`). Revisit native (React Native) once the core loop is proven in Phase 2 and NFC/offline become the binding constraint rather than a nice-to-have.
