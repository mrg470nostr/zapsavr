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

## Ark (Arkade): a self-custodial alternative to watch for the offline layer

Cashu solves the "instant and offline" problem but leans on one trust assumption: the mint has to be honest and needs to be online often enough to redeem tokens against. Ark is a newer Bitcoin layer (mainnet since October 2025, with reference wallets like Arkade Wallet already shipping as an open-source, self-custodial PWA) built specifically to close that gap. Instead of ecash issued by a mint, Ark uses VTXOs, virtual UTXOs backed by pre-signed Bitcoin transactions, coordinated by a server (an ASP) that never actually holds custody. If the coordinating server disappears or misbehaves, a user can unilaterally exit to the Bitcoin base layer and reclaim their funds, something a Cashu mint failure doesn't offer in the same way. In plain terms: Ark aims to give self-custody, speed, low cost, and low complexity all at once, which is exactly the combination this project wants for a kid's day-to-day spending layer.

It isn't the default in this plan yet, mainly because it's young. The ecosystem, wallet SDKs, and operator (ASP) landscape are still forming, where Cashu and NWC both have a longer track record and more battle-tested libraries to build against today. But it's worth designing the wallet layer with an eye toward swapping in Ark later, or running it alongside Cashu, since ASPs can already bridge to Lightning, meaning it could eventually sit in the same architectural slot Cashu occupies now without disturbing the NWC/parent-wallet relationship described above. Whoever picks up implementation should re-check Ark's tooling maturity at build time; if it's solid, seriously consider it over Cashu for the reason above, self-custody without a mint to trust is a better match for this project's values than ecash is, mint quality concerns and all.

**Status check (2026-08-12):** Ark/Arkade itself is live (public-beta mainnet), but Boltz, the bridge that connects Arkade's offchain VTXOs to Lightning liquidity, suspended its swap services on 2026-08-03 after AI-assisted exploit attempts, with no public timeline to resume. That specific Ark-to-Lightning path isn't usable right now, so it's not a real option for Phase 1 or the near-term Phase 3 offline-layer decision. See `docs/RESEARCH.md` for the full note and sources; re-check again once a bridge is back before ruling Ark out longer-term.

## Saving spaces: multiple goals without multiple costly accounts

Kids will want more than one jar, a skateboard fund and a birthday-gift fund shouldn't have to compete for the same number. The trap to avoid is treating each saving space as its own wallet or its own NWC connection, which would mean real payments (with real routing and real fees, however small) just to shuffle money between goals. That's not necessary and shouldn't be built that way.

Saving spaces should be a ledger-level idea, not a payment-level one. The kid's app holds one real balance (Lightning-via-NWC for online spend, Cashu or eventually Ark for offline spend), and saving spaces are just labeled portions of that one balance, tracked locally, the same way envelope budgeting works with a single bank account. Moving 2,000 sats from "skateboard" to "birthday gift" is instant, free, and doesn't touch the network at all, it's a local bookkeeping update, not a transaction. Only spending or receiving real money touches the actual payment rails. This keeps the multi-goal feature genuinely costless while still giving a kid the satisfying feeling of several jars filling up side by side. It's flagged in `docs/PRD.md` and `docs/ROADMAP.md` as a phase 3 feature precisely because it's cheap to add once the single-goal core loop is proven, not because it's technically hard.

## Components

**Parent app / parent flow.** Could start as a lightweight companion screen inside the same app (a "parent mode" toggle protected by a PIN or biometric), rather than a fully separate app, to keep the first build small. Responsibilities: help the parent connect (or create) an NWC-capable wallet, set the budget and time window for the connection, view the kid's saving target and rough balance, revoke the connection. A standalone parent app is a reasonable phase-two step once the core loop is proven, not a phase-one requirement.

**Kid app.** The primary surface. Saving target creation and progress display, Lightning spend via the NWC connection (for online, "real" merchant payments), local Cashu wallet for offline and peer-to-peer spend, a simple, jargon-light transaction history.

**NWC layer.** Standard NIP-47 client implementation. Look first at existing SDKs (Alby's `@getalby/sdk` has a mature NWC client) before writing a client from scratch, this is exactly the kind of boring, well-trodden code path called out in `CLAUDE.md`.

**Cashu layer.** A Cashu wallet library (the `cashu-ts` / `cashu-crab` family of implementations, or whatever is most current and audited at build time) handling minting, melting, and token transfer against the chosen mint.

**Storage.** Kid-side local state (saving targets, ecash proofs, connection metadata) lives on-device. If any server component exists at all, it should be as close to stateless as possible, ideally limited to things like push-notification relaying, never balance-of-record.

## Platform note

Both options on the table are cross-platform by default, this isn't a choice between iOS and Android, it's a choice of how to cover both from one codebase. Niek left that choice (native mobile vs. progressive web app) open for Claude Code to weigh in on once implementation actually starts. A rough starting opinion to sanity-check against the SDK ecosystem at build time: a Cashu wallet doing NFC tap-to-pay eventually favors native mobile (React Native, one codebase across iOS and Android), while a browser-based PWA is faster to iterate on with a small pilot group and avoids app-store friction, at the cost of weaker offline/NFC support today. Either way, a parent on an iPhone and a kid on an Android phone (or the reverse) pair and transact with each other the same way, the QR-based NWC pairing above doesn't care what OS is on either end. Confirm current SDK support for both paths (especially Cashu libraries and NWC clients in a PWA context) before locking this in.

**Decision (Phase 1 build, 2026-08-12):** Building as a PWA (React + TypeScript + Vite), not native mobile, for the first prototype. Reasoning: Phase 1's whole point per `ROADMAP.md` is a small, fast, testable loop with a volunteer team and a handful of real kids, and a PWA gets there without app-store review friction or two native codebases to keep in sync while the core loop is still being figured out. The trade-off being accepted deliberately: NFC tap-to-pay and true offline Cashu are weaker in a PWA today, so Phase 1 ships the online (NWC/Lightning) spend path as real and working, and marks the Cashu offline path as a stub to fill in once a mint is chosen (see the open question in `docs/PRD.md` and `docs/RESEARCH.md`). Revisit native (React Native) once the core loop is proven in Phase 2 and NFC/offline become the binding constraint rather than a nice-to-have.
