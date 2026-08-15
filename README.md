# ZapSavr

A savings-first Lightning wallet for kids and teens, built for the Bitcoin Amantikir community in Santo Antonio do Pinhal, and open to any circular local economy that wants the same thing.

## The idea in one story

Picture a piggy bank that never really taught anyone anything, because once the coin went in, it just sat there, invisible, until the day it got smashed open. ZapSavr is the opposite of that piggy bank. A child opens the app and sees their sats sitting in a jar with a name on it, "new skateboard" or "market day," and every time they add a little, the jar visibly fills. When they want to spend, the payment goes out over Lightning in about a second, fast enough that a market stall vendor barely notices the difference between cash and sats changing hands. And the whole time, a parent holds the string, not to control every purchase, but to make sure the string can never be cut by accident.

That string is Nostr Wallet Connect. The parent runs (or already has) a real Lightning wallet. ZapSavr never touches that wallet's keys directly, it holds a narrow, revocable permission: send up to this budget, request invoices, nothing more. If something goes wrong, the parent revokes the connection the way you'd cut off a subscription, instantly, with no drama. For the moments when a market stall has no signal or the group of kids just wants to zap each other on the spot, a lighter layer of Cashu ecash lives inside the same wallet, tokens that move phone to phone like a handshake, no relay required.

## Why this instead of a bank app for kids

Regular fintech apps for kids (Greenlight, Google Wallet's family features, and similar) hand a child a debit card wired to a custodial ledger somewhere in a data center. ZapSavr hands a child a taste of what their parents in the Amantikir community already believe in: money that isn't permission-based, that can't be frozen by a third party, and that teaches patience because sats you're saving for something visibly grow instead of just existing as a number in someone else's database. The saving target isn't a gimmick bolted onto a bank app, it's the whole point, a hands-on lesson in what the Sound Money, Sound Life course calls low time preference.

## Try it

**https://mrg470nostr.github.io/zapsavr/** — live, deployed straight from `master` on every push. Tap "🧪 Try a demo" on either the parent or kid side to click through the whole thing with no real wallet.

## What's in this repository

- `app/` — the actual working PWA (React + TypeScript + Vite). Start here to run, test, or change the code — see `app/README.md`.
- `CLAUDE.md` — read this first if you're Claude Code. It's the compass for how to build this project.
- `docs/EXPLAINER.md` — the full picture in one document: what ZapSavr does and why it's built this way, for anyone who doesn't want to read every other doc first.
- `docs/RUNBOOK.md` — the one manual step outside the codebase: getting a Breez API key for the embedded hot wallet's mainnet connection.
- `docs/PRD.md` — what we're building and for whom, in plain language.
- `docs/ARCHITECTURE.md` — how the pieces fit: NWC, Cashu, the parent app, the kid app.
- `docs/ROADMAP.md` — the order we build things in, starting from the smallest working prototype.
- `docs/SECURITY.md` — the things that must never go wrong, because this holds money that belongs to children.
- `docs/ONBOARDING.md` — how a parent and a teen get set up without ever needing to understand Nostr, NWC, or Lightning.
- `docs/NOSTR_INTEGRATION.md` — how the wallet later plugs into the BITKIT Nostr platform (identity, zaps, staying non-KYC).
- `docs/RESEARCH.md` — what we looked at before deciding on this shape, with sources.

## Where this fits in the bigger picture

ZapSavr is the wallet piece of BITKIT, a small ecosystem for kids growing out of the Bitcoin Amantikir community: a Nostr social platform, this wallet, and an awards program that celebrates what kids build with it. The wallet comes first on purpose. Build a working prototype with a handful of technical volunteers from the community, test it with a handful of real kids in Santo Antonio do Pinhal, and let what you learn there shape everything that comes after.
