export type GlossaryEntry = {
  term: string;
  category: string;
  definition: string;
  example?: string;
  videoUrl?: string;
  relatedTerms?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
};

export const GLOSSARY: GlossaryEntry[] = [
  // ─── Volatility ───────────────────────────────────────────────────────────────
  {
    term: "VIX",
    category: "Volatility",
    definition:
      "The CBOE Volatility Index — measures the market's expectation of 30-day S&P 500 volatility. Often called the \"fear gauge.\" Derived from S&P 500 options prices.",
    relatedTerms: ["VVIX", "Implied Volatility (IV)", "IV Crush"],
    difficulty: "intermediate",
  },
  {
    term: "VVIX",
    category: "Volatility",
    definition:
      "Volatility of the VIX itself. When VVIX is high, the market is uncertain about future volatility — the \"fear of fear\" gauge.",
    relatedTerms: ["VIX", "VVIX/VIX Ratio", "Implied Volatility (IV)"],
    difficulty: "advanced",
  },
  {
    term: "Implied Volatility (IV)",
    category: "Volatility",
    definition:
      "The market's forecast of a stock's price movement, as reflected in its option prices. Higher IV = more expected movement = more expensive options.",
    relatedTerms: [
      "Realized Volatility (RVOL)",
      "IV Crush",
      "VIX",
      "Premium",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Realized Volatility (RVOL)",
    category: "Volatility",
    definition:
      "The actual price volatility observed over a past period (typically 20 days). Compared to IV to see if the market is over- or under-pricing risk.",
    relatedTerms: ["Implied Volatility (IV)", "ATR (Average True Range)"],
    difficulty: "intermediate",
  },
  {
    term: "IV Crush",
    category: "Volatility",
    definition:
      "A sharp drop in implied volatility, typically after an anticipated event (earnings, FOMC). Options lose value even if the stock doesn't move much.",
    relatedTerms: [
      "Implied Volatility (IV)",
      "Premium",
      "The Greeks",
    ],
    difficulty: "intermediate",
  },

  // ─── Risk Indicators ──────────────────────────────────────────────────────────
  {
    term: "CRI (Crash Risk Index)",
    category: "Risk",
    definition:
      "SIBT's proprietary 0-100 composite score measuring crash probability. Combines VIX, VVIX, cross-asset correlation, and SPX momentum.",
    relatedTerms: [
      "VIX",
      "VVIX",
      "COR1M",
      "Crash Trigger",
      "Traffic Light Verdict",
    ],
    difficulty: "intermediate",
  },
  {
    term: "COR1M",
    category: "Risk",
    definition:
      "1-month implied correlation of S&P 500 stocks. When high (>60), stocks move together — diversification fails and systemic risk rises.",
    relatedTerms: ["CRI (Crash Risk Index)", "Crash Trigger"],
    difficulty: "advanced",
  },
  {
    term: "Crash Trigger",
    category: "Risk",
    definition:
      "Three conditions that historically precede major drawdowns: SPX below 100-day MA, RVOL > 25%, COR1M > 60. When all three are met, forced selling cascades become likely.",
    relatedTerms: [
      "CRI (Crash Risk Index)",
      "COR1M",
      "Realized Volatility (RVOL)",
      "Drawdown",
    ],
    difficulty: "advanced",
  },
  {
    term: "VVIX/VIX Ratio",
    category: "Risk",
    definition:
      "Measures convexity demand relative to fear. When this ratio is high (>7), institutional investors are paying a premium for tail-risk protection.",
    relatedTerms: ["VIX", "VVIX", "Convexity"],
    difficulty: "advanced",
  },

  // ─── Dark Pool & Flow ─────────────────────────────────────────────────────────
  {
    term: "Dark Pool",
    category: "Flow",
    definition:
      "Private exchanges where institutional investors trade large blocks without displaying orders publicly. Dark pool activity often reveals institutional positioning before it shows up in price.",
    relatedTerms: ["Block Trade", "Sweep Order", "Market Maker"],
    difficulty: "intermediate",
  },
  {
    term: "Sweep Order",
    category: "Flow",
    definition:
      "An aggressive order that \"sweeps\" across multiple exchanges to fill immediately. Sweeps signal urgency — the buyer/seller wants to execute now regardless of price.",
    relatedTerms: ["Options Flow", "Market Order", "Dark Pool"],
    difficulty: "intermediate",
  },
  {
    term: "Block Trade",
    category: "Flow",
    definition:
      "A large privately negotiated trade, typically 10,000+ shares or $200,000+. Block trades indicate institutional activity.",
    relatedTerms: ["Dark Pool", "Options Flow", "13F Filing"],
    difficulty: "intermediate",
  },
  {
    term: "Put/Call Ratio (P/C)",
    category: "Flow",
    definition:
      "The ratio of put volume to call volume. Above 1.0 = more puts (bearish sentiment). Below 0.7 = more calls (bullish). Extreme readings often signal contrarian opportunities.",
    example: "P/C > 2.0 = BEARISH | 0.8-1.2 = NEUTRAL | < 0.5 = BULLISH",
    relatedTerms: [
      "Put Option",
      "Call Option",
      "Options Flow",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Options Flow",
    category: "Flow",
    definition:
      "Tracking unusual options activity (sweeps, blocks, large premium) to identify what institutional traders are betting on. Ask-side flow = buying. Bid-side = selling.",
    relatedTerms: [
      "Sweep Order",
      "Block Trade",
      "GEX (Gamma Exposure)",
    ],
    difficulty: "intermediate",
  },
  {
    term: "GEX (Gamma Exposure)",
    category: "Flow",
    definition:
      "Net gamma exposure of market makers. Positive GEX = market makers dampen moves (low vol). Negative GEX = market makers amplify moves (high vol).",
    relatedTerms: ["Market Maker", "The Greeks", "VIX"],
    difficulty: "advanced",
  },

  // ─── Options Basics ───────────────────────────────────────────────────────────
  {
    term: "Call Option",
    category: "Options",
    definition:
      "A contract giving the right (not obligation) to buy 100 shares at the strike price before expiration. Profits when the stock goes up.",
    relatedTerms: [
      "Put Option",
      "Strike Price",
      "Premium",
      "Covered Call",
    ],
    difficulty: "beginner",
  },
  {
    term: "Put Option",
    category: "Options",
    definition:
      "A contract giving the right (not obligation) to sell 100 shares at the strike price before expiration. Profits when the stock goes down.",
    relatedTerms: [
      "Call Option",
      "Strike Price",
      "Premium",
      "Protective Put",
    ],
    difficulty: "beginner",
  },
  {
    term: "Strike Price",
    category: "Options",
    definition:
      "The price at which the option holder can buy (call) or sell (put) the underlying stock.",
    relatedTerms: ["Call Option", "Put Option", "Premium"],
    difficulty: "beginner",
  },
  {
    term: "Premium",
    category: "Options",
    definition:
      "The price paid for an option contract. Influenced by: intrinsic value + time value + implied volatility.",
    relatedTerms: [
      "Implied Volatility (IV)",
      "The Greeks",
      "Strike Price",
    ],
    difficulty: "beginner",
  },
  {
    term: "The Greeks",
    category: "Options",
    definition:
      "Risk measures for options. Delta (directional risk), Gamma (delta change rate), Theta (time decay), Vega (volatility sensitivity).",
    relatedTerms: [
      "Premium",
      "Implied Volatility (IV)",
      "GEX (Gamma Exposure)",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Defined Risk",
    category: "Options",
    definition:
      "A position where the maximum possible loss is known upfront (e.g., buying options, vertical spreads). Contrast with undefined risk (naked short options).",
    relatedTerms: ["Spread", "Iron Condor", "Bull Put Spread"],
    difficulty: "intermediate",
  },
  {
    term: "Spread",
    category: "Options",
    definition:
      "A position involving two or more options. Vertical spread = same expiry, different strikes. Calendar spread = different expiries, same strike.",
    relatedTerms: [
      "Defined Risk",
      "Iron Condor",
      "Bull Put Spread",
      "Covered Call",
    ],
    difficulty: "intermediate",
  },

  // ─── Portfolio & Risk Management ──────────────────────────────────────────────
  {
    term: "Kelly Criterion",
    category: "Risk Mgmt",
    definition:
      "A mathematical formula for optimal position sizing based on edge and win rate. Kelly = (Win% × Payoff - Loss%) / Payoff. SIBT uses fractional Kelly (typically 25-50% of full Kelly) for safety.",
    relatedTerms: ["Position Sizing", "Bankroll", "Return on Risk"],
    difficulty: "advanced",
  },
  {
    term: "Bankroll",
    category: "Risk Mgmt",
    definition:
      "The total capital allocated for trading. The 2.5% hard cap means no single position can risk more than 2.5% of your bankroll.",
    relatedTerms: [
      "Kelly Criterion",
      "Position Sizing",
      "Drawdown",
    ],
    difficulty: "beginner",
  },
  {
    term: "Drawdown",
    category: "Risk Mgmt",
    definition:
      "The peak-to-trough decline in portfolio value. Maximum drawdown measures the worst historical decline. A 10% drawdown needs an 11.1% gain to recover.",
    relatedTerms: ["Bankroll", "Correction", "Bear Market"],
    difficulty: "intermediate",
  },
  {
    term: "Return on Risk",
    category: "Risk Mgmt",
    definition:
      "P&L divided by capital at risk. For a debit trade, risk = premium paid. For credit trades, risk = width of spread minus credit received.",
    relatedTerms: ["Convexity", "Defined Risk", "Kelly Criterion"],
    difficulty: "intermediate",
  },
  {
    term: "Convexity",
    category: "Risk Mgmt",
    definition:
      "A position where potential gain is much larger than potential loss (e.g., 3:1 reward:risk). SIBT requires minimum 2:1 convexity for all trades.",
    relatedTerms: [
      "Return on Risk",
      "Defined Risk",
      "VVIX/VIX Ratio",
    ],
    difficulty: "advanced",
  },

  // ─── Market Structure ─────────────────────────────────────────────────────────
  {
    term: "Market Maker",
    category: "Market",
    definition:
      "A firm that provides liquidity by continuously quoting bid and ask prices. Market makers profit from the spread and hedge their positions.",
    relatedTerms: [
      "Bid/Ask Spread",
      "GEX (Gamma Exposure)",
      "Dark Pool",
    ],
    difficulty: "intermediate",
  },
  {
    term: "CTA (Commodity Trading Advisor)",
    category: "Market",
    definition:
      "Systematic/trend-following funds that can be forced to sell when volatility rises. CTA forced selling can accelerate market declines (\"vol-targeting cascade\").",
    relatedTerms: ["VIX", "Crash Trigger", "Bear Market"],
    difficulty: "advanced",
  },
  {
    term: "13F Filing",
    category: "Market",
    definition:
      "A quarterly SEC filing where institutional investors (>$100M) disclose their holdings. Shows what big funds own — with a 45-day reporting delay.",
    relatedTerms: ["Form 4", "Dark Pool", "Block Trade"],
    difficulty: "intermediate",
  },
  {
    term: "Form 4",
    category: "Market",
    definition:
      "SEC filing required when company insiders (officers, directors, 10%+ shareholders) buy or sell their own company's stock. Must be filed within 2 business days.",
    relatedTerms: ["13F Filing"],
    difficulty: "intermediate",
  },

  // ─── SIBT-Specific ────────────────────────────────────────────────────────────
  {
    term: "Traffic Light Verdict",
    category: "SIBT",
    definition:
      "SIBT's top-level trading signal: TRADE (conditions favorable), CAUTION (elevated risk, reduce size), or NO TRADE (stay out). Based on CRI, VIX regime, market hours, and crash triggers.",
    relatedTerms: [
      "CRI (Crash Risk Index)",
      "VIX Regime",
      "Crash Trigger",
    ],
    difficulty: "beginner",
  },
  {
    term: "VIX Regime",
    category: "SIBT",
    definition:
      "A mean-reversion signal: BUY AGGRESSIVE when VIX >= 45, BUY when >= 30, HOLD in normal range, SELL/take profits when <= 14. Based on the historical tendency of extreme fear to precede strong equity returns.",
    relatedTerms: [
      "VIX",
      "Traffic Light Verdict",
      "Bull Market",
      "Bear Market",
    ],
    difficulty: "intermediate",
  },

  // ─── Trading Basics ───────────────────────────────────────────────────────────
  {
    term: "Bid/Ask Spread",
    category: "Trading Basics",
    definition:
      "The difference between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask). Tighter spreads mean more liquid markets and lower trading costs.",
    example:
      "Stock bid $50.00 / ask $50.05 → spread is $0.05 (0.1%)",
    relatedTerms: ["Market Maker", "Market Order", "Limit Order"],
    difficulty: "beginner",
  },
  {
    term: "Market Order",
    category: "Trading Basics",
    definition:
      "An order to buy or sell immediately at the best available price. Guarantees execution but not price — you may get filled at a worse price in fast-moving or illiquid markets.",
    relatedTerms: ["Limit Order", "Bid/Ask Spread", "Stop Loss"],
    difficulty: "beginner",
  },
  {
    term: "Limit Order",
    category: "Trading Basics",
    definition:
      "An order to buy or sell at a specific price or better. Guarantees price but not execution — the order may never fill if the market doesn't reach your price.",
    relatedTerms: ["Market Order", "Bid/Ask Spread", "Take Profit"],
    difficulty: "beginner",
  },
  {
    term: "Stop Loss",
    category: "Trading Basics",
    definition:
      "An order placed to automatically sell a position when the price falls to a specified level, limiting losses. Essential for risk management — protects against catastrophic losses.",
    example:
      "Buy stock at $100, set stop loss at $95 → max loss is 5%",
    relatedTerms: ["Take Profit", "Position Sizing", "Drawdown"],
    difficulty: "beginner",
  },
  {
    term: "Take Profit",
    category: "Trading Basics",
    definition:
      "An order placed to automatically close a position when it reaches a target profit level. Locks in gains without needing to watch the market.",
    relatedTerms: ["Stop Loss", "Limit Order", "Return on Risk"],
    difficulty: "beginner",
  },
  {
    term: "Position Sizing",
    category: "Trading Basics",
    definition:
      "Determining how much capital to allocate to a single trade. Proper position sizing ensures no single loss can significantly damage your portfolio. A common rule is risking no more than 1-2% of total capital per trade.",
    relatedTerms: [
      "Kelly Criterion",
      "Bankroll",
      "Stop Loss",
      "Leverage",
    ],
    difficulty: "beginner",
  },
  {
    term: "Leverage",
    category: "Trading Basics",
    definition:
      "Using borrowed capital to increase the size of a trade. Amplifies both gains and losses. A 2:1 leverage means $1 of capital controls $2 of assets.",
    example: "2x leverage: $10,000 capital controls $20,000 in stock",
    relatedTerms: ["Margin", "Position Sizing", "Drawdown"],
    difficulty: "intermediate",
  },
  {
    term: "Margin",
    category: "Trading Basics",
    definition:
      "The collateral required by a broker to open and maintain leveraged positions. A margin call occurs when your account equity falls below the maintenance requirement, forcing you to deposit more funds or close positions.",
    relatedTerms: ["Leverage", "Short Selling", "Bankroll"],
    difficulty: "intermediate",
  },
  {
    term: "Short Selling",
    category: "Trading Basics",
    definition:
      "Selling borrowed shares with the intent to buy them back at a lower price, profiting from a price decline. Risk is theoretically unlimited since the stock can rise indefinitely.",
    relatedTerms: ["Put Option", "Margin", "Bear Market"],
    difficulty: "intermediate",
  },
  {
    term: "Day Trading",
    category: "Trading Basics",
    definition:
      "Buying and selling securities within the same trading day, closing all positions before the market closes. The SEC's Pattern Day Trader rule requires $25,000 minimum equity for accounts making 4+ day trades in 5 business days.",
    relatedTerms: [
      "Market Order",
      "Stop Loss",
      "Bid/Ask Spread",
    ],
    difficulty: "beginner",
  },

  // ─── Technical Analysis ───────────────────────────────────────────────────────
  {
    term: "Support & Resistance",
    category: "Technical Analysis",
    definition:
      "Support is a price level where buying pressure historically prevents further decline. Resistance is where selling pressure prevents further advance. These levels act as psychological price floors and ceilings.",
    relatedTerms: [
      "Moving Average (SMA/EMA)",
      "Fibonacci Retracement",
      "Candlestick Patterns",
    ],
    difficulty: "beginner",
  },
  {
    term: "Moving Average (SMA/EMA)",
    category: "Technical Analysis",
    definition:
      "A trend-following indicator that smooths price data. SMA (Simple) weights all periods equally. EMA (Exponential) gives more weight to recent prices. Common periods: 20 (short-term), 50 (medium), 200 (long-term).",
    example:
      "Price above 200-day SMA = long-term uptrend; below = downtrend",
    relatedTerms: [
      "Support & Resistance",
      "MACD",
      "Bollinger Bands",
    ],
    difficulty: "beginner",
  },
  {
    term: "RSI (Relative Strength Index)",
    category: "Technical Analysis",
    definition:
      "A momentum oscillator (0-100) measuring the speed and magnitude of price changes. RSI > 70 = overbought (potential reversal down). RSI < 30 = oversold (potential reversal up). Developed by J. Welles Wilder.",
    example: "RSI > 70 = overbought | RSI < 30 = oversold",
    relatedTerms: [
      "Stochastic Oscillator",
      "MACD",
      "Support & Resistance",
    ],
    difficulty: "intermediate",
  },
  {
    term: "MACD",
    category: "Technical Analysis",
    definition:
      "Moving Average Convergence Divergence — a trend-following momentum indicator showing the relationship between two EMAs (typically 12 and 26 period). The signal line (9-period EMA of MACD) generates buy/sell signals on crossovers.",
    relatedTerms: [
      "Moving Average (SMA/EMA)",
      "RSI (Relative Strength Index)",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Bollinger Bands",
    category: "Technical Analysis",
    definition:
      "A volatility indicator consisting of a 20-period SMA with upper and lower bands set 2 standard deviations away. When bands narrow (\"squeeze\"), a big move is expected. Price touching the outer bands can signal overbought/oversold conditions.",
    relatedTerms: [
      "Moving Average (SMA/EMA)",
      "Implied Volatility (IV)",
      "ATR (Average True Range)",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Volume",
    category: "Technical Analysis",
    definition:
      "The number of shares or contracts traded in a given period. Volume confirms price moves — a breakout on high volume is more reliable than one on low volume. Average volume provides a baseline for comparison.",
    relatedTerms: ["Support & Resistance", "Dark Pool", "Options Flow"],
    difficulty: "beginner",
  },
  {
    term: "Candlestick Patterns",
    category: "Technical Analysis",
    definition:
      "Visual price patterns formed by open, high, low, and close prices. Common patterns include Doji (indecision), Hammer (reversal), Engulfing (trend change), and Morning/Evening Star (reversal). Used to predict short-term price movement.",
    relatedTerms: [
      "Support & Resistance",
      "Volume",
      "RSI (Relative Strength Index)",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Fibonacci Retracement",
    category: "Technical Analysis",
    definition:
      "Horizontal lines indicating potential support/resistance at key Fibonacci ratios (23.6%, 38.2%, 50%, 61.8%, 78.6%) between a high and low point. The 61.8% level (\"golden ratio\") is considered the most significant.",
    relatedTerms: [
      "Support & Resistance",
      "Moving Average (SMA/EMA)",
    ],
    difficulty: "intermediate",
  },
  {
    term: "ATR (Average True Range)",
    category: "Technical Analysis",
    definition:
      "A volatility indicator measuring the average range of price movement over a period (typically 14 days). Used for setting stop losses and position sizing — wider ATR means wider stops are needed.",
    example:
      "ATR of $2.50 on a $50 stock → daily movement is about 5%",
    relatedTerms: [
      "Realized Volatility (RVOL)",
      "Stop Loss",
      "Bollinger Bands",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Stochastic Oscillator",
    category: "Technical Analysis",
    definition:
      "A momentum indicator (0-100) comparing a stock's closing price to its price range over a period. Like RSI, readings above 80 suggest overbought and below 20 suggest oversold. Uses %K and %D lines for crossover signals.",
    relatedTerms: [
      "RSI (Relative Strength Index)",
      "MACD",
    ],
    difficulty: "intermediate",
  },

  // ─── Fundamental Analysis ─────────────────────────────────────────────────────
  {
    term: "P/E Ratio",
    category: "Fundamental Analysis",
    definition:
      "Price-to-Earnings ratio — a stock's price divided by its earnings per share. Shows how much investors pay per dollar of earnings. A high P/E may indicate growth expectations or overvaluation; a low P/E may signal value or trouble.",
    example: "Stock at $100 with EPS of $5 → P/E = 20x",
    relatedTerms: ["EPS (Earnings Per Share)", "Revenue", "Market Cap"],
    difficulty: "beginner",
  },
  {
    term: "EPS (Earnings Per Share)",
    category: "Fundamental Analysis",
    definition:
      "A company's net profit divided by its outstanding shares. The most watched metric during earnings season. EPS beats/misses drive significant post-earnings price moves.",
    relatedTerms: ["P/E Ratio", "Revenue", "IV Crush"],
    difficulty: "beginner",
  },
  {
    term: "Revenue",
    category: "Fundamental Analysis",
    definition:
      "A company's total income from sales before any expenses are deducted (\"top line\"). Revenue growth is a key indicator of business health. Revenue vs. estimates drives stock price reactions during earnings.",
    relatedTerms: [
      "EPS (Earnings Per Share)",
      "Free Cash Flow",
      "P/E Ratio",
    ],
    difficulty: "beginner",
  },
  {
    term: "Market Cap",
    category: "Fundamental Analysis",
    definition:
      "Market capitalization — the total market value of a company's outstanding shares (share price × shares outstanding). Used to classify companies: Mega (>$200B), Large ($10-200B), Mid ($2-10B), Small ($300M-2B), Micro (<$300M).",
    example:
      "Stock at $150 × 1 billion shares = $150B market cap (large cap)",
    relatedTerms: ["P/E Ratio", "Book Value"],
    difficulty: "beginner",
  },
  {
    term: "Dividend Yield",
    category: "Fundamental Analysis",
    definition:
      "Annual dividends per share divided by the stock price, expressed as a percentage. Shows the income return on an investment. High yields may signal value or financial stress — always check the payout ratio.",
    example: "$2 annual dividend / $50 stock price = 4% yield",
    relatedTerms: ["EPS (Earnings Per Share)", "Free Cash Flow"],
    difficulty: "beginner",
  },
  {
    term: "Book Value",
    category: "Fundamental Analysis",
    definition:
      "A company's total assets minus total liabilities — what shareholders would theoretically receive if the company liquidated. Price-to-Book (P/B) ratio compares market price to book value; P/B < 1 may indicate undervaluation.",
    relatedTerms: [
      "Market Cap",
      "Debt-to-Equity Ratio",
      "P/E Ratio",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Free Cash Flow",
    category: "Fundamental Analysis",
    definition:
      "Cash generated by operations minus capital expenditures. The cash a company has available for dividends, buybacks, debt repayment, or reinvestment. Considered more reliable than earnings because it's harder to manipulate.",
    relatedTerms: [
      "Revenue",
      "EPS (Earnings Per Share)",
      "Dividend Yield",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Debt-to-Equity Ratio",
    category: "Fundamental Analysis",
    definition:
      "Total debt divided by shareholders' equity. Measures financial leverage. A high ratio means more debt relative to equity, increasing risk during downturns. Industry averages vary widely — compare within sectors.",
    example:
      "$500M debt / $1B equity = 0.5 D/E ratio (moderate leverage)",
    relatedTerms: ["Book Value", "Leverage", "Free Cash Flow"],
    difficulty: "intermediate",
  },

  // ─── Market Regime ────────────────────────────────────────────────────────────
  {
    term: "Bull Market",
    category: "Market Regime",
    definition:
      "A sustained period of rising prices, typically defined as a 20%+ gain from a recent low. Characterized by investor optimism, strong economic data, and increasing risk appetite. The average bull market lasts about 5 years.",
    relatedTerms: ["Bear Market", "Market Cycle", "Correction"],
    difficulty: "beginner",
  },
  {
    term: "Bear Market",
    category: "Market Regime",
    definition:
      "A sustained period of falling prices, typically defined as a 20%+ decline from a recent high. Characterized by pessimism, economic slowdown, and risk aversion. The average bear market lasts about 14 months.",
    relatedTerms: [
      "Bull Market",
      "Correction",
      "Recession",
      "Short Selling",
    ],
    difficulty: "beginner",
  },
  {
    term: "Correction",
    category: "Market Regime",
    definition:
      "A decline of 10-20% from a recent high in a stock, index, or market. Corrections are normal and healthy — they occur roughly once per year on average and typically last 3-4 months.",
    relatedTerms: ["Bear Market", "Drawdown", "Support & Resistance"],
    difficulty: "beginner",
  },
  {
    term: "Recession",
    category: "Market Regime",
    definition:
      "A significant, widespread, and prolonged economic downturn, often defined as two consecutive quarters of negative GDP growth. Stock markets typically decline before recessions begin and recover before they end.",
    relatedTerms: ["Bear Market", "Market Cycle", "Correction"],
    difficulty: "beginner",
  },
  {
    term: "Market Cycle",
    category: "Market Regime",
    definition:
      "The recurring pattern of expansion, peak, contraction, and trough in both the economy and markets. Understanding where we are in the cycle helps with asset allocation and risk management. Full cycles typically last 5-10 years.",
    relatedTerms: [
      "Bull Market",
      "Bear Market",
      "Recession",
      "VIX Regime",
    ],
    difficulty: "intermediate",
  },

  // ─── Tax & Compliance ─────────────────────────────────────────────────────────
  {
    term: "Wash Sale Rule",
    category: "Tax & Compliance",
    definition:
      "An IRS rule that disallows claiming a tax loss on a security if you buy a \"substantially identical\" security within 30 days before or after the sale. The disallowed loss gets added to the cost basis of the new position.",
    example:
      "Sell AAPL at a loss on March 1, buy AAPL back on March 15 → loss is disallowed",
    relatedTerms: [
      "Tax Loss Harvesting",
      "Cost Basis",
      "Capital Gains Tax",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Capital Gains Tax",
    category: "Tax & Compliance",
    definition:
      "Tax on profit from selling an investment. Short-term (held < 1 year) is taxed as ordinary income (up to 37%). Long-term (held > 1 year) gets preferential rates (0%, 15%, or 20% depending on income).",
    example:
      "Buy at $50, sell at $75 after 2 years → $25 long-term capital gain taxed at 15%",
    relatedTerms: [
      "Tax Loss Harvesting",
      "Wash Sale Rule",
      "Cost Basis",
    ],
    difficulty: "beginner",
  },
  {
    term: "Tax Loss Harvesting",
    category: "Tax & Compliance",
    definition:
      "Intentionally selling losing positions to realize losses that offset capital gains, reducing your tax bill. Up to $3,000 in net losses can be deducted against ordinary income per year. Must avoid triggering the wash sale rule.",
    relatedTerms: [
      "Wash Sale Rule",
      "Capital Gains Tax",
      "Cost Basis",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Cost Basis",
    category: "Tax & Compliance",
    definition:
      "The original purchase price of an investment, adjusted for splits, dividends, and wash sales. Used to calculate capital gains or losses when you sell. Methods include FIFO (first in, first out), LIFO, and specific identification.",
    relatedTerms: [
      "Capital Gains Tax",
      "Wash Sale Rule",
      "1099-B",
    ],
    difficulty: "beginner",
  },
  {
    term: "1099-B",
    category: "Tax & Compliance",
    definition:
      "A tax form issued by brokers reporting proceeds from sales of stocks, options, and other securities. Used to report capital gains and losses on your tax return. Brokers must send it by February 15 of the following year.",
    relatedTerms: [
      "Capital Gains Tax",
      "Cost Basis",
      "Wash Sale Rule",
    ],
    difficulty: "beginner",
  },

  // ─── Strategies ───────────────────────────────────────────────────────────────
  {
    term: "Covered Call",
    category: "Strategies",
    definition:
      "Selling a call option against 100 shares you already own. Generates income (the premium) but caps your upside at the strike price. A conservative income strategy best used in flat-to-slightly-bullish markets.",
    example:
      "Own 100 shares of AAPL at $170, sell $180 call for $3 → income if stock stays below $180",
    relatedTerms: [
      "Call Option",
      "Premium",
      "Collar",
      "Defined Risk",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Iron Condor",
    category: "Strategies",
    definition:
      "A defined-risk options strategy combining a bull put spread and a bear call spread. Profits when the stock stays within a range. Maximum profit = net credit received; maximum loss = width of one spread minus the credit.",
    example:
      "Sell $95 put / buy $90 put + sell $105 call / buy $110 call → profit if stock stays between $95-$105",
    relatedTerms: [
      "Spread",
      "Defined Risk",
      "Implied Volatility (IV)",
      "Bull Put Spread",
    ],
    difficulty: "advanced",
  },
  {
    term: "Protective Put",
    category: "Strategies",
    definition:
      "Buying a put option to hedge against downside risk in a stock you own. Acts as insurance — limits your loss to the strike price minus the premium paid. Also called a \"married put\" when purchased simultaneously with the stock.",
    relatedTerms: [
      "Put Option",
      "Collar",
      "Stop Loss",
      "Defined Risk",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Collar",
    category: "Strategies",
    definition:
      "A protective strategy combining a covered call and a protective put on a stock you own. The call premium offsets the put cost, creating a zero-cost or low-cost hedge. Limits both upside and downside within a range.",
    relatedTerms: [
      "Covered Call",
      "Protective Put",
      "Defined Risk",
    ],
    difficulty: "advanced",
  },
  {
    term: "Bull Put Spread",
    category: "Strategies",
    definition:
      "A credit spread where you sell a higher-strike put and buy a lower-strike put at the same expiration. Profits when the stock stays above the short put strike. Maximum profit = credit received; maximum loss = spread width minus credit.",
    example:
      "Sell $100 put for $3, buy $95 put for $1 → net credit $2, max loss $3",
    relatedTerms: [
      "Spread",
      "Iron Condor",
      "Defined Risk",
      "Put Option",
    ],
    difficulty: "advanced",
  },

  // ─── Additional Terms ─────────────────────────────────────────────────────────
  {
    term: "Liquidity",
    category: "Trading Basics",
    definition:
      "How easily an asset can be bought or sold without significantly affecting its price. High liquidity = tight spreads, fast fills, low slippage. Major stocks and ETFs (SPY, QQQ) are highly liquid; small-caps and exotic options are not.",
    relatedTerms: ["Bid/Ask Spread", "Market Maker", "Volume"],
    difficulty: "beginner",
  },
  {
    term: "Slippage",
    category: "Trading Basics",
    definition:
      "The difference between the expected price of a trade and the actual execution price. More common with market orders in fast-moving or illiquid markets. Can significantly impact profitability on frequent trades.",
    relatedTerms: ["Market Order", "Liquidity", "Bid/Ask Spread"],
    difficulty: "beginner",
  },
  {
    term: "Gap",
    category: "Technical Analysis",
    definition:
      "A price area on a chart where no trading occurred, visible as a space between one period's close and the next period's open. Gaps often occur after earnings or major news. Gap-ups indicate bullish sentiment; gap-downs indicate bearish.",
    relatedTerms: ["Volume", "Support & Resistance", "IV Crush"],
    difficulty: "intermediate",
  },
  {
    term: "Breakout",
    category: "Technical Analysis",
    definition:
      "When a stock's price moves above resistance or below support with increased volume. A confirmed breakout often signals the start of a new trend. False breakouts (reversals back into the range) are common and require volume confirmation.",
    relatedTerms: [
      "Support & Resistance",
      "Volume",
      "Bollinger Bands",
    ],
    difficulty: "intermediate",
  },
  {
    term: "Sector Rotation",
    category: "Market Regime",
    definition:
      "The movement of investment capital from one industry sector to another as investors anticipate the next phase of the economic cycle. Defensive sectors (utilities, healthcare) outperform in downturns; cyclicals (tech, consumer discretionary) outperform in expansions.",
    relatedTerms: ["Market Cycle", "Bull Market", "Bear Market"],
    difficulty: "intermediate",
  },
  {
    term: "Dollar-Cost Averaging (DCA)",
    category: "Risk Mgmt",
    definition:
      "Investing a fixed amount at regular intervals regardless of price. Reduces the impact of volatility by buying more shares when prices are low and fewer when prices are high. A disciplined approach that removes emotion from investing.",
    relatedTerms: ["Position Sizing", "Bankroll", "Market Cycle"],
    difficulty: "beginner",
  },

  // ─── Deep Dives: Institutional Flow & Market Intelligence ──────────────────

  {
    term: "Dark Pool Activity & Market Impact",
    category: "Deep Dives",
    definition:
      "Dark pools are private exchanges where institutional investors (hedge funds, pension funds, banks) execute large block trades without displaying orders on public exchanges. About 40% of all U.S. equity trading volume now occurs in dark pools. Why it matters: when a fund needs to buy 5 million shares of AAPL, doing it on the open market would drive the price up before they finish buying. Dark pools let them execute without tipping off other traders. For retail traders, dark pool data is a window into what the 'smart money' is doing BEFORE it shows up in price action. A surge in dark pool buying often precedes a move up; heavy selling can precede a drop. SIBT tracks dark pool prints via Unusual Whales to help you see institutional positioning in real-time.",
    example:
      "Large dark pool prints in NVDA at $120 preceded a 15% rally over 3 weeks — institutions were accumulating before earnings",
    relatedTerms: ["Dark Pool", "Block Trade", "Sweep Order", "Options Flow", "13F Filing"],
    difficulty: "intermediate",
  },
  {
    term: "Insider Trading Intelligence",
    category: "Deep Dives",
    definition:
      "Company insiders (CEOs, CFOs, board members, 10%+ shareholders) are required to report their trades within 2 business days via SEC Form 4. While insiders can't trade on material non-public information (MNPI), their trades still carry signal value because they know their company better than anyone. Research shows: insider BUYING is a stronger signal than selling (selling can be for personal reasons — taxes, diversification, home purchase). Cluster buying (multiple insiders buying in the same period) is the strongest signal. Insider buying during market downturns is especially bullish — they're putting their own money in when others are panicking. SIBT scans 25+ major stocks for insider activity patterns and classifies signals from HEAVY_SELLING to HEAVY_BUYING.",
    example:
      "JPMorgan CEO Jamie Dimon bought $26M in JPM stock in Feb 2016 near market lows — the stock rallied 30% over the next year",
    relatedTerms: ["Form 4", "13F Filing", "Dark Pool"],
    difficulty: "intermediate",
  },
  {
    term: "Congressional Trading & the STOCK Act",
    category: "Deep Dives",
    definition:
      "Members of Congress are legally required to disclose stock trades within 45 days under the STOCK Act (Stop Trading on Congressional Knowledge Act, 2012). However, the system has serious problems: the 45-day delay means trades are often reported long after they could be useful; enforcement is weak (fines are just $200 for late filings); and members of Congress routinely outperform the market. Studies show Congress members' portfolios beat the S&P 500 by 6-12% annually. They sit on committees with access to non-public policy information — upcoming regulations, defense contracts, healthcare policy changes — that directly affects stock prices. Some notable examples: multiple senators sold stocks before the COVID crash in early 2020 after receiving classified briefings. The ethics debate is ongoing: critics argue this is legalized insider trading; defenders say members need to be able to manage personal finances. Several bills to ban congressional stock trading have been proposed but none have passed. SIBT tracks these disclosures so you can see what Congress is buying and selling.",
    example:
      "In Jan 2020, Sen. Burr sold $1.7M in stocks after a classified COVID briefing — weeks before the market crashed 34%",
    relatedTerms: ["Form 4", "13F Filing", "Insider Trading Intelligence"],
    difficulty: "beginner",
  },
  {
    term: "13F Filings: Following the Smart Money",
    category: "Deep Dives",
    definition:
      "Every institutional investor managing $100M+ must file a 13F with the SEC quarterly, disclosing their U.S. equity holdings. This covers ~5,000 institutions including hedge funds (Bridgewater, Citadel, Renaissance), mutual funds (Vanguard, BlackRock), and pension funds. The filing deadline is 45 days after quarter-end, so data is delayed — but still valuable for identifying long-term positioning trends. Key signals to watch: new positions (what are top funds initiating?), increased stakes (doubling down = conviction), exits (what are they dumping?), and consensus picks (multiple top funds buying the same stock). Caveats: 13Fs only show long equity positions — not shorts, options, or international holdings. A fund might show a large long position but hedge it with puts not visible in the filing. SIBT tracks 20 curated top-tier filers including Buffett, Dalio, Ackman, and Druckenmiller.",
    example:
      "Buffett's Berkshire 13F showing a new $4B Apple position in 2016 — AAPL went up 500% over the next 5 years",
    relatedTerms: ["13F Filing", "Dark Pool", "Form 4", "Insider Trading Intelligence"],
    difficulty: "intermediate",
  },
  {
    term: "Earnings Season & Market Impact",
    category: "Deep Dives",
    definition:
      "Earnings season occurs four times a year when publicly traded companies report quarterly financial results. It's the single biggest driver of individual stock moves — stocks can gap 10-20% in either direction on earnings surprises. Key metrics to watch: EPS (earnings per share) vs analyst estimates, revenue vs estimates, forward guidance (more important than the beat/miss), and management commentary on macro conditions. The market doesn't just react to whether a company beat or missed — it reacts to the MAGNITUDE of the surprise and the quality of forward guidance. A company can beat estimates but drop if guidance is weak. IV crush is common after earnings: implied volatility spikes before the event and collapses after, destroying option premium regardless of direction. SIBT tracks 80+ major stocks across 10 sectors with pre/post-market timing and AI-generated earnings summaries.",
    example:
      "NVDA beat EPS by 22% in Q3 2024 but the stock barely moved — because the beat was already priced into the 200%+ run-up",
    relatedTerms: ["EPS (Earnings Per Share)", "Revenue", "IV Crush", "Implied Volatility (IV)", "P/E Ratio"],
    difficulty: "beginner",
  },
  {
    term: "Macro Indicators & What They Mean for Trading",
    category: "Deep Dives",
    definition:
      "Macroeconomic indicators are data releases that describe the health of the overall economy. They drive interest rate expectations, which drive asset prices. The most market-moving indicators: CPI (inflation) — higher than expected = hawkish Fed = stocks down; Jobs Report (NFP) — strong jobs = economy healthy but may delay rate cuts; GDP — broad economic growth measure; ISM Manufacturing — leading indicator of economic activity; FOMC Meetings — the Fed's interest rate decisions and forward guidance. The yield curve (2-year vs 10-year Treasury spread) is a powerful recession predictor: when it inverts (2Y > 10Y), a recession typically follows within 12-18 months. The Dollar Index (DXY) affects multinational earnings and emerging markets. SIBT pulls live data from FRED (Federal Reserve Economic Data) for all major indicators and incorporates them into the Market Quality Score.",
    example:
      "The 2s/10s yield curve inverted in July 2022 — 18 months later, recession fears peaked and the market had already bottomed",
    relatedTerms: ["Market Cycle", "Bear Market", "Recession", "VIX"],
    difficulty: "intermediate",
  },
  {
    term: "Backtesting: Proving Your Edge",
    category: "Deep Dives",
    definition:
      "Backtesting is applying a trading strategy to historical data to see how it would have performed. It answers the question: does this actually work? A good backtest shows win rate, average win/loss, max drawdown, Sharpe ratio, and total return vs a benchmark (usually buy-and-hold SPY). Critical pitfalls to avoid: survivorship bias (only testing stocks that still exist today), lookahead bias (using information that wasn't available at the time), curve fitting (over-optimizing parameters to fit historical data perfectly — which fails on new data), and ignoring transaction costs and slippage. The best backtests use out-of-sample validation: optimize on one period, test on a completely different period. SIBT's backtester simulates the Market Quality Score strategy against buy-and-hold SPY over 3, 6, and 12-month periods to show whether signal-following adds value.",
    example:
      "SIBT backtest: following the signal (trade on green, sit out on red) produced 12.3% return vs 8.1% buy-and-hold over 12 months with lower max drawdown",
    relatedTerms: ["Market Cycle", "Drawdown", "Kelly Criterion", "Traffic Light Verdict"],
    difficulty: "intermediate",
  },
  {
    term: "COT Report: What the Biggest Traders Are Doing",
    category: "Deep Dives",
    definition:
      "The Commitments of Traders (COT) report is published weekly by the CFTC (Commodity Futures Trading Commission) every Friday at 3:30 PM ET, based on data from the prior Tuesday. It breaks down futures positioning into three groups: Commercials (hedgers like airlines hedging oil, farmers hedging crops — they trade to reduce business risk, not to speculate), Large Speculators (hedge funds, CTAs — they trade for profit and are typically trend-followers), and Small Speculators (retail traders — historically the worst at timing). The key insight: when commercials are at extreme long positions, it's often bullish (they know their market); when large speculators are at extreme positions, it's often a contrarian signal (they tend to be wrong at extremes). The COT Index measures current positioning as a percentile of the last 3 years — readings above 90 or below 10 signal extremes. SIBT tracks 10 key contracts: S&P 500, Nasdaq, Dow, Gold, Silver, Crude Oil, Natural Gas, Euro, 10Y Treasury, and VIX futures.",
    example:
      "In Oct 2022, large speculators were net short S&P 500 futures at a 3-year extreme — the market bottomed and rallied 25% over the next year",
    relatedTerms: ["Market Maker", "CTA (Commodity Trading Advisor)", "VIX", "Market Cycle"],
    difficulty: "advanced",
  },
  {
    term: "Options Flow: Reading Institutional Bets",
    category: "Deep Dives",
    definition:
      "Options flow analysis tracks large, unusual options trades to identify institutional bets before they play out in the stock price. Key types: Sweeps (aggressive orders that sweep across multiple exchanges for immediate fill — indicates urgency), Blocks (privately negotiated large trades, typically $1M+), and unusual volume (options volume exceeding 3x average open interest). What to look for: ask-side sweeps = buying (bullish for calls, bearish for puts); bid-side = selling. Large premium trades ($500K+) on short-dated options often signal someone knows something (upcoming catalyst, M&A, earnings surprise). The put/call ratio provides macro sentiment — extreme readings (>1.5 or <0.5) are contrarian indicators. GEX (gamma exposure) affects market behavior: positive GEX = market makers dampen moves (low vol regime); negative GEX = they amplify moves (high vol, potential for violent swings). SIBT streams options flow via Unusual Whales with filtering by premium size, type, and sentiment.",
    example:
      "Days before the AVGO-VMW merger announcement, unusual call sweeps appeared in VMW with 10x normal volume — classic informed positioning",
    relatedTerms: ["Options Flow", "Sweep Order", "Dark Pool", "GEX (Gamma Exposure)", "Put/Call Ratio (P/C)", "Implied Volatility (IV)"],
    difficulty: "advanced",
  },
];

export const GLOSSARY_CATEGORIES = [
  ...new Set(GLOSSARY.map((g) => g.category)),
];
