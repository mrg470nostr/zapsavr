# ZapSavr — app

The Phase 1 build (see [../docs/ROADMAP.md](../docs/ROADMAP.md)), grown past its original "one parent, one kid, one goal" scope as testing this ourselves showed what a real family actually needed. A PWA (React + TypeScript + Vite) — see [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for why.

## Run it

```bash
npm install
npm run dev
```

Or try it with zero setup — every "Try a demo" button skips the real wallet entirely (see [src/lib/demo.ts](src/lib/demo.ts)).

## Test, lint, build

```bash
npm test      # vitest — 51+ tests, see docs/SECURITY.md for what's actually covered and why
npm run lint  # oxlint
npm run build # tsc -b && vite build, generates the PWA manifest + service worker
```

All three gate every deploy in `.github/workflows/deploy.yml` — a red CI run never reaches GitHub Pages.

## What's here

- **Family dashboard** (parent mode): pair with any number of kids, each an independently-scoped, independently-revocable NWC connection — see `docs/ARCHITECTURE.md`'s "Family model". Per-kid detail view: balance, budget usage, real transaction history, manual allowance top-up.
- **The parent's own wallet**, inside the same app: balance, send, receive, history — a second connection, separate from any kid's budget. See `docs/ARCHITECTURE.md`'s "The parent's own wallet".
- **Embedded hot wallet (experimental, opt-in)**: a self-custodial on-chain + Lightning wallet held inside ZapSavr itself (Breez SDK - Spark), for parents who find setting up a separate NWC wallet too much friction. This is the one deliberate exception to "ZapSavr never holds a seed phrase" — additive, off by default, code-split so the SDK is only downloaded if a parent opts in. See `docs/ARCHITECTURE.md`'s "Embedded hot wallet" and `docs/SECURITY.md` for the honest limits (PIN-strength encryption, not yet verified against a real payment).
- **Multiple saving goals per kid** ("pots" over one real balance — allocating, moving between goals, or paying from a specific goal never touches the network, it's local bookkeeping). See `docs/ARCHITECTURE.md`'s "Saving spaces".
- **Pause before a big purchase**: a kid-set-for-themselves confirmation threshold, not a parent-enforced limit — see the correction in `docs/PRD.md` for why it's scoped that way.
- **Camera QR scanning** (native `BarcodeDetector`, feature-detected) with a copyable text fallback everywhere a QR code appears — nothing in this app requires a working camera or eyesight to use.
- **Offline app shell**: a real `vite-plugin-pwa` service worker precaches the app so it still loads with zero network, closing a real gap against `CLAUDE.md`'s "flaky rural internet" non-negotiable. Live data (balances, payments) still needs a connection, same as always.
- **Light and dark themes**, toggle in the header, persisted, respects system preference by default.
- Offline/Cashu *payments* (not the app shell above) are still a deliberate stub, pending the mint decision in [../docs/RESEARCH.md](../docs/RESEARCH.md).

ZapSavr never holds a seed phrase or enforces its own spending limits — every payment goes through the connection the parent's own wallet issued and budgets. See `src/lib/nwc.ts` and [../docs/SECURITY.md](../docs/SECURITY.md).
