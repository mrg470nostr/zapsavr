# Runbook — turning on the embedded hot wallet's mainnet connection

This is the one piece of the embedded hot wallet (`docs/ARCHITECTURE.md`) that needs a human to do something outside this codebase: a Breez API key, required on mainnet only. Regtest works with no key at all — see the "safety runs" note in `docs/ARCHITECTURE.md` for how to test without this.

## What this key actually does

Per Breez's own documentation, the key exists "to mitigate DDoS attacks against the electrum server" their SDK talks to — it's a rate-limit / app-identifier key, not a secret that controls funds. Funds are controlled entirely by the wallet's own seed phrase, generated and encrypted on the parent's device, which this key has no access to. Breez's own getting-started guide for the browser SDK shows the key set directly in client-side code (`config.apiKey = "<your api key>"`), meaning it's expected to end up visible in a deployed site's bundle — that's the intended usage pattern for a browser app, not a mistake. The bounded risk if someone extracts it from the deployed site: they could use up this project's Breez rate-limit quota, potentially getting the key throttled or flagged for review. Not a risk to any family's actual funds.

## Step 1 — request the key

Fill out [Breez's API key request form](https://breez.technology/request-api-key/#contact-us-form-sdk) yourself — this needs a real name, email, and a short message about the project, so it has to be a person doing it, not something to automate or delegate. The key is emailed to the address given.

## Step 2 — add it to this repo

In the GitHub repo (`mrg470nostr/zapsavr`): **Settings → Secrets and variables → Actions → New repository secret**. Name it exactly `VITE_BREEZ_API_KEY`, paste the key Breez emailed, save.

## Step 3 — trigger a rebuild

The workflow (`.github/workflows/deploy.yml`) reads this secret and passes it to the build as `VITE_BREEZ_API_KEY`, which `screens/HotWallet.tsx` picks up via `import.meta.env.VITE_BREEZ_API_KEY` and forwards to `connectHotWallet()`. Adding the secret alone doesn't redeploy anything — push any commit (even an empty one, `git commit --allow-empty -m "Trigger rebuild with Breez API key"`), or re-run the latest workflow manually from the Actions tab.

## Step 4 — verify it actually worked

Open the deployed site, set up (or restore) a hot wallet on mainnet, and check the balance card. Before this key is set, mainnet connections fail with "Missing Breez API key" — after a successful rebuild with the secret in place, that error should be gone and the wallet should show "Connected" with a real balance. This alone proves the key is live; it doesn't yet prove a real payment works — see the "safety runs" section in `docs/ARCHITECTURE.md` for what's been verified against real infrastructure versus what still needs a first real, small, deliberate mainnet payment to check.

## If the build should keep working without this secret

It does, by design — `npm run build` never fails on a missing `VITE_BREEZ_API_KEY`; it just means mainnet hot-wallet connections show the "Missing Breez API key" error until someone completes the steps above. Nothing else in the app depends on this key.
