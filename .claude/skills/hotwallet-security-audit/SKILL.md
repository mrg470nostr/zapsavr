---
name: hotwallet-security-audit
description: Runs a structured, authorized security assessment of ZapSavr's embedded hot wallet (app/src/lib/hotwallet-*.ts, app/src/screens/HotWallet.tsx) before real funds go into it. Use when the user asks to audit, pentest, or evaluate how safe the hot wallet is, or asks whether a specific amount of real money is appropriate to hold in it.
---

# Hot wallet security audit — ZapSavr embedded hot wallet

## Before starting

This is an audit of **code the user owns, in a repo they control** — that's the authorization. Scope is this repository and its deployed site (`https://mrg470nostr.github.io/zapsavr/` or wherever it's actually deployed) only. Do not attempt to attack Breez's or Spark/Lightspark's production infrastructure, do not attempt to drain or manipulate any wallet that isn't a test wallet created for this audit, and never move real mainnet funds as part of testing — every test in this skill either uses regtest (worthless test coins, see `docs/ARCHITECTURE.md`'s "safety runs" note) or is a static/code review with no funds involved. If a check would require touching real money to complete, flag it as "requires a live mainnet test the user must run deliberately," don't do it unprompted.

Read `docs/ARCHITECTURE.md`'s "Embedded hot wallet (experimental, opt-in)" and `docs/SECURITY.md` in full first — they already document known, accepted limitations (PIN-derived encryption strength, what's verified vs. not). Don't re-report those as new findings; the job here is to find what *isn't* already documented, and to verify the documented claims are still accurate.

## Threat model

