# ZapSavr, explained — what it is, and why it's built this way

This document is for anyone who wants the full picture without reading seven other files first — a technical volunteer joining the Bitcoin Amantikir community, a parent curious what they're actually agreeing to, or Niek explaining it to someone else. It doesn't replace the other docs in this folder; it's the front door to them. Where something deserves more depth, it points there instead of repeating it.

## The one-paragraph version

ZapSavr is a savings-first Lightning wallet for kids and teens. A child sees their sats sitting in a named jar — "new skateboard," "market day" — and watches it fill as they save, then spends in about a second when they're ready, fast enough that a market stall vendor barely notices the difference between cash and sats changing hands. A parent holds a string to that jar the whole time: not control over every purchase, but the ability to cut the connection instantly, from their own wallet, with zero dependency on ZapSavr's servers being up, reachable, or even still in business. It's built for the Bitcoin Amantikir community in Santo Antonio do Pinhal, and open to any circular local economy that wants the same thing.

## Who this is for

Two people, on two sides of one connection: a parent who already has some relationship to Bitcoin (or is starting one), and a kid — eight to sixteen, roughly — with no crypto background at all. Neither one should ever need to understand what's actually happening underneath to use the app comfortably. `docs/ONBOARDING.md` has the specific rules for how that's enforced in the UI; this document is about the reasoning, not the copy.

## The problem this is actually solving

Regular fintech apps for kids — Greenlight, Google Wallet's family features, and similar — hand a child a debit card wired to a custodial ledger sitting in someone else's data center. The money isn't really theirs in any meaningful sense; it's a number a company lets them see. ZapSavr is trying to hand a kid something closer to what their parents in the Amantikir community already believe in: money that isn't permission-based, that can't be frozen by a third party, and that teaches patience because sats being saved toward something visibly grow instead of just existing as an entry in someone else's database.

That last part isn't a side benefit — it's the actual point. The Sound Money, Sound Life course (the parent education course this project grows out of) frames saving as a practice in low time preference: the discipline of choosing a larger later reward over a smaller immediate one. A savings jar that fills slowly and visibly, that a kid chose the goal for themselves, is a hands-on lesson in exactly that — not a feature bolted onto a banking app, but the pedagogical core of the whole thing. If a build decision ever threatens to compress or skip that (rushing a kid past the goal-setting step, for instance, to ship a demo faster), that's a sign the shortcut is cutting the wrong thing.

## How it actually works

**The parent connects their own wallet, once, per kid.** Not a ZapSavr account — their *own* Lightning wallet, one they already have or set up fresh. Inside that wallet, they create a scoped connection (the technical name is Nostr Wallet Connect, NWC) for each kid: a narrow permission that says "this app can request up to this weekly budget, nothing more." ZapSavr never touches the wallet's actual keys. If anything ever looks wrong, the parent revokes that one connection from their own wallet the way they'd cancel a subscription — instant, no drama, and it works even if ZapSavr's website disappeared entirely. That revocability is treated as the single most load-bearing safety property in the whole system; see `docs/SECURITY.md`'s "Revocation must always work" for exactly what's tested around it.

**The kid gets a jar, or several.** A saving target isn't a separate account — it's a label over one real balance, the same way envelope budgeting works with a single bank account. Moving money between "skateboard" and "birthday gift" is instant and free because it's just local bookkeeping, never an actual payment. A kid can also pay directly from a specific jar, watching that jar's number go down instead of some abstract wallet total. See `docs/ARCHITECTURE.md`'s "Saving spaces" for the mechanics.

**Spending is fast and, where possible, doesn't need signal.** Online payments go out over Lightning in about a second. A lighter offline layer (Cashu ecash, still a stub pending a mint decision — see `docs/RESEARCH.md`) is meant to let kids zap each other or pay at a market stall with no internet at all, because Santo Antonio do Pinhal doesn't have guaranteed connectivity and "works offline" isn't a nice-to-have here, it's load-bearing.

**The whole thing runs as a website that installs like an app.** No app-store review, no separate build for every phone, works the same on a hand-me-down Android as a newer iPhone. `docs/ARCHITECTURE.md` has the fuller trade-off, but the short version: for a project this early, with volunteers rather than a dedicated mobile team, a PWA (Progressive Web App) is the smallest thing that could actually be tested by a real kid this month rather than next year.

**An opt-in embedded hot wallet exists for parents who want one, added 2026-08-14.** This is a genuine exception to the rule above about ZapSavr never touching keys, and it's worth being direct about that rather than burying it. A parent who finds "go set up a separate NWC-capable wallet app" too much friction (a real complaint from early testing — Alby Hub, the most-recommended option, was described as "extremely complicated for what it does") can instead let ZapSavr generate and hold a real, self-custodial Bitcoin wallet — on-chain and Lightning, one balance — directly. It's off by default, requires a deliberate opt-in from the family dashboard, and is clearly labeled experimental everywhere it appears. The next section explains why this doesn't quietly contradict everything above it.

