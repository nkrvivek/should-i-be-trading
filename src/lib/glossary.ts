export type GlossaryEntry = {
  term: string;
  category: string;
  definition: string;
  example?: string;
};

export const GLOSSARY: GlossaryEntry[] = [
  // Volatility
  { term: "VIX", category: "Volatility", definition: "The CBOE Volatility Index — measures the market's expectation of 30-day S&P 500 volatility. Often called the \"fear gauge.\" Derived from S&P 500 options prices." },
  { term: "VVIX", category: "Volatility", definition: "Volatility of the VIX itself. When VVIX is high, the market is uncertain about future volatility — the \"fear of fear\" gauge." },
  { term: "Implied Volatility (IV)", category: "Volatility", definition: "The market's forecast of a stock's price movement, as reflected in its option prices. Higher IV = more expected movement = more expensive options." },
  { term: "Realized Volatility (RVOL)", category: "Volatility", definition: "The actual price volatility observed over a past period (typically 20 days). Compared to IV to see if the market is over- or under-pricing risk." },
  { term: "IV Crush", category: "Volatility", definition: "A sharp drop in implied volatility, typically after an anticipated event (earnings, FOMC). Options lose value even if the stock doesn't move much." },

  // Risk Indicators
  { term: "CRI (Crash Risk Index)", category: "Risk", definition: "SIBT's proprietary 0-100 composite score measuring crash probability. Combines VIX, VVIX, cross-asset correlation, and SPX momentum." },
  { term: "COR1M", category: "Risk", definition: "1-month implied correlation of S&P 500 stocks. When high (>60), stocks move together — diversification fails and systemic risk rises." },
  { term: "Crash Trigger", category: "Risk", definition: "Three conditions that historically precede major drawdowns: SPX below 100-day MA, RVOL > 25%, COR1M > 60. When all three are met, forced selling cascades become likely." },
  { term: "VVIX/VIX Ratio", category: "Risk", definition: "Measures convexity demand relative to fear. When this ratio is high (>7), institutional investors are paying a premium for tail-risk protection." },

  // Dark Pool & Flow
  { term: "Dark Pool", category: "Flow", definition: "Private exchanges where institutional investors trade large blocks without displaying orders publicly. Dark pool activity often reveals institutional positioning before it shows up in price." },
  { term: "Sweep Order", category: "Flow", definition: "An aggressive order that \"sweeps\" across multiple exchanges to fill immediately. Sweeps signal urgency — the buyer/seller wants to execute now regardless of price." },
  { term: "Block Trade", category: "Flow", definition: "A large privately negotiated trade, typically 10,000+ shares or $200,000+. Block trades indicate institutional activity." },
  { term: "Put/Call Ratio (P/C)", category: "Flow", definition: "The ratio of put volume to call volume. Above 1.0 = more puts (bearish sentiment). Below 0.7 = more calls (bullish). Extreme readings often signal contrarian opportunities.", example: "P/C > 2.0 = BEARISH | 0.8-1.2 = NEUTRAL | < 0.5 = BULLISH" },
  { term: "Options Flow", category: "Flow", definition: "Tracking unusual options activity (sweeps, blocks, large premium) to identify what institutional traders are betting on. Ask-side flow = buying. Bid-side = selling." },
  { term: "GEX (Gamma Exposure)", category: "Flow", definition: "Net gamma exposure of market makers. Positive GEX = market makers dampen moves (low vol). Negative GEX = market makers amplify moves (high vol)." },

  // Options Basics
  { term: "Call Option", category: "Options", definition: "A contract giving the right (not obligation) to buy 100 shares at the strike price before expiration. Profits when the stock goes up." },
  { term: "Put Option", category: "Options", definition: "A contract giving the right (not obligation) to sell 100 shares at the strike price before expiration. Profits when the stock goes down." },
  { term: "Strike Price", category: "Options", definition: "The price at which the option holder can buy (call) or sell (put) the underlying stock." },
  { term: "Premium", category: "Options", definition: "The price paid for an option contract. Influenced by: intrinsic value + time value + implied volatility." },
  { term: "The Greeks", category: "Options", definition: "Risk measures for options. Delta (directional risk), Gamma (delta change rate), Theta (time decay), Vega (volatility sensitivity)." },
  { term: "Defined Risk", category: "Options", definition: "A position where the maximum possible loss is known upfront (e.g., buying options, vertical spreads). Contrast with undefined risk (naked short options)." },
  { term: "Spread", category: "Options", definition: "A position involving two or more options. Vertical spread = same expiry, different strikes. Calendar spread = different expiries, same strike." },

  // Portfolio & Risk Management
  { term: "Kelly Criterion", category: "Risk Mgmt", definition: "A mathematical formula for optimal position sizing based on edge and win rate. Kelly = (Win% × Payoff - Loss%) / Payoff. SIBT uses fractional Kelly (typically 25-50% of full Kelly) for safety." },
  { term: "Bankroll", category: "Risk Mgmt", definition: "The total capital allocated for trading. The 2.5% hard cap means no single position can risk more than 2.5% of your bankroll." },
  { term: "Drawdown", category: "Risk Mgmt", definition: "The peak-to-trough decline in portfolio value. Maximum drawdown measures the worst historical decline. A 10% drawdown needs an 11.1% gain to recover." },
  { term: "Return on Risk", category: "Risk Mgmt", definition: "P&L divided by capital at risk. For a debit trade, risk = premium paid. For credit trades, risk = width of spread minus credit received." },
  { term: "Convexity", category: "Risk Mgmt", definition: "A position where potential gain is much larger than potential loss (e.g., 3:1 reward:risk). SIBT requires minimum 2:1 convexity for all trades." },

  // Market Structure
  { term: "Market Maker", category: "Market", definition: "A firm that provides liquidity by continuously quoting bid and ask prices. Market makers profit from the spread and hedge their positions." },
  { term: "CTA (Commodity Trading Advisor)", category: "Market", definition: "Systematic/trend-following funds that can be forced to sell when volatility rises. CTA forced selling can accelerate market declines (\"vol-targeting cascade\")." },
  { term: "13F Filing", category: "Market", definition: "A quarterly SEC filing where institutional investors (>$100M) disclose their holdings. Shows what big funds own — with a 45-day reporting delay." },
  { term: "Form 4", category: "Market", definition: "SEC filing required when company insiders (officers, directors, 10%+ shareholders) buy or sell their own company's stock. Must be filed within 2 business days." },

  // SIBT-Specific
  { term: "Traffic Light Verdict", category: "SIBT", definition: "SIBT's top-level trading signal: TRADE (conditions favorable), CAUTION (elevated risk, reduce size), or NO TRADE (stay out). Based on CRI, VIX regime, market hours, and crash triggers." },
  { term: "VIX Regime", category: "SIBT", definition: "A mean-reversion signal: BUY AGGRESSIVE when VIX >= 45, BUY when >= 30, HOLD in normal range, SELL/take profits when <= 14. Based on the historical tendency of extreme fear to precede strong equity returns." },
];

export const GLOSSARY_CATEGORIES = [...new Set(GLOSSARY.map((g) => g.category))];
