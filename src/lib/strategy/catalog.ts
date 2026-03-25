export type AssetClass = "options" | "stocks" | "etfs" | "volatility";
export type MarketOutlook = "bullish" | "bearish" | "neutral" | "any";
export type VolRegime = "high" | "low" | "any";
export type Complexity = "beginner" | "intermediate" | "advanced";

export interface TemplateLeg {
  action: "buy" | "sell";
  type: "stock" | "call" | "put";
  qty: number;
  strikeOffset: number; // % from current price (e.g., 0.05 = 5% OTM)
  premiumEstimatePct: number; // rough % of underlying as premium
}

export interface StrategyTemplate {
  id: string;
  name: string;
  assetClass: AssetClass;
  outlook: MarketOutlook;
  volRegime: VolRegime;
  complexity: Complexity;
  description: string;
  whenToUse: string;
  riskProfile: "defined" | "undefined" | "mixed";
  maxProfitDesc: string;
  maxLossDesc: string;
  legs: TemplateLeg[];
  regimeSignals: string[];
  vixRange?: [number, number];
}

export const STRATEGY_CATALOG: StrategyTemplate[] = [
  // ─── OPTIONS: BULLISH ─────────────────────────────
  {
    id: "covered_call",
    name: "Covered Call",
    assetClass: "options",
    outlook: "bullish",
    volRegime: "high",
    complexity: "beginner",
    description:
      "Own the stock and sell an OTM call to collect premium. Caps upside but generates income.",
    whenToUse:
      "Mildly bullish outlook, willing to cap upside for income. Best when IV is elevated.",
    riskProfile: "mixed",
    maxProfitDesc: "Premium + (strike - entry price)",
    maxLossDesc: "Entry price - premium received (stock drops to 0)",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
      { action: "sell", type: "call", qty: 1, strikeOffset: 0.05, premiumEstimatePct: 0.02 },
    ],
    regimeSignals: ["YES", "CAUTION"],
    vixRange: [18, 50],
  },
  {
    id: "bull_call_spread",
    name: "Bull Call Spread",
    assetClass: "options",
    outlook: "bullish",
    volRegime: "any",
    complexity: "beginner",
    description:
      "Buy a call and sell a higher-strike call. Defined risk, lower cost than a naked call.",
    whenToUse:
      "Moderately bullish. Reduces premium outlay vs buying a call outright.",
    riskProfile: "defined",
    maxProfitDesc: "Width of strikes - net debit",
    maxLossDesc: "Net debit paid",
    legs: [
      { action: "buy", type: "call", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.03 },
      { action: "sell", type: "call", qty: 1, strikeOffset: 0.05, premiumEstimatePct: 0.015 },
    ],
    regimeSignals: ["YES"],
    vixRange: [10, 35],
  },
  {
    id: "protective_put",
    name: "Protective Put",
    assetClass: "options",
    outlook: "bullish",
    volRegime: "low",
    complexity: "beginner",
    description:
      "Own stock and buy a put as insurance. Limits downside while keeping unlimited upside.",
    whenToUse:
      "Long stock but worried about a drawdown. Buy when IV is low for cheaper protection.",
    riskProfile: "defined",
    maxProfitDesc: "Unlimited (stock rises)",
    maxLossDesc: "Entry - strike + premium paid",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
      { action: "buy", type: "put", qty: 1, strikeOffset: -0.05, premiumEstimatePct: 0.02 },
    ],
    regimeSignals: ["YES", "CAUTION"],
    vixRange: [8, 22],
  },
  {
    id: "collar",
    name: "Collar",
    assetClass: "options",
    outlook: "bullish",
    volRegime: "any",
    complexity: "intermediate",
    description:
      "Own stock, buy a put, sell a call. Zero or low cost hedge that caps both upside and downside.",
    whenToUse:
      "Want downside protection without paying much premium. Accept capped gains.",
    riskProfile: "defined",
    maxProfitDesc: "Call strike - entry price + net credit/debit",
    maxLossDesc: "Entry price - put strike + net debit",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
      { action: "buy", type: "put", qty: 1, strikeOffset: -0.05, premiumEstimatePct: 0.02 },
      { action: "sell", type: "call", qty: 1, strikeOffset: 0.05, premiumEstimatePct: 0.02 },
    ],
    regimeSignals: ["CAUTION", "NO_TRADE"],
    vixRange: [15, 40],
  },

  // ─── OPTIONS: BEARISH ─────────────────────────────
  {
    id: "bear_put_spread",
    name: "Bear Put Spread",
    assetClass: "options",
    outlook: "bearish",
    volRegime: "any",
    complexity: "beginner",
    description:
      "Buy a put and sell a lower-strike put. Defined risk bearish bet at reduced cost.",
    whenToUse:
      "Moderately bearish. Cheaper than buying a put outright.",
    riskProfile: "defined",
    maxProfitDesc: "Width of strikes - net debit",
    maxLossDesc: "Net debit paid",
    legs: [
      { action: "buy", type: "put", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.03 },
      { action: "sell", type: "put", qty: 1, strikeOffset: -0.05, premiumEstimatePct: 0.015 },
    ],
    regimeSignals: ["CAUTION", "NO_TRADE"],
    vixRange: [10, 35],
  },
  {
    id: "credit_call_spread",
    name: "Bear Call Spread (Credit)",
    assetClass: "options",
    outlook: "bearish",
    volRegime: "high",
    complexity: "intermediate",
    description:
      "Sell a call and buy a higher-strike call. Collect premium betting the stock won't rise above the short strike.",
    whenToUse:
      "Bearish or neutral, expecting the stock to stay below the short call strike. High IV preferred.",
    riskProfile: "defined",
    maxProfitDesc: "Net credit received",
    maxLossDesc: "Width of strikes - net credit",
    legs: [
      { action: "sell", type: "call", qty: 1, strikeOffset: 0.03, premiumEstimatePct: 0.025 },
      { action: "buy", type: "call", qty: 1, strikeOffset: 0.08, premiumEstimatePct: 0.012 },
    ],
    regimeSignals: ["CAUTION", "NO_TRADE"],
    vixRange: [18, 50],
  },

  // ─── OPTIONS: NEUTRAL ─────────────────────────────
  {
    id: "iron_condor",
    name: "Iron Condor",
    assetClass: "options",
    outlook: "neutral",
    volRegime: "high",
    complexity: "intermediate",
    description:
      "Sell an OTM put spread and an OTM call spread simultaneously. Profit if the stock stays range-bound.",
    whenToUse:
      "Expect low movement. High IV inflates premium collected. Ideal after earnings or around consolidation.",
    riskProfile: "defined",
    maxProfitDesc: "Net credit received",
    maxLossDesc: "Width of wider spread - net credit",
    legs: [
      { action: "sell", type: "put", qty: 1, strikeOffset: -0.05, premiumEstimatePct: 0.015 },
      { action: "buy", type: "put", qty: 1, strikeOffset: -0.10, premiumEstimatePct: 0.006 },
      { action: "sell", type: "call", qty: 1, strikeOffset: 0.05, premiumEstimatePct: 0.015 },
      { action: "buy", type: "call", qty: 1, strikeOffset: 0.10, premiumEstimatePct: 0.006 },
    ],
    regimeSignals: ["YES", "CAUTION"],
    vixRange: [18, 40],
  },
  {
    id: "iron_butterfly",
    name: "Iron Butterfly",
    assetClass: "options",
    outlook: "neutral",
    volRegime: "high",
    complexity: "intermediate",
    description:
      "Sell ATM straddle + buy OTM wings. Higher premium than iron condor but narrower profit zone.",
    whenToUse:
      "Very range-bound expectation. Maximum premium collection when IV is very high.",
    riskProfile: "defined",
    maxProfitDesc: "Net credit received",
    maxLossDesc: "Width of wing - net credit",
    legs: [
      { action: "sell", type: "put", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.03 },
      { action: "buy", type: "put", qty: 1, strikeOffset: -0.07, premiumEstimatePct: 0.01 },
      { action: "sell", type: "call", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.03 },
      { action: "buy", type: "call", qty: 1, strikeOffset: 0.07, premiumEstimatePct: 0.01 },
    ],
    regimeSignals: ["YES"],
    vixRange: [20, 50],
  },
  {
    id: "credit_put_spread",
    name: "Bull Put Spread (Credit)",
    assetClass: "options",
    outlook: "bullish",
    volRegime: "high",
    complexity: "intermediate",
    description:
      "Sell a put and buy a lower-strike put. Collect premium betting the stock stays above the short strike.",
    whenToUse:
      "Bullish or neutral, expecting support to hold. High IV preferred for better premium.",
    riskProfile: "defined",
    maxProfitDesc: "Net credit received",
    maxLossDesc: "Width of strikes - net credit",
    legs: [
      { action: "sell", type: "put", qty: 1, strikeOffset: -0.03, premiumEstimatePct: 0.025 },
      { action: "buy", type: "put", qty: 1, strikeOffset: -0.08, premiumEstimatePct: 0.012 },
    ],
    regimeSignals: ["YES", "CAUTION"],
    vixRange: [18, 50],
  },
  {
    id: "long_straddle",
    name: "Long Straddle",
    assetClass: "options",
    outlook: "any",
    volRegime: "low",
    complexity: "intermediate",
    description:
      "Buy ATM call + ATM put. Profit from a big move in either direction.",
    whenToUse:
      "Expecting a large move but unsure of direction. Buy when IV is low (pre-earnings, pre-catalyst).",
    riskProfile: "defined",
    maxProfitDesc: "Unlimited (either direction)",
    maxLossDesc: "Total premium paid (both legs)",
    legs: [
      { action: "buy", type: "call", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.035 },
      { action: "buy", type: "put", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.035 },
    ],
    regimeSignals: ["YES", "CAUTION", "NO_TRADE"],
    vixRange: [8, 20],
  },
  {
    id: "long_strangle",
    name: "Long Strangle",
    assetClass: "options",
    outlook: "any",
    volRegime: "low",
    complexity: "intermediate",
    description:
      "Buy OTM call + OTM put. Cheaper than a straddle but needs a bigger move to profit.",
    whenToUse:
      "Expecting a significant move, unsure of direction. Cheaper than straddle when IV is still low.",
    riskProfile: "defined",
    maxProfitDesc: "Unlimited (either direction)",
    maxLossDesc: "Total premium paid",
    legs: [
      { action: "buy", type: "call", qty: 1, strikeOffset: 0.05, premiumEstimatePct: 0.02 },
      { action: "buy", type: "put", qty: 1, strikeOffset: -0.05, premiumEstimatePct: 0.02 },
    ],
    regimeSignals: ["YES", "CAUTION", "NO_TRADE"],
    vixRange: [8, 22],
  },
  {
    id: "calendar_spread",
    name: "Calendar Spread (Call)",
    assetClass: "options",
    outlook: "neutral",
    volRegime: "low",
    complexity: "advanced",
    description:
      "Sell a near-term call, buy a longer-term call at the same strike. Profits from time decay differential.",
    whenToUse:
      "Expecting the stock to stay near the strike through near-term expiry. Benefits from rising IV.",
    riskProfile: "defined",
    maxProfitDesc: "Difference in time value at near-term expiry",
    maxLossDesc: "Net debit paid",
    legs: [
      { action: "sell", type: "call", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.02 },
      { action: "buy", type: "call", qty: 1, strikeOffset: 0, premiumEstimatePct: 0.035 },
    ],
    regimeSignals: ["YES", "CAUTION"],
    vixRange: [10, 25],
  },

  // ─── STOCKS ───────────────────────────────────────
  {
    id: "price_momentum",
    name: "Price Momentum",
    assetClass: "stocks",
    outlook: "bullish",
    volRegime: "any",
    complexity: "beginner",
    description:
      "Buy stocks with strong recent returns, short (or avoid) weak performers. Trend-following approach.",
    whenToUse:
      "Trending markets with clear sector leadership. Works best in TRADE regime with low-moderate VIX.",
    riskProfile: "undefined",
    maxProfitDesc: "Unlimited (trend continues)",
    maxLossDesc: "Unlimited without stop-loss",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["YES"],
    vixRange: [8, 25],
  },
  {
    id: "mean_reversion",
    name: "Mean Reversion",
    assetClass: "stocks",
    outlook: "any",
    volRegime: "high",
    complexity: "intermediate",
    description:
      "Buy oversold stocks (below moving average), sell overbought ones. Bet on prices returning to the mean.",
    whenToUse:
      "Range-bound or choppy markets. Counter-trend approach works when there's no strong directional bias.",
    riskProfile: "undefined",
    maxProfitDesc: "Reversion to mean",
    maxLossDesc: "Trend continues against position",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["CAUTION"],
    vixRange: [18, 40],
  },
  {
    id: "pairs_trading",
    name: "Pairs Trading",
    assetClass: "stocks",
    outlook: "neutral",
    volRegime: "any",
    complexity: "advanced",
    description:
      "Long one stock, short a correlated peer. Profit from relative value convergence, market-neutral.",
    whenToUse:
      "When two correlated stocks diverge temporarily. Works in any market regime since it's hedged.",
    riskProfile: "mixed",
    maxProfitDesc: "Spread convergence",
    maxLossDesc: "Spread diverges further",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
      { action: "sell", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["YES", "CAUTION", "NO_TRADE"],
  },
  {
    id: "moving_avg_crossover",
    name: "Moving Average Crossover",
    assetClass: "stocks",
    outlook: "any",
    volRegime: "any",
    complexity: "beginner",
    description:
      "Buy when short MA crosses above long MA, sell when it crosses below. Classic trend-following signal.",
    whenToUse:
      "Works in trending markets. The SIBT regime signal already incorporates MA-based trend scoring.",
    riskProfile: "undefined",
    maxProfitDesc: "Unlimited (trend continues)",
    maxLossDesc: "Whipsaw losses in choppy markets",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["YES"],
    vixRange: [8, 30],
  },

  // ─── ETFs ─────────────────────────────────────────
  {
    id: "sector_rotation",
    name: "Sector Rotation",
    assetClass: "etfs",
    outlook: "bullish",
    volRegime: "any",
    complexity: "intermediate",
    description:
      "Rotate into the strongest-performing sector ETFs based on relative momentum. Overweight leaders, underweight laggards.",
    whenToUse:
      "When clear sector leadership exists. Use SIBT sector heatmap to identify leaders.",
    riskProfile: "undefined",
    maxProfitDesc: "Outperformance vs broad market",
    maxLossDesc: "Sector leadership reverses",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["YES"],
    vixRange: [8, 25],
  },
  {
    id: "dual_momentum",
    name: "Dual Momentum",
    assetClass: "etfs",
    outlook: "any",
    volRegime: "any",
    complexity: "intermediate",
    description:
      "Combine absolute momentum (is asset trending up?) with relative momentum (which asset is strongest?). Go to cash when both fail.",
    whenToUse:
      "Systematic approach across market cycles. The cash-out rule provides drawdown protection in NO_TRADE regimes.",
    riskProfile: "mixed",
    maxProfitDesc: "Market upside with drawdown protection",
    maxLossDesc: "Whipsaw in choppy transitions",
    legs: [
      { action: "buy", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["YES", "CAUTION"],
  },

  // ─── VOLATILITY ───────────────────────────────────
  {
    id: "vix_mean_reversion",
    name: "VIX Mean Reversion",
    assetClass: "volatility",
    outlook: "any",
    volRegime: "high",
    complexity: "advanced",
    description:
      "VIX tends to mean-revert. Sell volatility (short VIX futures/ETNs) when VIX spikes, buy when it's unusually low.",
    whenToUse:
      "After a VIX spike above 25-30, once the SIBT regime begins transitioning from NO_TRADE back to CAUTION.",
    riskProfile: "undefined",
    maxProfitDesc: "VIX returns to normal (15-18 range)",
    maxLossDesc: "VIX continues spiking (tail risk)",
    legs: [
      { action: "sell", type: "stock", qty: 100, strikeOffset: 0, premiumEstimatePct: 0 },
    ],
    regimeSignals: ["CAUTION"],
    vixRange: [25, 50],
  },
];