## Why the design choices are what they are, not something else

**Why a scoped connection to the parent's own wallet, instead of ZapSavr running a custodial backend.** A custodial model would be simpler to build and would give the product team more control — and would also mean ZapSavr becomes the thing standing between a family and their own money, exactly the failure mode this project exists to avoid. NWC's specific property — a connection that's scoped, budgeted, and revocable without depending on the app that requested it — is what makes a workable parental-control model possible without ever building that custodial backend. See `docs/RESEARCH.md` for why this was the deciding factor over alternatives.

**Why boring, audited libraries instead of custom cryptography anywhere.** This app touches money and minors. Novelty in the cryptographic layer is a liability, not a feature, here — every library choice (Alby's NWC client, `@scure/bip39` for the hot wallet's mnemonic, standard BOLT11 decoding) was picked for being established and reviewed, not for being interesting.

**Why the embedded hot wallet is a labeled exception instead of either a silent one or a rejected idea.** The tempting failure modes were to either quietly add key-holding code without calling attention to the fact that it breaks a stated principle, or to refuse the feature outright because it doesn't fit the original model. Neither seemed honest. Instead: it's built, it's real, it's documented loudly as the one deliberate exception (`docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/ONBOARDING.md` all say so explicitly), it's opt-in and off by default, and the code that touches the Breez SDK it depends on is isolated and lazy-loaded so a family that never opts in never even downloads it. When a principle gets bent, the bend should be visible, not smoothed over.

**Why saving spaces are bookkeeping, not separate wallets or connections.** A separate NWC connection per goal would mean real payments — real routing, real fees, however small — just to move money from one jar to another inside a kid's own wallet. That's not a cost this project should impose for a UX nicety. Keeping goals as labels over one real balance keeps multi-goal saving genuinely free.

**Why the parent's PIN gates the hot wallet with no separate password.** The PIN was already stored on the device for the family-dashboard unlock, before the hot wallet existed. Reusing it for the wallet's at-rest encryption doesn't introduce a new weak point beyond what already existed — but it does mean the honest limit on that PIN (a 4-digit code has 10,000 possible values, real protection against a casual look, not against someone with a copy of the ciphertext and time) now protects something with real stakes. That's why PIN attempts are rate-limited as of the same date the hot wallet shipped, not before — the risk only became real once there was something worth guessing for.

## What's actually proven, and what's still a claim

Everything about NWC-based pairing, allowance budgets, revocation, and saving goals is built, automatically tested (`app/src/**/*.test.ts{,x}`, gating every deploy), and has been the default path since before the hot wallet existed. The embedded hot wallet is younger and more honestly caveated: `connect()`, balance reads, and generating a real receive address have been verified against Breez's live (but worthless, test-only) regtest network — not simulated, actually run against real infrastructure. Sending a payment, and Lightning specifically on any network, have not yet been verified against real money, because that requires an API key from Breez that this project doesn't have yet. Offline Cashu payments are still a stub. None of this is hidden — `docs/SECURITY.md` and `docs/ARCHITECTURE.md` say plainly, in each case, what's been checked and what hasn't, so nobody downstream mistakes "it typechecks" for "it's been tested with real money."

## Where this fits in the bigger picture

ZapSavr is the wallet piece of BITKIT, a small ecosystem for kids growing out of the Bitcoin Amantikir community: this wallet, a Nostr social platform, and an awards program celebrating what kids build with it. The wallet comes first on purpose, and stays first until it's actually been tested with real kids in Santo Antonio do Pinhal — the Nostr platform and the awards program are deliberately out of scope until then, not because they're less important, but because building them before this is proven would be building on a guess. `docs/ROADMAP.md` has the phase-by-phase plan; the short version is: smallest real thing first, tested with actual technical volunteers and actual kids, before anything else gets added.

## Where to go for more

- `docs/PRD.md` — what's being built and for whom, in product terms
- `docs/ARCHITECTURE.md` — the technical shape, and every trade-off decision with its date and reasoning
- `docs/SECURITY.md` — the living safety checklist, the gate every change touching money or keys has to clear
- `docs/ONBOARDING.md` — the specific rules for the parent and kid setup flows, including why the hot wallet is allowed to break one of them on purpose
- `docs/RESEARCH.md` — what was actually looked at before deciding on this shape, with sources
- `docs/ROADMAP.md` — the order things get built in, and what's deliberately left out
- `app/README.md` — how to actually run, test, and build the code