**What this system actually protects:** a BIP39 mnemonic (the hot wallet's entire fund-controlling secret), encrypted at rest with a key derived from the parent's 4-digit PIN.

**What it does NOT protect against, by design, already documented:** a determined attacker with a copy of the encrypted blob and time to brute-force a 4-digit PIN offline; a parent who forgets their PIN and has no written backup; anything happening on a device the attacker already fully controls (keylogger, screen recorder, malicious browser extension with page access).

**What's actually in scope to find new problems in:**
1. Ways to get the mnemonic, the PIN, or funds out of the system *other than* the documented brute-force path.
2. Ways to trick the app into signing/sending a payment the parent didn't intend.
3. Ways to corrupt or intercept the code the parent's browser actually runs (supply chain, build pipeline, hosting).
4. Gaps between what the docs claim is true and what the code actually does.

## Audit checklist

Work through each section. For each finding, record: file + line, severity (critical/high/medium/low/informational), whether it's already documented as a known/accepted limitation, and a concrete exploit scenario (not just "this could be a problem" — show the actual attack).

### 1. Cryptography and key handling

- Read `app/src/lib/hotwallet-storage.ts` in full. Verify: salt and IV are freshly random per encryption (`crypto.getRandomValues`), never reused; PBKDF2 iteration count matches what the docs claim (210,000); AES-GCM is used correctly (unique IV per encryption, auth tag not stripped or ignored).
- Verify `generateWalletMnemonic()` in `app/src/lib/hotwallet-sdk.ts` uses `@scure/bip39`'s `generateMnemonic` with a real CSPRNG-backed entropy source (it should — but confirm it isn't seeded or biased anywhere on the call path), and that entropy is 128 bits (12 words), not silently truncated.
- Check whether the decrypted mnemonic, the PIN, or the connected SDK instance is ever written to `console.log`, an error message, a URL, analytics, or any other place that could leak it (`grep -rn "mnemonic\|BREEZ\|apiKey" app/src --include=*.tsx --include=*.ts` and manually review every hit).
- Check `cachedSdk`'s module-level lifetime in `app/src/screens/HotWallet.tsx`: how long does a decrypted, connected session stay live after the parent last used it? Is there any inactivity timeout? (As of 2026-08-14 there wasn't — confirm whether that's still true and whether it's been flagged.)
- Confirm the mnemonic is never persisted anywhere in plaintext — check `localStorage`, `sessionStorage`, IndexedDB (the Breez SDK's own `storageDir` — inspect what it actually writes) for anything unencrypted.

### 2. Client-side attack surface (this is the highest-value area to dig into)

- This is a **client-only PWA with no backend** — any XSS anywhere in the app is a direct path to the mnemonic and PIN (both pass through JS memory in plaintext during setup/unlock/send). Review every place user-controlled or third-party text is rendered: kid nicknames, goal names, invoice/payment-request text, QR code contents, `dangerouslySetInnerHTML` (search for it — there should be none), and any place a string flows into JSX without React's default escaping being bypassed.
- Check `npm audit` in `app/` for known vulnerabilities in the full dependency tree, not just the pinned crypto-adjacent ones.
- Check whether a Content-Security-Policy is set (via meta tag or hosting headers) that would limit the blast radius of an XSS if one existed. GitHub Pages' default headers — confirm what's actually served.
- Check the service worker (`vite-plugin-pwa` config in `app/vite.config.ts`, generated `sw.js`) for anything that could let a malicious actor poison the cached app shell for returning users (cache-poisoning path, integrity of what gets precached).
- Supply chain: are `@breeztech/breez-sdk-spark`, `@scure/bip39`, `@getalby/sdk`, `light-bolt11-decoder` pinned to exact versions in `app/package.json` (they should be, per `docs/SECURITY.md`)? Check each one's npm publish history for the maintainer's track record, whether the package has had any prior compromised versions, and how many people/orgs can publish new versions (npm "maintainers" list) — a compromised maintainer account on any of these is a direct path to a malicious update.

### 3. Build and CI/CD pipeline integrity

- Read `.github/workflows/deploy.yml` in full. Check: does it run on `pull_request` from forks with write permissions or secret access (it shouldn't — `pull_request_target` combined with checking out untrusted code is a classic vector)? Is `VITE_BREEZ_API_KEY` scoped so a malicious PR couldn't exfiltrate it via a modified build step?
- Check branch protection on `master` (`gh api repos/mrg470nostr/zapsavr/branches/master/protection` or the repo Settings UI) — who can push directly, is review required, are force-pushes allowed.
- Check whether `package-lock.json` is committed and used (`npm ci`, not `npm install`, in the workflow) so a build can't silently pull a different dependency tree than what was reviewed.
- Confirm GitHub Pages serves over HTTPS with no mixed content, and that the deployed site's actual JS bundle hash matches what a fresh local `npm run build` produces from the same commit (catches a compromised CI runner or a manually-uploaded artifact that doesn't match source).

### 4. SDK and infrastructure trust

- Research `@breeztech/breez-sdk-spark` and the underlying Spark network's own security posture: has Breez or Spark Labs published any third-party audit of this SDK? What's their incident history? Is Spark's operator model (who coordinates settlement) something where a malicious or failed operator could freeze or steal funds despite the user holding their own keys — read Spark's own documentation on this rather than assuming "self-custodial" means "trustless in every dimension."
- Confirm: if Breez's infrastructure disappeared entirely, is there a documented, independent way to recover funds from the Spark network using just the BIP39 mnemonic (e.g., via a different wallet or direct on-chain path), or does recovery depend specifically on Breez's SDK/infrastructure continuing to exist? This materially changes the actual risk of "vendor disappears."

### 5. Recovery — the one test worth actually running

- On regtest (see `docs/ARCHITECTURE.md`'s "safety runs" note for the exact steps, no real money involved): generate a wallet, receive a real regtest deposit via the faucet, delete the wallet from the device, restore from the backup phrase, confirm the balance reappears. This is the single most important functional proof and should be re-run after any change to `hotwallet-sdk.ts`, `hotwallet-storage.ts`, or `HotWallet.tsx` — see `docs/RUNBOOK.md` and the "Testing (safe, real, costs nothing)" walkthrough already established for this project.

### 6. PIN and session security

- Confirm the PIN rate-limiting in `app/src/lib/storage.ts` (`recordFailedPinAttempt`, `pinLockedUntil`) can't be bypassed by clearing `localStorage` for just that one key, opening a private/incognito window, or any other reset path that a real attacker with device access could trivially perform. Rate-limiting that only slows down a browser-tab-level attacker but not someone willing to clear storage is materially weaker than the docs might imply — check what it's actually defending against.

## Reporting the result

Don't produce a binary "safe" / "not safe" verdict — produce a **risk-tiered recommendation**:

- List every finding by severity, with the concrete exploit scenario for each (not hypothetical hand-waving).
- Separate "already documented, known, accepted" limitations from genuinely new findings.
- End with an explicit amount recommendation using this framing: *"Given what's been verified and what hasn't, an amount you'd accept losing entirely without it materially affecting you is appropriate. An amount you'd need back is not, regardless of how clean this audit comes back — a clean code review is not the same claim as 'this has processed real payments reliably at this scale over time.'"* Recommend a graduated approach: start small, hold for a period, increase only after that period passes with no issues, informed by both audit findings and actual real-payment track record — not before the SDK/integration has one.
