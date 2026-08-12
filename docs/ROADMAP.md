# Roadmap — ZapSavr

The BITKIT plan already sets the order for this: build the smallest working wallet with community volunteers, test it on real kids, and let that experience shape everything after. This roadmap breaks that into build-sized phases.

## Phase 0 — Find the builders

Before a line of code, ask around at Café com Bitcoin who wants to build, not just use, Bitcoin tools. Hold one informal working session on what a kids' wallet should do here, and agree up front how decisions get made and how any upside gets shared. This phase belongs to Niek and the community, not to Claude Code, but it determines who Claude Code is effectively pairing with once building starts.

## Phase 1 — The smallest real thing

Goal: one parent, one kid, one saving target, one real payment, offline-capable.

A parent connects an existing (or freshly created) NWC-capable wallet and sets a budget. A kid's device pairs once via the connection string. The kid creates a single saving target and watches it fill as sats arrive. The kid can spend via Lightning (online) or Cashu ecash (offline) for a small, real purchase. The parent can see progress and revoke the connection.

This phase should be buildable in a few weeks by a small volunteer team, on purpose, so it stays motivating rather than becoming a half-year slog. Ship it rough. The goal is something a real kid can hold and use, not a polished product.

## Phase 2 — Test with real kids

Put Phase 1 in the hands of a handful of kids in Santo Antonio do Pinhal. Watch what confuses them, what they instinctively understand, and what they do that nobody anticipated (kids are reliably better at finding the edges of an app than a spec ever is). Feed what's learned back into the product before adding more scope. Expect the saving-target visual, the pairing flow, and the offline payment moment to be the three things most likely to need rework here.

## Phase 3 — Round out the loop

Once Phase 1 survives contact with real kids, fill in what got deliberately deferred: multiple named saving spaces (built as free, instant, ledger-level buckets over one balance, not separate accounts, see `docs/ARCHITECTURE.md`), a friendlier parent view (maybe its own lightweight app rather than a mode toggle), per-transaction limits as a second guardrail beyond the weekly budget, a proper (if still simple) transaction history, and a decision on which Cashu mint(s) the community trusts long-term, or whether Ark/Arkade has matured enough by then to use instead.

## Phase 4 — Only then, the rest of BITKIT

The Nostr social platform and the awards program come after the wallet has real users and real usage patterns to build on. Resist starting them earlier just because they seem more exciting; per the founding plan, a social layer with nothing to share and an awards program with no active community are both premature.

When this phase starts, read `docs/NOSTR_INTEGRATION.md` first. The short version: every ZapSavr user already has the Nostr keypair the platform needs, so there's no second signup, and the one genuinely new piece of infrastructure is a small, community-run LNURL resolver so kids can receive zaps without depending on a third-party service.

## Things intentionally left out of this roadmap

Multi-currency support, fiat on/off ramps beyond what the parent's own wallet already provides, any kind of investment or yield feature, in-app advertising or monetization of any kind. These aren't just "later," they're actively against the spirit of the project and shouldn't quietly creep back in through a well-meaning feature request.
