# Research notes — ZapSavr

What follows is what shaped the architecture in this repo, gathered before writing a word of the plan, so the reasoning is checkable rather than just asserted.

## Nostr Wallet Connect (NIP-47) is the right connective tissue

NWC lets any app request actions (send payment, receive payment, check balance, list transactions) from a wallet over encrypted Nostr messages, without that app ever holding the wallet's keys. Each connection is its own secret, independently revocable, and can carry its own spending budget. The official documentation states this plainly: NWC "can be combined with granular permission management and budget settings to protect users if needed." That single design property, a scoped, budgeted, revocable connection, is what makes a workable parental-control model possible without building a custodial backend. Mature client SDKs already exist (Alby's SDK being the most established), so the NWC layer doesn't need to be built from scratch.

Sources: [Introduction to NWC](https://docs.nwc.dev/introduction/introduction-to-nwc), [Benefits and Features](https://docs.nwc.dev/bitcoin-lightning-wallets/benefits-and-features), [NIP-47 spec](https://nips.nostr.com/47), [Alby NWC developer guide](https://guides.getalby.com/developer-guide/nostr-wallet-connect-api)

## Nodeless Lightning SDKs make self-custody realistic on a phone

Running a full Lightning node isn't realistic for a kid's phone or a small community's infrastructure budget. The "nodeless" pattern (Breez SDK using the Liquid sidechain, or Greenlight-style remote-node-with-local-keys) lets an app offer real self-custodial Lightning payments without operating node infrastructure. Breez SDK has also added passkey-based key derivation, removing the seed-phrase requirement for everyday use, worth watching as an option for how a parent's own wallet gets set up in the "get started" flow, even though ZapSavr itself won't hold those keys directly.

Sources: [Breez SDK / Spark integration](https://docs.spark.money/integrations/breez), [Misty Breez wallet](https://coinsnap.io/blog/misty-breez-bitcoin-lightning-wallet-introduction/), [Breez SDK passkey login](https://bitcoinmagazine.com/business/breez-sdk-launches-passkey-login-for-seedless-bitcoin-wallets)

## No existing product does exactly this

Mainstream "kid wallet with parental controls" products exist (Google Wallet's Family Link-based tap-to-pay for teens, Greenlight, various parental-control apps), but they're all custodial fiat products built on traditional banking rails. On the Bitcoin side, self-custodial Lightning wallets (Phoenix, Zeus, Muun, Breez-based wallets) are built for adults and assume Bitcoin fluency; none of them ship a child-facing mode or a parent-scoped permission layer. This is a genuine gap, not a crowded space, which is worth knowing going in: there's no existing app to copy the UX from, so the pilot with real kids in Phase 2 of the roadmap matters more than usual.

Sources: [Google Wallet kids money](https://techmymoney.com/2026/08/09/google-wallet-kids-money-us-parents-can-fund-teen-tap-to-pay/), [Lightning wallet comparison](https://www.spark.money/tools/lightning-wallet-comparison), [Kids Wallet parental control app](https://play.google.com/store/apps/details?id=io.mstat.kidswallet&hl=en_US)

## Cashu ecash covers the offline gap NWC can't

NWC still needs a live relay connection and a completed Lightning payment at the moment of use. Cashu is a Chaumian ecash protocol where tokens are bearer instruments that transfer directly between devices (QR, NFC, a shared link) with no live connection required at the moment of the handoff, reconciling with the issuing mint later. This is close to a perfect match for the "two kids trading sats on a school playground with no signal" scenario, and there's active, current development in this space (Nutshell 0.20 shipped Q1 2026, ongoing work on Keyset V2 and NutZaps for Nostr integration), meaning the tooling is young but genuinely moving, worth re-checking library maturity right before implementation starts rather than assuming this document's snapshot is still current.

Sources: [Cashu.space](https://cashu.space/), [Learn about Cashu](https://docs.cashu.space/resources/learn), [Awesome Cashu](https://github.com/cashubtc/awesome-cashu), [Nut November recap](https://nutnovember.org/)

## What this means for the architecture

Combine the two: NWC as the trust and permission bridge to a parent's real wallet, Cashu as the fast, offline spending layer funded from that connection. Neither one alone covers both "safe, budgeted, revocable" and "works without signal, feels instant." Together they do. This pairing is documented in `docs/ARCHITECTURE.md`.
