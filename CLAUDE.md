# CLAUDE.md — instructions for working on ZapSavr

This file is the lens for every session in this repository. Read it before touching code, and re-read it whenever a decision feels unclear.

## What this project is, in one breath

ZapSavr is a Lightning + Cashu wallet for kids and teens, connected to a parent's real wallet through Nostr Wallet Connect, built so a child can save toward a goal and spend small amounts safely, while a parent keeps a revocable, budget-limited leash on the connection rather than custody of every sat.

## Never look at this alone

ZapSavr is not a standalone app idea, it's one piece of BITKIT, which itself grows out of the Bitcoin Amantikir community in Santo Antonio do Pinhal. Before making an architectural or product decision, place it next to the rest of that plan:

- The wallet exists to serve real kids in a real community, not an abstract app-store audience. Every feature decision should survive the question "would this make sense to a ten-year-old at a market stall in Santo Antonio do Pinhal?"
- The wallet is meant to be built together with technical volunteers from the Bitcoin Amantikir community, not shipped and then shown to them. If you're advising on next steps, keep recommending small, working prototypes over long specs, because that's what keeps volunteers motivated.
- The wallet comes before the Nostr social platform and the awards program in BITKIT. Resist scope creep toward those pieces until the wallet has been tested with actual kids.
- Sound Money, Sound Life (the parent education course) frames saving as a practice in low time preference. The saving-target feature is the pedagogical core of this app, not a nice-to-have. Don't let it get cut for the sake of shipping faster.

If anything in this file or in `docs/` seems to have been overtaken by decisions made elsewhere (the Amantikir Obsidian vault, or conversations with Niek), say so explicitly instead of silently building on a stale assumption.

## Non-negotiables

1. **The parent never loses the ability to cut the connection.** Every NWC connection this app creates must be revocable from the parent's wallet with zero dependency on ZapSavr's own servers.
2. **No custody of the parent's keys, ever.** ZapSavr requests a scoped NWC connection string from the parent's existing wallet (or helps them spin up a fresh one via Alby Hub or similar). It never asks for or stores a seed phrase belonging to an adult's main funds.
3. **The child's local wallet (Cashu ecash + any small hot balance) is bounded.** Design for "the amount a kid might lose without anyone's life being ruined," not "however much fits."
4. **Everything must work with a flaky rural internet connection.** Santo Antonio do Pinhal is not a place with guaranteed 4G. The offline Cashu path is not a bonus feature, it's core.
5. **The UI must make sense to an eight- to sixteen-year-old with no crypto background, and to a parent with no Bitcoin background either.** No wallet jargon (Nostr, NWC, npub, sats, invoices, mints) on a primary screen without a plain-language stand-in. `docs/ONBOARDING.md` has the specific rules and the parent/kid setup flow, treat it as binding, not aspirational.

## Working style

- Start with the smallest thing that could be tested by a real kid, not the smallest thing that satisfies a spec. Read `docs/ROADMAP.md` before proposing scope for a milestone.
- Prefer boring, well-audited building blocks (established SDKs, standard NIPs) over custom cryptographic code. This app touches money and minors; novelty is a liability here, not a feature.
- When choosing between two technical approaches, write down the trade-off in `docs/ARCHITECTURE.md` rather than deciding silently, so the next person (human or Claude) can see why.
- Treat `docs/SECURITY.md` as a living checklist. Any change touching wallet balances, permissions, or key handling should be checked against it before merging.

## Source of truth

The high-level plan and the "why" behind this project live in the Amantikir Obsidian vault (`00-Manifest-Sovereign-Life`, `05-Bitkit-Ecosysteem`, `03-Cursus-Sound-Money-Sound-Life`). This repository is where the wallet's "how" lives. If the two ever visibly disagree, flag it to Niek rather than picking one silently.
