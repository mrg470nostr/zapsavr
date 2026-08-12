# Product Requirements — ZapSavr

## Who this is for

Two people open this app, and they experience two different things.

The kid, somewhere between eight and sixteen, wants to see their savings grow toward something they chose themselves, and wants to pay for a snack or a craft at a market stall without asking a parent to hand over cash first. They don't know what a Lightning invoice is and they shouldn't have to.

The parent wants to give their kid a taste of financial independence without handing over a blank check. They want to see what their kid is saving for, set how much can flow through the connection in a week, and be able to pull the plug instantly if something looks wrong. They are, ideally, already a little familiar with Bitcoin, since this grows out of a community that teaches Sound Money principles, but the app shouldn't assume deep technical knowledge either.

## The core loop

A saving target sits at the center of the experience. The child picks something they want (a new skateboard, a ticket to a show, a gift for a sibling), sets a sats goal, and watches a simple visual fill up as money moves in, from allowance the parent sends, from odd jobs, from gifts. When the goal is reached, spending it feels like an event, not just another transaction.

Day to day, spending happens two ways. When there's a signal and the payment matters (paying a shop that has a real Lightning terminal), the app pays over Lightning through the parent-connected wallet, respecting whatever budget the parent has set. When it's kid-to-kid, or the market stall's wifi is down, or the amount is small enough that ceremony would kill the moment, an ecash token moves directly between phones, tap or QR, no relay needed, and reconciles later when someone's back online.

## Must-have for the first working version

The very first prototype, the one that gets tested with a handful of real kids in Santo Antonio do Pinhal, needs only:

A parent can generate an NWC connection string from their existing wallet (or spin up a lightweight one for this purpose) and set a spending budget and a time window on it. A child's device pairs with that connection string once, and from then on can request the parent's wallet to fund their local balance. The child can create one saving target, see a running total, and mark it "reached." The child can send and receive a Cashu ecash payment to another ZapSavr user nearby, without needing internet at the moment of the transaction. The parent can see, at any time, the kid's current balance and saving target progress (not a full spy-level transaction log, just enough to make sure things are going fine) and can revoke the connection with one tap.

Everything past this list belongs in a later phase. If a feature would be nice but doesn't help this loop happen, hold it back for `docs/ROADMAP.md`.

## What "parental control" means here, specifically

It doesn't mean approving every purchase. It means:

A budget ceiling on the NWC connection so the child's spending can never exceed what the parent explicitly allowed, enforced by the parent's own wallet, not by ZapSavr's servers, which never hold the money. A visibility window into savings progress and rough balance, without turning into full surveillance of every 500-sat snack purchase. One-tap revocation that works even if ZapSavr's own backend (if there is one at all) is down, because the permission lives in the NWC connection itself. Optional per-transaction limits (a single payment can't exceed X sats) as a second, independent guardrail on top of the weekly/monthly budget.

## What this is explicitly not

Not a custodial bank account where ZapSavr (or Niek, or anyone else) holds children's money on a server. Not a general-purpose crypto trading app; there's no swapping, no speculation, no price charts front and center. Not a replacement for teaching kids about money in person; it's a tool that makes the Sound Money, Sound Life lessons tangible, not a substitute for them.

## Saving spaces, not just one jar

Past the first prototype, a kid should be able to hold several named saving spaces at once, a skateboard fund next to a birthday-gift fund next to a "just saving" fund, each with its own visual progress. These are labels over one real balance, not separate accounts, so moving money between them is instant and free, see `docs/ARCHITECTURE.md` for why that matters technically. Product-wise, the point is letting a kid organize their own priorities the way they'd organize actual jars on a shelf, without the app quietly punishing them with fees or delay for reorganizing their own money.

## Open questions to carry into the build

Which wallet(s) should the "getting started" flow for parents recommend or integrate first (Alby Hub is the most likely default, given its NWC support)? How does a Cashu mint get chosen and trusted, run by the Amantikir community itself, or an established public one, and does that choice change per pilot family? What's the right visual metaphor for the saving target (a jar, a plant growing, a path being walked), and should that be tested with kids directly before locking it in?
