import type { LessonContent, PracticeAction } from "./academy";

export const ACADEMY_LESSON_CONTENT: Record<string, LessonContent> = {
  /* ─── TRACK 1: OPTIONS BASICS ─────────────────────────────── */

  "calls-and-puts": {
    sections: [
      {
        title: "What Is an Option?",
        body: `An option is a **contract** that gives you the *right* -- but not the obligation -- to buy or sell 100 shares of a stock at a specific price before a specific date.

Think of it like a reservation. You pay a small fee (the **premium**) to lock in a price. If the price moves in your favor, you can use that reservation. If it doesn't, you let it expire and you only lose the fee you paid.

There are two types of options:
- **Call option** -- gives you the right to *buy* 100 shares at the strike price
- **Put option** -- gives you the right to *sell* 100 shares at the strike price`,
      },
      {
        title: "The Key Terms You Need",
        body: `Every option contract has four parts:

**Strike Price** -- the price at which you can buy (call) or sell (put) the stock. If AAPL trades at $180 and you own a $175 call, your strike is $175.

**Expiration Date** -- the deadline. After this date, your option no longer exists. Weekly options expire on Fridays; monthly options expire the third Friday of the month.

**Premium** -- the price you pay for the option. If the premium is $3.00, one contract costs $3.00 x 100 = **$300** (because each contract controls 100 shares).

**Intrinsic Value** -- how much the option is worth right now if you exercised it. A $175 call when the stock is at $180 has $5 of intrinsic value.`,
        tip: "Always multiply the quoted premium by 100 to get the actual dollar cost. A '$2.50 option' costs $250 per contract, not $2.50.",
      },
      {
        title: "When Are Options Used?",
        body: `People use options for two main reasons:

**1. Directional bets** -- if you think a stock is going up, buying a call lets you profit from that move for a fraction of the cost of buying 100 shares outright.

**2. Hedging** -- if you own shares and worry about a drop, buying a put acts like insurance. It caps your downside at the strike price minus the premium you paid.

For example, owning 100 shares of SPY at $450 and buying a $440 put for $4.00 means your worst-case loss is $10/share (from $450 to $440) plus the $4 premium = **$14/share**, no matter how far SPY falls.`,
        videoUrl: "https://www.youtube.com/embed/7PM4rNDr4oI",
      },
      {
        title: "Calls vs Puts: A Quick Comparison",
        body: `| | Call | Put |
|---|---|---|
| Right to... | Buy 100 shares | Sell 100 shares |
| Buyer profits when... | Stock goes UP | Stock goes DOWN |
| Max loss for buyer | Premium paid | Premium paid |
| Common use | Bullish speculation | Downside protection |

The buyer of an option has **limited risk** (they can only lose the premium). The seller of an option has **larger or unlimited risk** depending on the strategy. We will cover selling in a later lesson.`,
        tip: "If you are just starting out, stick to buying options. Selling options creates obligations you need to understand before risking capital.",
      },
    ],
    keyTakeaways: [
      "A call gives the right to buy; a put gives the right to sell",
      "One contract always controls 100 shares -- multiply the premium by 100 for the real cost",
      "Strike, expiration, premium, and intrinsic value are the four building blocks",
      "Buying options limits your max loss to the premium paid",
    ],
    checkpoint: {
      question: "You buy one AAPL $180 call for $3.50. What is the total cost of this position?",
      options: ["$3.50", "$180.00", "$350.00", "$18,000.00"],
      correctIndex: 2,
      explanation: "Each contract controls 100 shares, so the cost is $3.50 x 100 = $350.00. The strike price ($180) is not something you pay upfront -- it is the price at which you could buy shares if you exercise.",
    },
  },

  "buy-to-open-sell-to-close": {
    sections: [
      {
        title: "The Four Order Actions",
        body: `When you place an option order, your broker asks you to pick one of four actions. This is where most beginners make their first mistake.

**Buy to Open (BTO)** -- opens a new *long* position. You are *buying* an option you don't currently own. You pay the premium.

**Sell to Close (STC)** -- closes an existing long position. You sell an option you previously bought. You receive the premium.

**Sell to Open (STO)** -- opens a new *short* position. You are *selling* an option you don't own. You receive premium but take on an obligation.

**Buy to Close (BTC)** -- closes an existing short position. You buy back an option you previously sold.`,
        tip: "Think of it this way: 'Open' creates a new position, 'Close' removes one. 'Buy' means you pay; 'Sell' means you receive.",
      },
      {
        title: "Long vs Short Positions",
        body: `When you **Buy to Open**, you are *long* the option:
- Long a call = you have the right to buy shares
- Long a put = you have the right to sell shares
- Your max loss is the premium you paid

When you **Sell to Open**, you are *short* the option:
- Short a call = you have the *obligation* to sell shares if assigned
- Short a put = you have the *obligation* to buy shares if assigned
- Your risk can be much larger than the premium you received

This is the critical difference: *buying* gives you rights, *selling* creates obligations.`,
        videoUrl: "https://www.youtube.com/embed/SD7sw0bf1ms",
      },
      {
        title: "Common Broker Ticket Mistakes",
        body: `**Mistake 1: Using 'Sell to Open' when you meant 'Sell to Close'**
If you own a call and want to take profit, you need *Sell to Close*. If you accidentally pick *Sell to Open*, you now have a naked short call -- one of the riskiest positions in options trading.

**Mistake 2: Forgetting you still hold a position**
If you Buy to Open and the option loses value, it doesn't disappear. It sits in your account until expiration. If it's in-the-money at expiration, your broker may auto-exercise it.

**Mistake 3: Not checking the order action before submitting**
Always double-check the action column on your order confirmation screen. One wrong click can flip your position from long to short.`,
        tip: "Before clicking submit on any option order, read the confirmation out loud: 'I am [buying/selling] to [open/close] [quantity] [calls/puts] at [strike] expiring [date] for [premium].'",
      },
    ],
    keyTakeaways: [
      "'Open' creates a new position; 'Close' removes an existing one",
      "Buying gives rights; selling creates obligations",
      "Sell to Open on a naked call creates unlimited risk -- never do this by accident",
      "Always verify the order action on the confirmation screen before submitting",
    ],
    checkpoint: {
      question: "You bought 2 SPY $450 calls last week. You want to take profit now. Which order action do you use?",
      options: ["Buy to Open", "Buy to Close", "Sell to Open", "Sell to Close"],
      correctIndex: 3,
      explanation: "You already own the calls (you are long). To close a long position, you Sell to Close. Sell to Open would create a new short position instead of closing your existing one.",
    },
  },

  "defined-vs-undefined-risk": {
    sections: [
      {
        title: "What Does 'Defined Risk' Mean?",
        body: `A **defined-risk** trade is one where you know the absolute maximum you can lose before you enter the trade. There are no surprises.

Examples of defined-risk trades:
- Buying a call or put (max loss = premium paid)
- A vertical spread (max loss = width of strikes minus credit received)
- A covered call (max loss = stock going to zero minus premium received)

**Undefined risk** means the theoretical maximum loss is either very large or literally unlimited.

Examples of undefined-risk trades:
- Selling a naked call (stock could go to infinity)
- Selling a naked put (stock could go to zero -- large but technically finite)
- A short straddle without protective wings`,
      },
      {
        title: "Why This Distinction Matters for Beginners",
        body: `If you are starting out, defined-risk trades should be your default. Here is why:

**Scenario A (defined risk):** You buy a $5-wide call spread for $2.00. Your max loss is $200 per contract. Even if the stock crashes 50%, you lose exactly $200.

**Scenario B (undefined risk):** You sell a naked put on a $100 stock, collecting $3.00 premium. If the stock drops to $60, you lose ($100 - $60 - $3) x 100 = **$3,700** per contract. Your $300 of income turned into a $3,700 loss.

Undefined risk does not mean you will lose that much. It means you *could* lose that much. The question is whether your account can survive the worst case.`,
        tip: "Use risk level as the FIRST filter before picking a strategy. If you cannot afford the max loss, the strategy is wrong -- no matter how good the setup looks.",
        videoUrl: "https://www.youtube.com/embed/4M4XNnauCkE",
      },
      {
        title: "A Quick Risk Map",
        body: `| Strategy | Risk Type | Max Loss |
|---|---|---|
| Buy call / put | Defined | Premium paid |
| Vertical spread (debit) | Defined | Net debit paid |
| Vertical spread (credit) | Defined | Width - credit |
| Covered call | Defined (large) | Stock to $0 minus premium |
| Naked short put | Undefined | Strike x 100 minus premium |
| Naked short call | Undefined | Unlimited |
| Iron condor | Defined | Width of wider side - credit |

Notice that even "defined risk" can be large. A covered call on a $200 stock still has $20,000 of stock risk. "Defined" means *knowable*, not necessarily *small*.`,
      },
    ],
    keyTakeaways: [
      "Defined risk means you know max loss before entering -- always check this number",
      "Undefined risk means theoretical loss is very large or unlimited",
      "Beginners should default to defined-risk trades until they fully understand margin and assignment",
      "Even defined-risk trades can have large dollar losses -- 'defined' is not the same as 'small'",
    ],
    checkpoint: {
      question: "Which of the following is an undefined-risk position?",
      options: [
        "Buying a put option",
        "A $5-wide bull call spread",
        "Selling a naked call",
        "An iron condor",
      ],
      correctIndex: 2,
      explanation: "Selling a naked call has unlimited theoretical risk because the stock can rise without limit. All the other choices have a calculable maximum loss.",
    },
  },

  /* ─── TRACK 2: INCOME AND PROTECTION ──────────────────────── */

  "covered-calls": {
    sections: [
      {
        title: "What Is a Covered Call?",
        body: `A **covered call** is when you own 100 shares of a stock and sell a call option against those shares. The call you sell is "covered" because you already own the stock to deliver if the buyer exercises.

**How it works step by step:**
1. You own 100 shares of XYZ at $50
2. You sell 1 XYZ $55 call expiring in 30 days for $1.50
3. You collect $150 in premium (1.50 x 100)

**If XYZ stays below $55 by expiration:** The call expires worthless. You keep the $150 and your 100 shares. You can sell another call next month.

**If XYZ rises above $55:** Your shares get called away (sold) at $55. You keep the $150 premium plus the $5/share gain from $50 to $55. Total profit: $650. But you miss any upside above $55.`,
        videoUrl: "https://www.youtube.com/embed/jnTsQBJHMSk",
      },
      {
        title: "The Tradeoff: Premium vs Capped Upside",
        body: `The covered call trade is essentially: *I accept capped upside in exchange for income now.*

Let's say you own 100 shares of AAPL at $175. You sell a $185 call for $3.00.

- **Best case:** AAPL goes to $185 at expiration. You profit $10/share on stock + $3/share in premium = **$1,300**. But if AAPL goes to $200, you still only get $1,300 because your shares are called away at $185.
- **Worst case:** AAPL drops to $150. You lose $25/share on stock but keep the $3 premium. Net loss: **$2,200**. The premium softened the blow, but you still own the stock risk.

This is why covered calls work best when you are **neutral to slightly bullish**. If you are very bullish, the capped upside costs you. If you are bearish, the premium is not enough protection.`,
        tip: "Don't sell covered calls just because you can. Ask: 'Am I OK having my shares called away at this strike?' If the answer is no, pick a higher strike or skip the trade.",
      },
      {
        title: "Choosing a Strike and Expiration",
        body: `**Strike selection:**
- Closer to current price = more premium but higher chance of assignment
- Further from current price = less premium but more room for the stock to run

A common approach: sell the call at a strike where you would be *happy* to sell the shares anyway.

**Expiration selection:**
- 30-45 days out is a popular window because time decay (theta) accelerates in the last month
- Weeklies give faster premium but require more management
- Monthlies are lower maintenance

**Premium target:**
Many covered-call sellers aim for 1-3% of the stock price per month. On a $100 stock, that is $1.00-$3.00 per contract.`,
      },
    ],
    keyTakeaways: [
      "A covered call requires owning 100 shares -- you sell a call against shares you hold",
      "You collect premium now but cap your upside at the strike price",
      "Best for neutral-to-slightly-bullish outlook -- not for strongly bullish views",
      "If assigned, you sell shares at the strike price and keep the premium",
    ],
    checkpoint: {
      question: "You own 100 shares of XYZ at $80 and sell a $85 call for $2.00. XYZ is at $90 at expiration. What is your total profit?",
      options: ["$200", "$500", "$700", "$1,000"],
      correctIndex: 2,
      explanation: "Your shares are called away at $85, so stock profit = ($85 - $80) x 100 = $500. Plus the $200 premium. Total = $700. You miss the move from $85 to $90 ($500) because the call caps your upside.",
    },
  },

  "cash-secured-puts": {
    sections: [
      {
        title: "What Is a Cash-Secured Put?",
        body: `A **cash-secured put** is when you sell a put option and set aside enough cash in your account to buy 100 shares at the strike price if assigned.

**How it works:**
1. You want to buy XYZ, which trades at $52, but you'd prefer to enter at $48
2. You sell 1 XYZ $48 put expiring in 30 days for $1.20
3. You set aside $4,800 in cash (the buying power to purchase 100 shares at $48)
4. You collect $120 in premium

**If XYZ stays above $48:** The put expires worthless. You keep $120 and can sell another put.

**If XYZ drops below $48:** You are assigned 100 shares at $48. But you collected $1.20, so your effective entry price is **$46.80**. You got the stock at a discount to where it was when you sold the put.`,
        tip: "Only sell puts on stocks you genuinely want to own. If you wouldn't buy 100 shares at that strike, don't sell the put. Treat it as an entry strategy, not free income.",
      },
      {
        title: "Calculating Your Effective Entry and Risk",
        body: `The effective entry price for a cash-secured put is:

**Effective entry = Strike price - Premium received**

Example: Sell a $100 put for $3.50. If assigned, your effective entry = $100 - $3.50 = **$96.50**.

Your maximum loss is the strike price minus premium (if the stock goes to zero):
**Max loss = ($100 - $3.50) x 100 = $9,650**

That sounds scary, but it is the same risk as buying the stock at $96.50. The difference is you got paid $350 to wait, and if the stock never drops to $100, you keep that premium risk-free.

**Buying power requirement:** Your broker holds $10,000 in cash (strike x 100) minus the $350 premium = **$9,650** in buying power.`,
        videoUrl: "https://www.youtube.com/embed/JjcORfMHJmk",
      },
      {
        title: "When NOT to Sell Puts",
        body: `Cash-secured puts are not always a good idea. Avoid selling puts when:

**1. Earnings are imminent** -- A stock can gap 10-20% on earnings. If you sold a put at $100 and the stock drops to $80 overnight, you are assigned at a terrible price.

**2. The setup is weak** -- If SIBT shows a bearish composite score or the market regime is risk-off, selling a put is fighting the tape.

**3. You can't afford assignment** -- If buying 100 shares at the strike would use more than 5-10% of your account, the position is too large.

**4. Implied volatility is low** -- Low IV means low premiums. You are not getting paid enough to take on the assignment risk.`,
        tip: "Always check the SIBT composite score and earnings calendar before selling a put. If earnings are within the expiration window, skip the trade or use a wider buffer.",
      },
    ],
    keyTakeaways: [
      "A cash-secured put means you have enough cash to buy 100 shares at the strike if assigned",
      "Effective entry price = strike - premium, which is always below the current stock price",
      "Only sell puts on stocks you want to own at the strike price",
      "Avoid selling puts into earnings, weak setups, or when you can't afford 100 shares",
    ],
    checkpoint: {
      question: "You sell a $60 put for $2.00 on a stock trading at $63. You get assigned. What is your effective entry price per share?",
      options: ["$60.00", "$63.00", "$58.00", "$62.00"],
      correctIndex: 2,
      explanation: "Effective entry = strike ($60) minus premium ($2.00) = $58.00 per share. You bought the stock $5 below where it was trading when you sold the put.",
    },
  },

  "protective-puts-and-collars": {
    sections: [
      {
        title: "What Is a Protective Put?",
        body: `A **protective put** is buying a put option on a stock you already own. It acts as insurance: if the stock drops below the put's strike price, your losses are capped.

**Example:**
- You own 100 shares of SPY at $450
- You buy a $440 put for $5.00
- Cost: $500

**If SPY drops to $400:**
Without the put, you lose $50/share = $5,000.
With the put, your shares lose $50/share but the put gains ($440 - $400) = $40/share. Net loss = $10/share (stock drop to strike) + $5/share (premium) = **$1,500**.

The put saved you $3,500 in this scenario. The tradeoff is the $500 premium -- you pay that whether or not you need the insurance.`,
        videoUrl: "https://www.youtube.com/embed/6tRHz2TnxEk",
      },
      {
        title: "What Is a Collar?",
        body: `A **collar** combines a protective put with a covered call on the same stock:
1. Own 100 shares
2. Buy a put below current price (protection)
3. Sell a call above current price (to offset the put cost)

**Example:**
- Own 100 shares of XYZ at $100
- Buy a $95 put for $3.00 (costs $300)
- Sell a $110 call for $2.00 (receive $200)
- Net cost: $100

You now have:
- **Downside protection** below $95
- **Capped upside** above $110
- **Net cost** of only $1/share instead of $3/share

Collars are popular before events (earnings, elections) when you want protection but don't want to pay full price for a put.`,
        tip: "A zero-cost collar (where the call premium exactly offsets the put premium) is possible but requires giving up more upside. Decide how much upside you're willing to cap before selecting strikes.",
      },
      {
        title: "Choosing Between a Put and a Collar",
        body: `**Use a protective put when:**
- You are very bullish long-term but worried about a short-term event
- You don't want any cap on your upside
- You can afford the premium as a cost of doing business

**Use a collar when:**
- You want protection but the put premium feels too expensive
- You have a target price where you'd be happy to sell anyway
- You want to reduce or eliminate the cash outlay for protection

**Important:** Neither strategy eliminates risk entirely. The protective put still has gap risk if the stock opens below your strike (though the put covers that). And the collar gives up upside, which is a real cost if the stock rallies hard.`,
      },
    ],
    keyTakeaways: [
      "A protective put is insurance -- it caps your downside but costs premium",
      "A collar offsets the put cost by selling a call, but caps your upside",
      "Use puts before risky events; use collars when the put premium is too expensive",
      "Both strategies still have some risk -- they reduce it, not eliminate it",
    ],
    checkpoint: {
      question: "You own 100 shares at $100, buy a $95 put for $4.00, and sell a $108 call for $2.00. What is your max loss per share (excluding the collar cost)?",
      options: ["$2.00", "$5.00", "$7.00", "$100.00"],
      correctIndex: 2,
      explanation: "Max loss on shares = $100 to $95 = $5/share. Net collar cost = $4 - $2 = $2/share. Total max loss = $5 + $2 = $7/share. Below $95, the put kicks in and prevents further loss.",
    },
  },

  /* ─── TRACK 3: SPREADS AND ORDER ENTRY ────────────────────── */

  "vertical-spreads": {
    sections: [
      {
        title: "What Is a Vertical Spread?",
        body: `A **vertical spread** uses two options of the same type (both calls or both puts), same expiration, but different strike prices. "Vertical" refers to the strike prices being at different levels on the option chain.

There are two main kinds:

**Bull Call Spread (debit spread):**
- Buy a lower-strike call, sell a higher-strike call
- You pay a net debit (cost)
- Profits when the stock goes UP

**Bear Put Spread (debit spread):**
- Buy a higher-strike put, sell a lower-strike put
- You pay a net debit
- Profits when the stock goes DOWN

Both spreads have **defined risk**: your max loss is the debit paid, and your max profit is the width of the strikes minus the debit.`,
        videoUrl: "https://www.youtube.com/embed/TDwXBMmmd3o",
      },
      {
        title: "Bull Call Spread Example",
        body: `**Setup:** AAPL trades at $180. You think it will reach $190 in 30 days.

- Buy 1 AAPL $180 call for $5.00
- Sell 1 AAPL $190 call for $2.00
- Net debit = $3.00 ($300 per contract)

**Outcomes:**
- **Max profit:** ($190 - $180) - $3 = $7/share = **$700** (if AAPL is at or above $190)
- **Max loss:** $3/share = **$300** (if AAPL is at or below $180)
- **Breakeven:** $180 + $3 = **$183**

Compare this to buying the $180 call outright for $500. The spread costs $300 instead of $500, but caps your profit at $700 instead of unlimited. You are trading unlimited upside for a lower cost basis.`,
        tip: "Calculate max profit, max loss, and breakeven BEFORE entering any spread. If the reward-to-risk ratio is less than 1:1, the trade may not be worth the effort.",
      },
      {
        title: "Bear Put Spread Example",
        body: `**Setup:** XYZ trades at $75. You think it will drop to $65.

- Buy 1 XYZ $75 put for $4.50
- Sell 1 XYZ $65 put for $1.50
- Net debit = $3.00 ($300 per contract)

**Outcomes:**
- **Max profit:** ($75 - $65) - $3 = $7/share = **$700** (if XYZ at or below $65)
- **Max loss:** $3/share = **$300** (if XYZ at or above $75)
- **Breakeven:** $75 - $3 = **$72**

The math is symmetrical to the bull call spread. Width minus debit = max profit. Debit = max loss.`,
      },
      {
        title: "Choosing Width and Expiration",
        body: `**Width (distance between strikes):**
- Narrower spread ($2-$5 wide) = lower cost, lower max profit, higher probability the short strike is touched
- Wider spread ($10-$20 wide) = higher cost, higher max profit, lower probability of full profit

**Expiration:**
- 30-45 days is common; gives enough time for the move without excessive time decay
- Closer expirations are cheaper but need the move to happen fast

**Rule of thumb:** Pay no more than 50% of the width. A $10-wide spread should cost no more than $5.00. If it costs $7.00, the risk-reward is poor (risking $700 to make $300).`,
      },
    ],
    keyTakeaways: [
      "Vertical spreads use two options at different strikes to create defined-risk directional trades",
      "Max loss = debit paid; max profit = width minus debit",
      "Bull call spreads profit when stock rises; bear put spreads profit when stock falls",
      "Never pay more than 50% of the spread width -- the risk-reward flips against you",
    ],
    checkpoint: {
      question: "You buy a $100/$110 bull call spread for $4.00. What is your max profit per contract?",
      options: ["$400", "$600", "$1,000", "$1,400"],
      correctIndex: 1,
      explanation: "Max profit = width ($110 - $100 = $10) minus debit ($4) = $6/share = $600 per contract. The spread width caps your profit regardless of how high the stock goes.",
    },
  },

  "credit-spreads": {
    sections: [
      {
        title: "What Is a Credit Spread?",
        body: `A **credit spread** is a vertical spread where you receive a net credit (income) when you open the trade. Instead of paying to enter, you get paid.

**Bull Put Spread (credit spread):**
- Sell a higher-strike put, buy a lower-strike put
- You receive a net credit
- Profits when the stock stays ABOVE the short put strike

**Bear Call Spread (credit spread):**
- Sell a lower-strike call, buy a higher-strike call
- You receive a net credit
- Profits when the stock stays BELOW the short call strike

The key insight: a credit spread makes money when the stock does NOT move against you. You are selling probability, not buying direction.`,
        videoUrl: "https://www.youtube.com/embed/XsCBDGMXRB8",
      },
      {
        title: "Understanding Your Real Risk",
        body: `The premium you receive is NOT your profit until the trade expires or you close it. Your real risk is:

**Max loss = Width of strikes - Credit received**

Example: You sell a $100/$95 bull put spread for $1.50 credit.
- Width = $5.00
- Credit = $1.50
- **Max loss = $5.00 - $1.50 = $3.50/share = $350 per contract**
- **Max profit = $1.50/share = $150 per contract**

The risk-to-reward here is $350 risk for $150 reward. That sounds bad, but the trade has a higher probability of profit (you win if the stock stays above $100). The tradeoff is *probability vs magnitude*.`,
        tip: "Don't think of credit spreads as 'free money.' The credit is payment for taking on risk. If you wouldn't buy the stock at the short strike, don't sell the put spread there.",
      },
      {
        title: "When Credit Spreads Work Best",
        body: `Credit spreads fit these situations:

**Neutral-to-mildly-directional:** You think AAPL will stay above $170 (sell a bull put spread below $170) or below $200 (sell a bear call spread above $200).

**High implied volatility:** When IV is elevated, premiums are richer. You collect more credit for the same width, improving your risk-reward.

**After a big move:** If a stock just dropped 10% and you think the selling is overdone, a bull put spread below the current price lets you profit from stabilization without predicting a bounce.

**Avoid when:**
- IV is very low (premiums too thin)
- Earnings are inside the expiration window
- SIBT composite score is strongly against your direction`,
      },
    ],
    keyTakeaways: [
      "Credit spreads pay you upfront but have larger potential loss than potential gain",
      "Max loss = width minus credit -- always calculate this before entering",
      "They work best in neutral/mildly directional setups with elevated IV",
      "Win rate alone is misleading -- one large loss can erase many small wins",
    ],
    checkpoint: {
      question: "You sell a $50/$45 bull put spread for $1.80 credit. What is your maximum loss per contract?",
      options: ["$180", "$320", "$500", "$680"],
      correctIndex: 1,
      explanation: "Max loss = width ($50 - $45 = $5) minus credit ($1.80) = $3.20/share = $320 per contract. You risk $320 to make $180.",
    },
  },

  "placing-multi-leg-orders": {
    sections: [
      {
        title: "Why Multi-Leg Orders Matter",
        body: `When you trade a spread (or any multi-leg strategy), you need both legs to execute together. If you enter them separately ("legging in"), you risk:

- **Adverse fill:** One leg fills but the other moves against you before it fills
- **Naked exposure:** Briefly having an uncovered short option
- **Wider cost:** You often pay more total when filling legs separately

Most brokers support **multi-leg order entry** where you submit the entire spread as a single ticket. The broker handles both legs simultaneously.`,
      },
      {
        title: "Net Debit vs Net Credit Pricing",
        body: `When you enter a spread order, the broker asks for a **net price**, not individual leg prices.

**Debit spreads:** You specify the maximum net debit you are willing to pay.
- Example: "Buy to Open 1 AAPL $180/$190 call spread at $3.00 net debit"
- This means: buy the $180 call and sell the $190 call, and the most you will pay for the pair is $3.00

**Credit spreads:** You specify the minimum net credit you want to receive.
- Example: "Sell to Open 1 AAPL $170/$165 put spread at $1.50 net credit"
- This means: sell the $170 put and buy the $165 put, and you want at least $1.50 for the pair

Always use **limit orders** for spreads. Market orders on multi-leg trades can fill at terrible prices.`,
        tip: "Start your limit price at the mid-point between the bid and ask of the spread. If it doesn't fill after a few minutes, move it 5-10 cents toward the natural side (pay slightly more for debits, accept slightly less for credits).",
        videoUrl: "https://www.youtube.com/embed/YxQQMqP97x4",
      },
      {
        title: "Common Broker Mistakes With Spreads",
        body: `**1. Entering legs separately instead of as a spread**
This is the most expensive mistake. Always use the multi-leg / strategy order ticket.

**2. Using market orders on spreads**
Market orders on individual options are bad enough. On spreads, the slippage compounds across both legs.

**3. Forgetting to select the right strategy template**
Most brokers have templates: "Vertical," "Iron Condor," "Straddle," etc. Selecting the template auto-fills the structure correctly.

**4. Not checking the confirmation screen**
The confirmation should show:
- Each leg (action, quantity, strike, expiration)
- Net price (debit or credit)
- Max profit and max loss
- Buying power required

If any of these look wrong, cancel and rebuild the order.`,
      },
      {
        title: "Using SIBT Before Execution",
        body: `Before placing any multi-leg order, run through this SIBT checklist:

1. **Check market regime** -- is the broad market supporting your direction?
2. **Check composite score** -- does the ticker's combined signal agree with your trade?
3. **Check earnings calendar** -- is there an event inside your expiration window?
4. **Check the order review screen** -- does the risk/reward match what you calculated?

If any of these flash a warning, pause. A good spread on a bad setup is still a losing trade.`,
      },
    ],
    keyTakeaways: [
      "Always enter spreads as a single multi-leg order, never one leg at a time",
      "Use limit orders at the mid-price and adjust 5-10 cents if needed",
      "Verify every field on the confirmation screen before submitting",
      "Run the SIBT checklist (regime, composite, earnings, order review) before every trade",
    ],
    checkpoint: {
      question: "You want to enter a bull call spread. What order type should you use?",
      options: [
        "Market order for each leg separately",
        "Limit order for each leg separately",
        "Single multi-leg limit order for the spread",
        "Market order for the spread",
      ],
      correctIndex: 2,
      explanation: "Always use a single multi-leg limit order. This ensures both legs fill together at your specified net price. Entering legs separately or using market orders risks adverse fills and unnecessary costs.",
    },
  },

  /* ─── TRACK 4: SIBT WORKFLOWS ─────────────────────────────── */

  "daily-trade-workflow": {
    sections: [
      {
        title: "Start With the Tape, Not a Ticker",
        body: `The biggest mistake new traders make is opening a chart for their favorite stock and trying to force a trade. Instead, start with the **market regime**.

SIBT's market regime tells you the broad environment:
- **Risk-on** -- the market is trending up with healthy internals. Bullish setups have a tailwind.
- **Risk-off** -- the market is trending down or defensive. Bearish or hedging setups are more appropriate.
- **Neutral/choppy** -- no clear direction. Tighter position sizing and shorter duration trades make sense.

If the regime is risk-off and you are trying to buy calls on a tech stock, you are swimming upstream. Check the regime first, then look for tickers that *agree* with that environment.`,
        tip: "Treat the market regime like a traffic light. Green (risk-on) means go. Yellow (neutral) means proceed with caution. Red (risk-off) means wait or play defense.",
      },
      {
        title: "Narrow From Regime to Names",
        body: `After confirming the regime, use the SIBT screener to find tickers where multiple signals agree:

1. **Open the Composite Screener** -- sort by composite score
2. **Filter by confidence** -- ignore scores with low confidence (too many missing inputs)
3. **Look for alignment** -- a high composite score in a risk-on regime is a strong signal. A high score in a risk-off regime deserves skepticism.

Your goal is a **short list of 3-5 names** where the market direction and the ticker score point the same way. Quality over quantity.`,
        videoUrl: "https://www.youtube.com/embed/wY3FiNnMEME",
      },
      {
        title: "From Screening to Execution",
        body: `Once you have your short list:

1. **Check each ticker's detail page** -- look at the verdict, social sentiment, and any earnings flags
2. **Decide on a strategy** -- based on your outlook and risk tolerance (covered call, spread, directional buy, etc.)
3. **Use the simulator** if you want to test the payoff before committing real capital
4. **Open the order review** -- this is your final checkpoint before placing the trade
5. **Size appropriately** -- no single trade should risk more than 2-5% of your account

The process should take 10-15 minutes. If you are spending hours, you are probably overthinking it. If you are spending 30 seconds, you are probably underthinking it.`,
      },
    ],
    keyTakeaways: [
      "Always check market regime before looking at individual tickers",
      "Use the composite screener to find names where multiple signals align",
      "Keep your daily watch list to 3-5 names -- quality over quantity",
      "A repeatable process beats gut feelings every time",
    ],
    checkpoint: {
      question: "What should be the FIRST step in your daily SIBT workflow?",
      options: [
        "Find a stock you like and check its chart",
        "Check the market regime to understand the broad environment",
        "Open the options chain and look for cheap premiums",
        "Read social media for trending tickers",
      ],
      correctIndex: 1,
      explanation: "Starting with the market regime gives you context for everything that follows. A bullish stock in a risk-off market is fighting the current. The regime is your first filter.",
    },
  },

  "using-the-composite-screener": {
    sections: [
      {
        title: "What the Composite Screener Shows",
        body: `The SIBT Composite Screener combines multiple signals into a single ranked list. Each ticker gets:

- **Composite Score** -- a weighted blend of technical, sentiment, fundamental, and flow signals
- **Market Base Score** -- how much of the score comes from broad market conditions vs the individual ticker
- **Confidence** -- how many inputs are available. A score based on 8/10 inputs is more reliable than one based on 3/10.
- **Verdict** -- a plain-English summary: BULLISH, BEARISH, NEUTRAL, or CAUTION

The screener is a *triage tool*. It tells you where to focus attention, not what to buy.`,
        videoUrl: "https://www.youtube.com/embed/gvZCslCozT4",
      },
      {
        title: "How to Read the Rankings",
        body: `**Sorting by score:**
The default view ranks tickers by composite score, highest first. A score of 85+ usually means strong multi-signal agreement. Below 40 usually means bearish or conflicting signals.

**Checking confidence:**
A ticker with a score of 90 but confidence of 30% is less trustworthy than a score of 75 with confidence of 90%. Missing inputs (no social data, no flow data) reduce confidence.

**Market base vs ticker-specific:**
If the market base is 60% of the score, most of the bullishness comes from the broad market, not the individual stock. This matters because when the market turns, these names will turn with it.

**The verdict:**
- BULLISH -- multiple signals agree on upside
- BEARISH -- multiple signals agree on downside
- NEUTRAL -- signals are mixed or flat
- CAUTION -- contradictory signals or elevated risk (earnings, high IV)`,
        tip: "Never trade a CAUTION verdict without doing extra homework. CAUTION means the system sees conflicting signals -- and conflicting signals often mean the trade is a coin flip.",
      },
      {
        title: "Turning Screener Output Into a Watch List",
        body: `Here is a practical workflow:

1. Sort by composite score, descending
2. Remove any tickers with confidence below 50%
3. Remove any tickers where market base is more than 70% of the score (they are riding the tide, not outperforming)
4. Check if any remaining tickers have earnings in the next 5 days -- flag them as CAUTION regardless of score
5. Your watch list is the top 3-5 names that survive this filter

From here, click into each name to see the full signal breakdown before deciding on a trade.`,
      },
    ],
    keyTakeaways: [
      "The composite score blends multiple signals -- use it for triage, not blind execution",
      "Confidence matters as much as the score itself -- low confidence means missing data",
      "High market-base percentage means the stock is riding the market, not leading it",
      "Always filter for earnings risk before adding a ticker to your watch list",
    ],
    checkpoint: {
      question: "A ticker has a composite score of 88 but confidence of 25%. What should you do?",
      options: [
        "Buy immediately -- 88 is a strong score",
        "Treat it with skepticism -- low confidence means too many missing inputs",
        "Short it -- low confidence means bearish",
        "Ignore the confidence and focus on the verdict",
      ],
      correctIndex: 1,
      explanation: "A high score with low confidence means the system is missing most of its inputs. The 88 might be based on just 2-3 signals instead of 8-10. Treat it as unreliable until more data is available.",
    },
  },

  "before-you-place-the-order": {
    sections: [
      {
        title: "The Pre-Order Checklist",
        body: `Before placing any trade through your broker, run through this checklist:

**1. Market Regime** -- Does the broad market support the direction of this trade?

**2. Composite Verdict** -- Does the SIBT composite score agree with your thesis?

**3. Earnings Check** -- Is there an earnings announcement before your expiration? If yes, adjust your strategy or skip the trade.

**4. Social Sentiment** -- Is social sentiment confirming or contradicting the technical setup? Extreme sentiment in either direction can be a contrarian signal.

**5. Order Review** -- Does the risk/reward on the order screen match your expectations? Double-check max loss, max profit, and breakeven.

If any of these items raises a flag, pause. It is always better to miss a trade than to take a bad one.`,
        tip: "Print this checklist or keep it on a sticky note next to your screen. After a few weeks it becomes automatic, but early on you need the physical reminder.",
      },
      {
        title: "Understanding Event Risk",
        body: `**Earnings** are the most common event risk for option traders. A stock can gap 5-20% overnight on earnings, making your carefully chosen strikes meaningless.

Rules for trading around earnings:
- If your option expires AFTER earnings, you are exposed to the event. Adjust accordingly.
- If you want to trade the earnings move, use defined-risk strategies (spreads, not naked options).
- If you don't want earnings risk, close or roll your position before the announcement date.

**Other events to watch:**
- FOMC meetings (rate decisions move the whole market)
- CPI / jobs reports (macro data can shift regime overnight)
- FDA decisions (biotech-specific but massive moves)
- Ex-dividend dates (can trigger early assignment on short calls)`,
        videoUrl: "https://www.youtube.com/embed/0tJFnDMPn7g",
      },
      {
        title: "When CAUTION Is the Right Answer",
        body: `New traders feel pressure to always be in a trade. But the best traders spend most of their time doing nothing.

**CAUTION is the right call when:**
- The composite score is between 40-60 (no clear direction)
- Earnings are imminent and you don't have a specific earnings strategy
- The market regime just shifted and signals are adjusting
- Your gut says "I need to make money today" (emotional trading)

Sitting in cash is a position. It has zero risk and costs nothing. The market will still be there tomorrow.`,
      },
    ],
    keyTakeaways: [
      "Run the 5-point checklist (regime, composite, earnings, sentiment, order review) before every trade",
      "Earnings are the biggest single event risk for option trades -- always check the calendar",
      "If any checklist item raises a flag, the default answer is WAIT",
      "Sitting in cash is a valid position -- there is no penalty for not trading",
    ],
    checkpoint: {
      question: "Your composite score is bullish, but earnings are in 3 days and your option expires in 5 days. What should you do?",
      options: [
        "Enter the trade -- the composite score is bullish",
        "Enter a larger position since the score is strong",
        "Either skip the trade or switch to a defined-risk earnings strategy",
        "Ignore earnings -- they rarely affect option prices",
      ],
      correctIndex: 2,
      explanation: "Earnings within your expiration window is a major risk flag. Even a bullish composite score does not predict the magnitude of an earnings gap. Either skip the trade, roll to a post-earnings expiration, or use a defined-risk earnings strategy like an iron condor.",
    },
  },

  /* ─── TRACK 5: MACRO PRODUCTS ─────────────────────────────── */

  "forex-basics": {
    sections: [
      {
        title: "What Are Currency Pairs?",
        body: `Forex (foreign exchange) trading involves buying one currency while simultaneously selling another. Currencies always trade in **pairs**.

**EUR/USD = 1.0850** means:
- 1 euro costs 1.0850 US dollars
- EUR is the **base currency** (what you're buying)
- USD is the **quote currency** (what you're paying with)

If you "buy EUR/USD," you are buying euros and selling dollars. If the rate goes from 1.0850 to 1.0950, the euro strengthened (you made money if you bought).

**Major pairs** (most liquid, tightest spreads):
- EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD

**Cross pairs** (no USD):
- EUR/GBP, EUR/JPY, GBP/JPY`,
      },
      {
        title: "Pips and Position Sizing",
        body: `A **pip** is the smallest standard price increment in forex. For most pairs, it is the 4th decimal place.

EUR/USD moves from 1.0850 to 1.0860 = **10 pips**

**How much is a pip worth?**
For a standard lot (100,000 units), 1 pip on EUR/USD = ~$10.
For a mini lot (10,000 units), 1 pip = ~$1.
For a micro lot (1,000 units), 1 pip = ~$0.10.

This means a 50-pip move on a standard lot = $500. That can happen in minutes during volatile sessions.`,
        tip: "Start with micro lots when learning forex. A 50-pip loss on a micro lot is $5 -- enough to learn from without damaging your account.",
        videoUrl: "https://www.youtube.com/embed/EIB4oL2U0RU",
      },
      {
        title: "Why Leverage Changes Everything",
        body: `Forex brokers offer **leverage** ratios like 50:1 or 100:1. This means you can control $100,000 of currency with $1,000-$2,000 of margin.

**Why this is dangerous:**
- At 50:1 leverage, a 2% move against you = 100% of your margin
- A 1% adverse move on a standard lot = $1,000 loss
- Currency pairs routinely move 1-2% in a single session

**Example:**
You deposit $2,000 and open a standard lot (100,000 units) of EUR/USD at 50:1 leverage. The pair drops 100 pips (about 0.9%). Your loss: $1,000. Half your account is gone on a perfectly normal daily move.

**The takeaway:** Leverage amplifies both gains AND losses. Using 50:1 leverage does not mean you should use all of it. Most experienced forex traders use effective leverage of 5:1 to 10:1.`,
      },
      {
        title: "Forex Is Not Casual Stock Trading",
        body: `Key differences between forex and stocks:

- **24-hour market** -- forex trades Sunday evening through Friday evening. There is no closing bell to protect you from overnight moves.
- **No central exchange** -- forex is over-the-counter (OTC). Your broker is often your counterparty.
- **Leverage defaults are extreme** -- stock accounts give 2:1 margin. Forex accounts offer 50:1 to 500:1. This is not a feature; it is a risk multiplier.
- **Macro-driven** -- currency moves are driven by central bank policy, economic data, and geopolitics. Technical analysis alone is often insufficient.

If you are coming from stocks or options, respect the differences. Forex requires its own risk framework.`,
      },
    ],
    keyTakeaways: [
      "Currencies trade in pairs -- buying EUR/USD means buying euros and selling dollars",
      "A pip is the 4th decimal place; on a standard lot, 1 pip equals roughly $10",
      "Leverage amplifies everything -- use 5-10x effective leverage, not the maximum offered",
      "Forex is a 24-hour, macro-driven market -- it is not a substitute for stock trading",
    ],
    checkpoint: {
      question: "You have $5,000 in a forex account with 50:1 leverage. You open a standard lot (100,000 units) of EUR/USD. The pair drops 50 pips. What is your loss?",
      options: ["$5", "$50", "$500", "$5,000"],
      correctIndex: 2,
      explanation: "On a standard lot, 1 pip is approximately $10. A 50-pip drop = 50 x $10 = $500. That is 10% of your $5,000 account on a move that happens routinely. This is why leverage control matters.",
    },
  },

  "futures-basics": {
    sections: [
      {
        title: "What Is a Futures Contract?",
        body: `A **futures contract** is an agreement to buy or sell a specific asset at a specific price on a specific future date. Unlike options, both the buyer and seller are *obligated* to fulfill the contract (unless they close it before expiration).

**Common futures markets:**
- **Equity index:** E-mini S&P 500 (/ES), E-mini Nasdaq (/NQ), E-mini Russell (/RTY)
- **Commodities:** Crude Oil (/CL), Gold (/GC), Natural Gas (/NG)
- **Fixed income:** 10-Year Treasury (/ZN), 30-Year Bond (/ZB)
- **Currencies:** Euro FX (/6E), Japanese Yen (/6J)

Each contract has a **multiplier** that determines how much each point of movement is worth in dollars.`,
        videoUrl: "https://www.youtube.com/embed/nwR5b6E0Xo4",
      },
      {
        title: "Contract Multipliers and Notional Exposure",
        body: `The multiplier is what makes futures powerful -- and dangerous.

**E-mini S&P 500 (/ES):**
- Multiplier: $50 per point
- If /ES is at 5,000, one contract controls $250,000 in notional value
- A 10-point move = $500 gain or loss

**Micro E-mini S&P 500 (/MES):**
- Multiplier: $5 per point (1/10th the size of /ES)
- Same 10-point move = $50 gain or loss
- Much more appropriate for smaller accounts

**Crude Oil (/CL):**
- Multiplier: $1,000 per point
- If oil is at $75, one contract controls $75,000
- A $1 move = $1,000 gain or loss

The key question is always: *how much notional exposure am I taking relative to my account size?*`,
        tip: "Use micro contracts (/MES, /MNQ, /MCL) when learning. They give you real futures experience at 1/10th the risk. One /MES contract at 5,000 controls $25,000 -- much more manageable than $250,000.",
      },
      {
        title: "Margin Is Not Max Loss",
        body: `To open a futures position, you post **initial margin** -- a deposit (usually 3-12% of notional value). This is NOT the most you can lose.

**Example with /ES at 5,000:**
- Notional value: $250,000
- Initial margin: ~$13,000 (varies by broker)
- Maintenance margin: ~$12,000

If /ES drops 50 points (a normal bad day), you lose $2,500. If it drops 200 points (a sharp sell-off), you lose $10,000. If it drops 300 points, you lose $15,000 -- **more than your initial margin**.

When losses exceed maintenance margin, you get a **margin call**: deposit more money immediately or your broker closes your position at the market price (which may be much worse than where you wanted to exit).`,
      },
      {
        title: "Overnight and Gap Risk",
        body: `Futures trade nearly 24 hours (typically Sunday 6pm ET to Friday 5pm ET with brief daily breaks). This creates unique risks:

**Overnight risk:** If you hold a position through the close, it can gap open at a very different price the next session. Circuit breakers (limit up/limit down) can temporarily halt trading, but they do not guarantee you a fill at your stop-loss price.

**Globex vs RTH:** The overnight session (Globex) typically has lower volume and wider spreads. Moves that happen at 3am ET can be just as real as those at 10am ET.

**Weekend risk:** Holding through the weekend means exposure to geopolitical events, emergency central bank actions, or commodity supply shocks.

**The rule:** If you are new to futures, close positions before the end of the regular session. Overnight holds should be a deliberate choice, not a forgotten position.`,
      },
    ],
    keyTakeaways: [
      "Futures contracts are obligations, not options -- both sides must perform",
      "The multiplier determines dollar exposure: /ES moves $50 per point, /MES moves $5",
      "Margin is a deposit, not your max loss -- you can lose more than the initial margin",
      "24-hour trading means overnight gaps and weekend risk are real concerns",
    ],
    checkpoint: {
      question: "You buy 1 /ES contract at 5,000 with $13,000 initial margin. /ES drops to 4,900 overnight. What is your loss?",
      options: ["$1,300", "$5,000", "$13,000", "No loss until you sell"],
      correctIndex: 1,
      explanation: "/ES multiplier is $50 per point. A 100-point drop = 100 x $50 = $5,000. This is more than a third of your $13,000 margin, and it happened in a single session. Margin is not a cap on losses.",
    },
  },
};

