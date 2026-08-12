# Onboarding — ZapSavr

Everything this app is built on, NWC, NIP-47, npubs, Cashu mints, is genuinely complicated, and none of it should ever be visible to the two people actually using the app. A parent shouldn't need to know what a relay is to trust this with their kid's allowance, and a twelve-year-old definitely shouldn't need to. This document exists so that whoever builds the onboarding flow treats hiding that complexity as a real requirement, with the same seriousness as the security checklist, not as polish to add if time allows.

## The one rule

If a screen ever needs the word "Nostr," "NWC," "relay," "npub," "mint," or "invoice" to explain itself to a first-time user, the screen is wrong, not the user. Every technical concept in this app has a plain-language stand-in, and the two should never appear in the same sentence on a primary screen. Save the real terms for a "for the curious" corner deep in settings, for the rare parent who actually wants to know what's happening under the hood.

## Plain-language stand-ins

| What it actually is | What the user sees |
|---|---|
| NWC connection / NIP-47 pairing | "Connection" or "the link between your wallet and [kid]'s jar" |
| Scanning the NWC QR to pair | "Scan this code with [kid]'s phone to connect" |
| npub / Nostr keypair | Never surfaced as a concept. It's just "your account," created silently in the background. |
| NWC budget / spending limit | "Weekly allowance" or "How much can they spend?" |
| Revoking the NWC connection | "Disconnect" or "Pause [kid]'s wallet" |
| Lightning invoice / payment request | "Payment request" or just handled silently behind a "Pay" button |
| Cashu ecash token | "Offline payment" — the user never needs to know it's a different mechanism than an online payment |
| Cashu mint | Never surfaced. If it must be, "the place that keeps your offline payments honest," and only in an advanced/settings screen |
| Zap (once the platform exists) | "Send a tip" or "cheer someone on" |
| Saving target | "Savings jar" or "goal" — this one should feel like the main character of the app, not a feature |

Whatever ships doesn't need to use these exact words, but it needs something at this level of plainness. Test actual copy on an actual twelve-year-old before considering it final; a phrase that reads as "simple" to an adult engineer often isn't to the target user.

## Parent flow

The parent's setup has one job: get them from "I have no idea what this is" to "my kid has a connected, budgeted jar" in a few minutes, without ever making them feel like they needed to already understand Bitcoin.

**Welcome.** One sentence, no jargon: something like "A safe way to give your kid real money to save and spend, that you control." A single button forward.

**Connect your wallet.** This is the technically hardest step (creating or linking an NWC-capable wallet) and needs the most hand-holding. If the parent already has a compatible wallet, offer a deep link that hands them straight to "approve this connection" inside their existing wallet app. If they don't, offer a guided path to set one up (Alby Hub is the likely default per `ARCHITECTURE.md`), framed as "Set up your Bitcoin wallet" with a short, reassuring explanation of what it is in normal words, "this is where your money actually lives, ZapSavr just gets permission to use a little of it." Never show a raw NWC connection string, seed phrase, or key on this screen; if the wallet-creation flow surfaces one, treat it as that wallet's business and keep ZapSavr's UI clean of it.

**Set the allowance.** A simple amount-per-week (or per-month) picker, in a currency the parent understands, converted to sats behind the scenes. Optionally, a per-purchase cap as a second slider ("no single purchase over ___"), explained as "just in case," not as a scary technical safeguard.

**Connect to your kid.** The app shows a QR code and a plain instruction: "Open ZapSavr on [kid]'s phone and scan this to connect their jar." No explanation of what's encoded in it is needed here at all.

**Confirmation and what happens next.** A short, warm confirmation screen, "You're connected. You can change the allowance or disconnect anytime from Settings," so the parent leaves knowing they're not locked into anything.

## Kid flow

The kid's setup should feel closer to setting up a game profile than opening a banking app. Short, visual, forgiving of mistakes, nothing that reads as a form.

**Welcome.** Friendly, a little playful, matching whatever visual identity ZapSavr ends up with (see the jar/plant/path question left open in `PRD.md`). No mention of Bitcoin, Lightning, or Nostr is required on this screen at all, the pitch to a kid is "save toward something you want," not a technology pitch.

**Pick a name and a look.** A nickname (not a legal name) and maybe an avatar or color, stored locally, purely cosmetic, never used as an identity credential anywhere in the system.

**Connect to a parent.** "Ask a parent to open ZapSavr and show you a code, then scan it here." This is the exact same pairing moment as the parent flow's "Connect to your kid" step, described from the other side. Keep the language identical in spirit on both screens so it's obviously the same handshake.

**Set your first goal.** The emotional heart of onboarding. Let the kid pick or describe something they're saving for, a picture if possible, and a target amount translated into something concrete ("that's about 40 weeks of allowance" rather than a raw sats number, at least at first). This should feel like the reward for finishing setup, not another step to get through.

**A gentle first walkthrough.** A short, skippable tour of "add money," "spend," and "see your jar grow," ideally using a tiny real transaction (the parent sending a first small top-up during setup) rather than a fake demo, so the first thing a kid experiences is the real thing working.

## The pairing moment deserves special care

Both flows converge on one instant: parent's phone shows a code, kid's phone scans it. Design this as a single, well-tested unit, not two screens built independently by whoever happened to be working on which side. Handle the failure cases explicitly and kindly (code expired, wrong code, no camera permission, no internet), since a confusing failure here is the single most likely place a family gives up on the whole app.

## The real goal: this should feel normal, not taught

Hiding the jargon isn't about tricking anyone, it's about letting Bitcoin and Lightning become as unremarkable to these kids as a bank card is to an adult today. Nobody explains TCP/IP before letting someone send a text message, and nobody should have to understand VTXOs or relays before saving toward a skateboard. The measure of success for onboarding isn't "did the kid learn what Lightning is," it's "did the kid forget they were using anything unusual at all, three uses in." That's a design goal worth stating plainly, because it cuts against the instinct to add explainer screens: resist turning onboarding into a lesson. Let the app teach through repeated, ordinary use, watching a jar fill up, paying for a snack in a second, moving money between saving spaces for free, rather than through modals and tooltips. The Sound Money, Sound Life course is where the concepts get taught deliberately; this app's job is to make the concepts feel lived-in by the time they're taught.

This also means whichever payment rail sits underneath (Lightning via NWC today, possibly Ark/Arkade alongside or instead of Cashu later, see `docs/ARCHITECTURE.md`) should be genuinely invisible from the kid's side. A future switch from Cashu to Ark for the offline layer, for instance, shouldn't change a single onboarding screen, because the kid was never shown which one they were using in the first place.

## What "advanced" is for

Somewhere in parent settings, behind a clear "Advanced" or "For the curious" label, it's fine, even good, to expose the real terms: the NWC connection string, the npub, the mint being used. Some parents in a Bitcoin-education community will genuinely want that, and hiding it would go against the spirit of Sound Money, Sound Life. The rule is about the default path, not about pretending the technology doesn't exist for anyone who wants to look closer.

## Testing this

Onboarding is the one part of this app that should be tested with real families before anything else in `ROADMAP.md` phase 2, since a confusing first five minutes undoes all the careful architecture work described elsewhere in these docs. Watch a parent who's never touched Bitcoin get through setup unassisted, and watch a kid do the same, before calling this flow done.
