# ZapSavr — app

The Phase 1 prototype (see [../docs/ROADMAP.md](../docs/ROADMAP.md)): one parent, one kid, one saving target, real payments over Lightning via Nostr Wallet Connect. A PWA (React + TypeScript + Vite) — see [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for why.

## Run it

```bash
npm install
npm run dev
```

## What's here

- A parent connects an NWC-capable wallet (paste the `nostr+walletconnect://` connection string, e.g. from Alby Hub) and pairs with a kid's device via QR code.
- A kid creates one saving target, sees their balance fill toward it, can request an invoice ("Ask for sats") or pay one ("Pay") — all real NIP-47 calls, no mock data.
- Offline/Cashu payments are a stub for now (`src/screens/KidFlow.tsx`), pending the mint decision in [../docs/RESEARCH.md](../docs/RESEARCH.md).

ZapSavr never holds a seed phrase or enforces its own spending limits — every payment goes through the connection the parent's own wallet issued and budgets. See `src/lib/nwc.ts` and [../docs/SECURITY.md](../docs/SECURITY.md).
