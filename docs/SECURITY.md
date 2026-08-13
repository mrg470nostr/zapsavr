# Security & child-safety checklist — ZapSavr

This is money, and it belongs to children. Treat every item here as a gate, not a suggestion, before merging anything that touches balances, permissions, or key material.

## Custody boundaries

ZapSavr's own code and any server it runs must never hold a seed phrase, private key, or unscoped credential belonging to a parent's main wallet. The only thing ZapSavr stores about the parent's wallet is the scoped NWC connection details (relay, scoped pubkey, budget), which by design can only do what the parent explicitly allowed. If a feature request would require ZapSavr to hold more than that, that's a signal to redesign the feature, not to add an exception.

The kid's local Cashu balance should be treated as "money a kid can carry in their pocket," bounded to an amount that, if lost or stolen, is a lesson rather than a disaster. Whatever ceiling gets picked, make it a real, enforced number, not an aspiration.

## Revocation must always work

A parent revoking the NWC connection from their own wallet must immediately and completely cut off the kid's ability to spend through it, with no dependency on ZapSavr's servers being up, reachable, or even still in business. This is the single most important safety property in the whole system and deserves its own test in the build's test suite, not just a manual check.

**What's actually automated (added 2026-08-13, `app/src/**/*.test.ts{,x}`, run via `npm test` in `app/`, gating every deploy in CI):** the real revocation property above lives in the parent's own wallet, entirely outside this codebase, so it can't be unit-tested here without a live wallet integration test — be honest about that boundary rather than claiming more than the suite covers. What the suite does cover, which is the equivalent property ZapSavr's own code is actually responsible for: `getBalanceSats`/`payInvoice` propagate a dead-or-revoked connection's failure rather than ever swallowing it into a fake success or a stale cached balance (`lib/nwc.test.ts`); `SendPanel` never shows "Paid!" unless the payment call actually resolved (`components/SendPanel.test.tsx`); the parent PIN gate genuinely blocks the family dashboard behind a wrong PIN and only unlocks on the correct one (`screens/ParentFlow.test.tsx`); and `clearState()` revokes the local unlocked session, not just the family data, when a parent disconnects (`lib/storage.test.ts`). Extend this suite, don't let it go stale, whenever one of these paths changes.

## Data minimization

Collect the least amount of data about a child that the app can function with. No behavioral tracking, no ad SDKs, no analytics vendor that builds profiles on minors. If usage analytics are needed for product decisions, keep them aggregate and anonymized, and document exactly what's collected in a place a parent can actually read.

## Key handling on the kid's device

If the kid's app holds any keys at all (a Cashu wallet needs some local key material for proofs), they should be generated and stored using the platform's standard secure storage (Keychain on iOS, Keystore on Android, or the PWA equivalent), never in plain local storage. Losing a phone should be a recoverable event for the parent, not a silent, permanent loss of the kid's savings; design a backup/recovery path (likely tied to the parent's connection) before shipping past the pilot phase.

## Dependency hygiene

Prefer established, audited libraries for anything cryptographic (NWC client, Cashu wallet library, Lightning payment handling). Pin dependency versions, and re-check for known vulnerabilities before each pilot release, not just at project kickoff. This app is a plausible target precisely because it's aimed at a vulnerable population; don't make it an easy one.

## Accessibility

This is a safety issue for this app specifically, not polish: a parent or kid using a screen reader, low vision, or no working camera still needs the parental controls and the payment flows to actually work, not degrade into a feature they're quietly locked out of. Checked and fixed 2026-08-13: every form input has a real, programmatically-associated `<label>` (not just adjacent text — screen readers need the `for`/`id` link, or nothing is announced); focus is visibly indicated on every input, not suppressed; buttons that only used to have an `onClick` on a `<span>` or `<h2>` (the goal rename/target-edit controls) are real `<button>` elements now, reachable and operable by keyboard, not just a mouse; every QR code (the NWC pairing code, a payment request) has a visible, selectable, copyable text fallback next to it, because a QR code is fundamentally a sighted-only, camera-only mechanism otherwise. Text contrast was checked against the actual palette values, not eyeballed — every text/background pair in `src/index.css` clears WCAG AA's 4.5:1 minimum, most well above it. Re-check this list before adding new screens; it's easy to reintroduce an unlabeled input or a QR-only flow without noticing.

## Regulatory awareness

This project sidesteps most of the heaviest child-fintech regulation (COPPA-style rules, e-money licensing) precisely because it's non-custodial and community-run rather than a commercial custodial product. That's a feature of the architecture, not an excuse to stop thinking about it. If this ever grows past a single community pilot into something more public, revisit this assumption explicitly and get real legal input before scaling.

## Before every pilot release, check

Does revocation actually cut off spending immediately, tested end to end. Is the kid-side balance ceiling enforced, not just documented. Are keys on the kid's device in secure storage, not plain text. Has the dependency list been checked for known issues in the last month. Would a parent, reading the data collected, feel comfortable with all of it. Does `npm test` in `app/` still pass, and does it still cover every path a change just touched. Can every screen added since the last release be operated without a mouse and without sight (every input labeled, every QR code has a text fallback)?