export const ACADEMY_PRACTICE_ACTIONS: Record<string, PracticeAction[]> = {
  "calls-and-puts": [
    {
      label: "Open Simulator",
      route: "/signals?tab=simulator",
      description: "Experiment with call and put payoff diagrams",
    },
  ],
  "buy-to-open-sell-to-close": [
    {
      label: "Open Trading Workflow",
      route: "/trading",
      description: "Practice identifying order actions on the trading screen",
    },
  ],
  "defined-vs-undefined-risk": [
    {
      label: "Open Simulator",
      route: "/signals?tab=simulator",
      description: "Compare defined vs undefined risk profiles side by side",
    },
  ],
  "covered-calls": [
    {
      label: "Simulate Covered Call",
      route: "/signals?tab=simulator",
      state: { strategy: "covered-call" },
      description: "Build a covered call in the simulator and see the payoff",
    },
  ],
  "cash-secured-puts": [
    {
      label: "Simulate Cash-Secured Put",
      route: "/signals?tab=simulator",
      state: { strategy: "cash-secured-put" },
      description: "Model a cash-secured put and calculate effective entry",
    },
  ],
  "protective-puts-and-collars": [
    {
      label: "Simulate Collar",
      route: "/signals?tab=simulator",
      state: { strategy: "collar" },
      description: "Build a collar and compare it to a naked protective put",
    },
  ],
  "vertical-spreads": [
    {
      label: "Simulate Vertical Spread",
      route: "/signals?tab=simulator",
      state: { strategy: "vertical-spread" },
      description: "Enter a bull call or bear put spread and see max profit/loss",
    },
  ],
  "credit-spreads": [
    {
      label: "Simulate Credit Spread",
      route: "/signals?tab=simulator",
      state: { strategy: "credit-spread" },
      description: "Model a credit spread and see how width affects risk",
    },
  ],
  "placing-multi-leg-orders": [
    {
      label: "Open Trading Workflow",
      route: "/trading",
      description: "Practice placing multi-leg orders with the order review screen",
    },
  ],
  "daily-trade-workflow": [
    {
      label: "Open Composite Screener",
      route: "/research?tab=composite",
      description: "Start your daily workflow with the regime and screener",
    },
    {
      label: "Open Dashboard",
      route: "/",
      description: "Check market regime on the main dashboard",
    },
  ],
  "using-the-composite-screener": [
    {
      label: "Open Composite Screener",
      route: "/research?tab=composite",
      description: "Practice sorting, filtering, and building a watch list",
    },
  ],
  "before-you-place-the-order": [
    {
      label: "Open Trading Workflow",
      route: "/trading",
      description: "Run the pre-order checklist on a real setup",
    },
  ],
  "forex-basics": [
    {
      label: "Open Macro Signals",
      route: "/signals?tab=macro",
      description: "View live forex pair data and macro signals",
    },
  ],
  "futures-basics": [
    {
      label: "Open Macro Signals",
      route: "/signals?tab=macro",
      description: "View live futures data and contract information",
    },
  ],
};
