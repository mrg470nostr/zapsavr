# ZapSavr and the BITKIT Nostr platform

This document covers the part that comes after the wallet works: how ZapSavr plugs into the BITKIT Nostr social platform (phase 4 of `ROADMAP.md`), and how to do that without ever asking a child for an ID, an email, or a phone number. Read this before writing any code that touches zaps or the social layer, the identity model needs to be right from day one of the wallet, not retrofitted later.

## The key insight: the wallet already has what the platform needs

NWC runs over Nostr. That means every ZapSavr user, kid or parent, already has a Nostr keypair (an npub/nsec pair) the moment they set up the wallet, whether or not the social platform exists yet. This isn't a coincidence worth wasting: that same keypair can be the child's entire BITKIT identity later. No separate signup for the platform, no second account to create, no database of "BITKIT users" anywhere. The npub generated for the wallet on day one is the same npub that posts on the platform on day five hundred.

Practically, this means identity in this ecosystem is "whoever holds this private key," full stop. No name, birthdate, email, or phone number is ever required to participate, in the wallet or the platform. That's what non-KYC actually looks like here: not a policy statement, but an architecture where there's nothing to KYC, no central account to attach identity documents to even if someone wanted to.

## Sending zaps: mostly machinery ZapSavr already has

A zap (NIP-57) is a Lightning payment wrapped in two Nostr events: a zap request (kind 9734) the sender publishes describing what they're zapping and why, and a zap receipt (kind 9735) the recipient's Lightning service publishes once the payment lands, so the payment shows up attached to the post or profile it was for. Underneath that wrapping, it's still just a Lightning payment, resolved through an LNURL-pay callback that hands back an invoice.

ZapSavr already has the piece that matters most here: a working NWC connection that can pay an invoice. Zapping is a thin protocol layer on top of that, not a new payment rail. When the platform ships, sending a zap means: build the zap request event, fetch the invoice from the recipient's LNURL endpoint, pay it through the existing NWC connection exactly like any other Lightning spend, respecting the same parent-set budget it always has. Nothing about the trust model or the parental controls in `ARCHITECTURE.md` and `SECURITY.md` changes for this, a zap is just a labeled payment.

## Receiving zaps: the one real build decision

For someone to zap a kid, that kid's Nostr profile needs a Lightning address (the `lud16` field) pointing at an LNURL-pay endpoint that can turn incoming zap requests into invoices tied to the kid's wallet. This is the one piece ZapSavr doesn't get for free from the NWC/Cashu setup already described, and it's worth deciding deliberately rather than reaching for the first third-party Lightning-address service that shows up in a search.

Two real options:

**Self-hosted, community-run.** The Amantikir community (or whoever operates the pilot's Cashu mint) runs a small LNURL/NIP-05 server that resolves each kid's npub to an invoice, settling into that kid's Cashu balance or triggering an NWC-funded top-up. This keeps the entire chain, wallet, zaps, and identity, inside a trust boundary the community actually controls, with no outside party ever in a position to demand identity verification, log behavior, or shut the service off. This is the option that best matches the non-KYC goal and the project's general "don't depend on strangers for the important parts" posture.

**A third-party Lightning-address provider.** Faster to stand up, but it means a company somewhere is now resolving payment requests for children, potentially logging IPs and usage patterns, and is a policy change away from adding verification requirements ZapSavr has no control over. If this path is used at all, treat it as a stopgap for early testing, not the long-term answer, and say so explicitly in whatever gets built.

Default recommendation: build the small self-hosted LNURL server as part of phase 4, it's a modest piece of infrastructure (well-trodden LNURL-pay spec, no novel crypto) and it's the piece that keeps the whole non-KYC promise intact end to end rather than depending on it holding everywhere except this one seam.

## Relays: pick them like a moderation decision, not just an infra decision

Nostr relays don't require identity to post to, but they do see metadata, IP addresses, timing, who's talking to whom, unless real care is taken. For a platform aimed at children, that argues for the community running or carefully vetting its own relay(s) rather than defaulting to whatever large public relay is convenient. This is a moderation and safety choice as much as a technical one: a community-run relay can enforce content policy appropriate for minors in a way a general-purpose public relay never will. Address relay selection and moderation policy together when phase 4 planning starts, not as an afterthought once the platform is already live.

## What non-KYC means here, end to end, and where it can quietly break

The promise is: nobody in this ecosystem is ever asked for a government ID, and there's no central database linking a real-world identity to an npub. Holding that promise means paying attention to a few places it could leak in through the side door:

Identity itself never needs it, since an npub is just a self-generated keypair. Zap receipt and delivery shouldn't need it either, as long as the LNURL layer is self-hosted per the recommendation above. The one place this is genuinely outside ZapSavr's control is how a parent originally funded their own Lightning wallet, if a parent bought sats on a KYC'd exchange and opened a channel with those funds, that on-chain link exists regardless of anything this app does. That's worth a line in the parent onboarding flow (something like "for the most privacy, fund your wallet with sats you already hold or a non-KYC source") but it's guidance, not something the wallet can enforce. Document it plainly rather than pretending it's solved.

Keeping balances small, already a design principle in `SECURITY.md` for safety reasons, also happens to help here: most regulatory reporting and verification thresholds are built around larger sums, and a kid's spending wallet should never be anywhere near them by design.

## Summary for whoever picks this up

The wallet's npub is the platform's identity, no second signup. Zaps ride on the NWC payment path the wallet already has, wrapped in NIP-57 events. Receiving zaps needs one new, modest piece of infrastructure, an LNURL resolver, and it should be self-hosted by the community to keep the non-KYC promise intact. Relay choice is a safety decision for a platform with minors on it, treat it that way. And the one privacy seam outside this app's control, how parents fund their own wallets, deserves a clear word of guidance rather than silence.
