import { useNavigate } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";

type FeatureSection = {
  title: string;
  tier: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  description: string;
  details: string[];
  mockup: string; // ASCII art mockup
};

const FEATURES: FeatureSection[] = [
  {
    title: "Traffic Light Verdict",
    tier: "FREE",
    description: "One look tells you whether market conditions favor trading today. The Crash Risk Index combines four macro signals into a single score.",
    details: [
      "CRI score 0-100 with ELEVATED/HIGH/EXTREME levels",
      "VIX term structure analysis",
      "Equity put/call ratio tracking",
      "Credit spread monitoring",
      "Realized volatility measurement",
    ],
    mockup: `┌─────────────────────────────────┐
│  VERDICT        ● CAUTION      │
│                                 │
│  CRI Score      42.4 ELEVATED  │
│  VIX            24.06          │
│  VVIX           98.30          │
│  COR1M          38.70          │
│  RVOL           15.2%          │
│                                 │
│  ▓▓▓▓▓▓▓▓░░░░░░  42/100       │
└─────────────────────────────────┘`,
  },
  {
    title: "Insider Trading Scanner",
    tier: "FREE",
    description: "Scan SEC Form 4 filings across 50+ major stocks. See when corporate insiders are buying or dumping shares, with dollar values and transaction details.",
    details: [
      "Real-time SEC Form 4 filing data",
      "Signal classification: HEAVY SELLING to HEAVY BUYING",
      "Net insider value per ticker (-$500M to +$50M)",
      "Top insider names and officer titles",
      "Filterable by period: 1 month, 3 months, 6 months",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  INSIDER MARKET OVERVIEW          [SCAN]    │
│                                              │
│  NVDA   HEAVY SELL  -$303M   Mark Stevens   │
│  APG    HEAVY SELL  -$122M   Franklin Martin│
│  APP    NET SELL     -$74M   Vivas Eduardo  │
│  AMD    NET SELL     -$16M   Su Lisa T      │
│  DELL   NET SELL     -$36M   Silver Lake LP │
│  AAPL   NEUTRAL       -$2M  Tim Cook       │
│  MSFT   NET BUY      +$12M  Satya Nadella  │
│                                              │
│  48 of 50 tickers show NET SELLING           │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Congressional Trading Tracker",
    tier: "FREE",
    description: "Track every stock trade filed under the STOCK Act by members of Congress. See what your representatives are buying and selling.",
    details: [
      "House and Senate trading disclosures",
      "Buy/sell classification with dollar amounts",
      "Party affiliation (R/D/I) color-coded",
      "Top traders and most-traded tickers",
      "Filterable by chamber and trade type",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  CONGRESSIONAL TRADING            [REFRESH] │
│                                              │
│  Rep. Pelosi (D)    NVDA   BUY   $1M-$5M   │
│  Sen. Tuberville (R) TSLA  SELL  $250K-$500K│
│  Rep. Crenshaw (R)  MSFT   BUY   $50K-$100K│
│  Sen. Ossoff (D)    GOOG   BUY   $100K-$250K│
│  Rep. Green (D)     META   SELL  $15K-$50K  │
│                                              │
│  TOP TICKERS: NVDA (8) MSFT (6) TSLA (5)   │
│  TOP TRADERS: Pelosi (12) Tuberville (9)    │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Sector Heat Map",
    tier: "FREE",
    description: "Visualize money flow across all 11 S&P 500 sectors at a glance. Spot rotation patterns instantly.",
    details: [
      "All 11 S&P sectors (XLK, XLF, XLE, XLV, etc.)",
      "Color-coded by daily change percentage",
      "Real-time updates during market hours",
      "Quick sector rotation analysis",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  SECTOR HEAT MAP                             │
│                                              │
│  ██ XLK +1.2%  ██ XLF +0.8%  ░░ XLE -0.3% │
│  ██ XLV +0.5%  ░░ XLI -0.1%  ░░ XLP -0.4% │
│  ██ XLC +0.9%  ██ XLY +0.6%  ▓▓ XLRE 0.0% │
│  ░░ XLB -0.2%  ░░ XLU -0.5%                │
│                                              │
│  Tech and Healthcare leading. Energy weak.   │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Signal Backtester",
    tier: "STARTER",
    description: "Test what would have happened if you only traded on TRADE days and sat out NO TRADE days. Uses simulated historical market quality scores over 3 months.",
    details: [
      "Simulates 90 trading days of market regime signals",
      "Compares signal-following strategy vs buy-and-hold SPY",
      "Shows trade count, win rate, and cumulative returns",
      "Risk metrics: max drawdown, Sharpe ratio",
      "Clear verdict: does the system actually add value?",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  SIGNAL BACKTESTER                 [RUN]    │
│                                              │
│  Period: 90 trading days                     │
│  TRADE signals: 42  |  NO_TRADE: 31         │
│  CAUTION: 17                                 │
│                                              │
│  Strategy    Return  MaxDD   Sharpe          │
│  Signal      +8.2%   -3.1%  1.84            │
│  Buy & Hold  +5.1%   -7.8%  0.92            │
│                                              │
│  VERDICT: Signal strategy outperformed       │
│  by +3.1% with 60% less drawdown.           │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Push Notifications",
    tier: "STARTER",
    description: "Get browser push alerts when market conditions change. Never miss a regime flip, VIX spike, or insider surge.",
    details: [
      "Verdict change alerts (TRADE to NO TRADE)",
      "VIX spike notifications (>25, >30, >35)",
      "Insider buying surge detection",
      "Earnings surprise alerts (beat/miss)",
      "Customizable alert preferences",
      "Works on desktop and mobile (PWA)",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  NOTIFICATIONS                              │
│                                              │
│  [ON] Verdict changes                        │
│  [ON] VIX spikes (threshold: 25)            │
│  [ON] Insider buying surges                  │
│  [OFF] Earnings surprises                    │
│                                              │
│  Recent:                                     │
│  12:34 PM  VERDICT → NO TRADE (CRI 68)     │
│  11:15 AM  VIX spike to 28.4 (+12%)        │
│   9:31 AM  INSIDER: LMT +$42M net buying   │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Strategy Simulator + Options Greeks",
    tier: "STARTER",
    description: "Browse 19 curated strategies, visualize payoff profiles, load live options chains, and compute Black-Scholes Greeks per leg and net position.",
    details: [
      "Strategy library with options, stocks, ETF, and volatility strategies",
      "Regime-aware: highlights strategies matching current market signal + VIX",
      "Interactive payoff diagram with SVG charting",
      "Live options chain from Tradier with BUY/SELL buttons",
      "Black-Scholes Greeks: Delta, Gamma, Theta, Vega per leg + net",
      "DTE input for time decay calculations",
      "Real-time metrics: max profit, max loss, breakevens, risk/reward",
      "Price-at-expiry slider for what-if analysis",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  STRATEGY SIMULATOR         [LIBRARY] [SIM] │
│                                              │
│  CURRENT REGIME  CAUTION  VIX: 22           │
│  ● Covered Call    ● Iron Condor             │
│  ● Bull Call Spread  ● Long Straddle         │
│                                              │
│  SPY $500.00                                 │
│  SELL 1 PUT  475  $7.50                      │
│  BUY  1 PUT  450  $3.00                      │
│  SELL 1 CALL 525  $7.50                      │
│  BUY  1 CALL 550  $3.00                      │
│                                              │
│  MAX↑ +$900   MAX↓ -$1,600   BE $466/$534  │
│  ████████████████████████████████████████    │
│        ╱▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╲                  │
│  ─────╱                  ╲─────  $0         │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Technical Signal Overlays",
    tier: "STARTER",
    description: "Per-stock technical analysis with 10+ indicators computed from historical candle data. Auto-detected support/resistance levels and composite signal scoring.",
    details: [
      "RSI (14), MACD with crossover detection, EMA 12/26 crossover",
      "Bollinger Bands position + bandwidth visualization",
      "Stochastic oscillator, ATR with stop-loss suggestions",
      "Golden Cross / Death Cross detection",
      "Auto-detected support/resistance from price pivots",
      "Mini sparkline charts for RSI, MACD, Stochastic",
      "Multi-resolution: Daily, Weekly, 1H, 15M",
      "Composite bullish/bearish/neutral scoring",
    ],
    mockup: `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  TECHNICAL SIGNALS        SPY $502.30   \u2502
\u2502                                          \u2502
\u2502  OVERALL: BULLISH  Score: +42           \u2502
\u2502  \u2588\u2588\u2588\u2588 5 BULL  \u2592\u2592 2 NEUT  \u2591 1 BEAR     \u2502
\u2502                                          \u2502
\u2502  \u25B2 RSI (14)        58.2    Healthy       \u2502
\u2502  \u25B2 SMA 50         Above   +2.1%         \u2502
\u2502  \u25B2 MACD           Cross   Bullish       \u2502
\u2502  \u25C6 Bollinger      Mid     BW: 4.2%      \u2502
\u2502  \u25B2 EMA 12/26      Above   +0.8%         \u2502
\u2502                                          \u2502
\u2502  SUP  $495.20  -1.4%  \u2588\u2588\u2588\u2591\u2591             \u2502
\u2502  RES  $510.40  +1.6%  \u2588\u2588\u2588\u2588\u2591             \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  },
  {
    title: "SIBT Score (Proprietary Rating)",
    tier: "STARTER",
    description: "Our proprietary 1-10 composite stock rating — like a credit score for any ticker. Synthesizes 15+ real-time signals into one actionable number with full transparency into what drives the score. Institutional-grade analysis, simplified for retail traders.",
    details: [
      "Proprietary multi-factor model with weighted signal aggregation",
      "Technical (30%): momentum, relative volume, beta, analyst target upside",
      "Fundamental (35%): P/E, net margin, ROE, revenue/EPS growth, D/E, current ratio",
      "Sentiment (20%): insider buy/sell activity, net insider share accumulation",
      "Options (15%): IV percentile vs 52-week range, put/call ratio (contrarian)",
      "Full signal-level transparency — see exactly what drives each score",
      "Expandable category drilldown with contribution values (+/- per signal)",
      "Built-in methodology explainer — no black box",
      "Auto-computes on Fundamentals tab, cached 10 minutes for API efficiency",
    ],
    mockup: `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  SIBT SCORE                NVDA         \u2502
\u2502                                          \u2502
\u2502          \u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E                    \u2502
\u2502          \u2502  7.8/10  \u2502   BUY            \u2502
\u2502          \u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F                    \u2502
\u2502                                          \u2502
\u2502  Technical     8.2/10  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591       \u2502
\u2502  Fundamental   7.4/10  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591       \u2502
\u2502  Sentiment     7.0/10  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591       \u2502
\u2502  Options       8.5/10  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591       \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  },
  {
    title: "Stock Fundamentals (FMP)",
    tier: "STARTER",
    description: "Deep company research powered by Financial Modeling Prep. Full financial statements, ratios, analyst estimates, and price targets — all in the Research hub.",
    details: [
      "Company profile with sector, industry, market cap",
      "Key financial ratios (P/E, ROE, margins, D/E)",
      "Income statements and balance sheets (annual + quarterly)",
      "Analyst estimates with consensus EPS and revenue",
      "Price target range with visual bar (low/avg/high)",
      "Revenue per share, EPS, FCF per share, ROIC metrics",
    ],
    mockup: `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  FUNDAMENTALS               AAPL        \u2502
\u2502                                          \u2502
\u2502  P/E    28.4   ROE    147%  D/E   1.87  \u2502
\u2502  Margin 26.3%  Rev/s  $24   EPS   $6.73 \u2502
\u2502                                          \u2502
\u2502  PRICE TARGETS                           \u2502
\u2502  Low $165 \u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591 High $250    \u2502
\u2502                Avg $210                   \u2502
\u2502                                          \u2502
\u2502  INCOME STMT (Annual)                    \u2502
\u2502  2025  $412B  +8%  | Net $99B  +12%     \u2502
\u2502  2024  $383B  +2%  | Net $88B   +5%     \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  },
  {
    title: "13F Institutional Tracker",
    tier: "STARTER",
    description: "Follow the smart money. Track quarterly 13F-HR filings from 20 curated top hedge funds using free SEC EDGAR data.",
    details: [
      "20 top filers: Berkshire, Bridgewater, Pershing Square, Duquesne, etc.",
      "Filing history with direct SEC EDGAR links",
      "Search any institutional filer by name or CIK",
      "Two-column layout: filer list + filing detail",
      "Educational content on how to read 13F changes",
      "100% free — SEC EDGAR is public domain data",
    ],
    mockup: `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  13F TRACKER                             \u2502
\u2502                                          \u2502
\u2502  TOP FILERS        \u2502  FILING DETAIL      \u2502
\u2502  Berkshire Hathaway \u2502                     \u2502
\u2502  Bridgewater Assoc  \u2502  Berkshire Hathaway \u2502
\u2502  Pershing Square    \u2502  CIK: 0001067983   \u2502
\u2502  Duquesne Family    \u2502                     \u2502
\u2502  Appaloosa Mgmt   > \u2502  13F-HR 2025-Q4    \u2502
\u2502  Tiger Global       \u2502  13F-HR 2025-Q3    \u2502
\u2502  Citadel Advisors   \u2502  13F-HR 2025-Q2    \u2502
\u2502  Renaissance Tech   \u2502  [View on EDGAR]   \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  },
  {
    title: "News Sentiment Feed",
    tier: "STARTER",
    description: "Real-time market news with per-stock sentiment analysis from Finnhub. Track bullish/bearish momentum and media buzz around any ticker.",
    details: [
      "General market news + company-specific news",
      "Sentiment card: bullish %, bearish %, buzz ratio",
      "News score vs sector average comparison",
      "Category filters: general, forex, crypto, merger",
      "Quick ticker buttons for popular stocks",
      "Thumbnails, headlines, source, and time",
    ],
    mockup: `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  NEWS SENTIMENT            NVDA         \u2502
\u2502                                          \u2502
\u2502  Bullish  72%  Bearish  14%  Buzz 2.4x  \u2502
\u2502  News Score: 0.78  Sector Avg: 0.52     \u2502
\u2502                                          \u2502
\u2502  NVDA Hits Record High on AI Demand     \u2502
\u2502  Reuters \u2022 12:34 PM          [NVDA]     \u2502
\u2502                                          \u2502
\u2502  Nvidia Data Center Revenue Doubles      \u2502
\u2502  Bloomberg \u2022 11:15 AM        [NVDA]     \u2502
\u2502                                          \u2502
\u2502  30 articles                              \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  },
  {
    title: "CFTC/COT Dashboard",
    tier: "FREE",
    description: "Commitments of Traders data showing speculator and commercial positioning across 10 key futures contracts. See where institutional money is placed.",
    details: [
      "10 contracts: E-Mini S&P, Nasdaq, Gold, Crude, 10Y, etc.",
      "Posture classification (Heavy Long to Heavy Short)",
      "COT Index percentile rankings (0-100)",
      "Speculator vs commercial breakdown",
      "Weekly history with trend sparklines",
      "Category filters + educational content",
    ],
    mockup: `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  CFTC / COT DASHBOARD                   \u2502
\u2502                                          \u2502
\u2502  CONTRACT     POSTURE      COT INDEX     \u2502
\u2502  E-Mini S&P   LONG         \u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591  72  \u2502
\u2502  Nasdaq 100   HEAVY LONG   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591  88  \u2502
\u2502  Gold         LONG         \u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591  65  \u2502
\u2502  Crude Oil    SHORT        \u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591  28  \u2502
\u2502  10Y T-Note   NEUTRAL      \u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591  48  \u2502
\u2502  EUR/USD      HEAVY SHORT  \u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591  12  \u2502
\u2502                                          \u2502
\u2502  \u25B6 Click row for spec/commercial detail  \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  },
  {
    title: "AI Stock Screener",
    tier: "PRO",
    description: "Describe what you're looking for in plain English and let AI find matching stocks. Natural language queries filtered against live fundamental metrics.",
    details: [
      'Natural language queries: "show me tech stocks with PE under 20"',
      "Claude interprets query into structured filters",
      "Screens 70+ major tickers with live Finnhub metrics",
      "Dynamic result columns based on query context",
      "Example queries for quick exploration",
      "Powered by Claude + Finnhub fundamentals",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  AI STOCK SCREENER                           │
│                                              │
│  > show me undervalued healthcare stocks     │
│    with strong margins                       │
│                              [SCREEN]        │
│                                              │
│  TICKER  SECTOR       PE    MARGIN  DIV%    │
│  LLY    Healthcare   32.4   38.2%  0.8%    │
│  MRK    Healthcare   14.8   42.1%  2.4%    │
│  BMY    Healthcare    8.2   28.6%  4.2%    │
│  ABBV   Healthcare   15.1   35.8%  3.6%    │
│                                              │
│  4 results from 70+ tickers                  │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "AI Earnings Summaries",
    tier: "PRO",
    description: "One-click AI summary of any earnings call. Exa finds the transcript, Claude distills it into a structured breakdown you can read in 30 seconds.",
    details: [
      "TLDR, Key Numbers, Guidance, Risks, Notable Quotes",
      "3-stage pipeline: Exa search → read transcript → Claude summarize",
      "Works for any ticker on the earnings calendar",
      "Slide-out panel with loading states per stage",
      "Powered by Exa + Claude",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  EARNINGS SUMMARY — AAPL Q1 2026            │
│                                              │
│  TLDR: Revenue beat estimates by 4%.        │
│  Services hit record $26B. iPhone revenue   │
│  flat YoY but ASP up 6%.                    │
│                                              │
│  KEY NUMBERS                                 │
│  Revenue: $124.3B (est $119.5B) ✓           │
│  EPS: $2.42 (est $2.36) ✓                  │
│  Services: $26.1B (+14% YoY)               │
│                                              │
│  GUIDANCE: Q2 rev $89-93B (above est)       │
│  RISKS: China tariffs, AI capex ramp        │
│  QUOTE: "Our installed base has never       │
│  been larger" — Tim Cook                    │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Portfolio-Aware AI Chat",
    tier: "PRO",
    description: "Claude analyzes your live positions, P&L, account summary, and market context. Quick-action prompts and natural conversation about any market question.",
    details: [
      "System prompt includes full position details (ticker, structure, P&L, expiry)",
      "Account context: net liquidation, buying power, margin, daily P&L",
      "Quick-action buttons: Market Outlook, Portfolio Risk, Position Sizing, etc.",
      "Ask about any ticker, strategy, or market condition",
      "Contextual analysis using live regime + insider + sector data",
      "Powered by Claude (Anthropic)",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  DAILY BRIEFING              [GENERATE]     │
│                                              │
│  Market Conditions - March 23, 2026          │
│                                              │
│  The CRI at 42.4 signals elevated crash     │
│  risk. VIX term structure is inverted,      │
│  suggesting near-term hedging demand.       │
│  Corporate insiders across NVDA, DELL,      │
│  AMD filed significant sales this week.     │
│                                              │
│  Key watch: FOMC minutes Wednesday.         │
│  Recommendation: Reduce position sizing.    │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Dark Pool + Options Flow",
    tier: "PRO",
    description: "Surface institutional positioning from dark pool prints and unusual options activity. See what smart money is doing before it shows up in price.",
    details: [
      "Dark pool block trades and sweeps",
      "Unusual options activity scanner",
      "Put/call ratio analysis",
      "Flow alerts for significant activity",
      "Powered by Unusual Whales (user's own key)",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  DARK POOL FLOW                  [SCAN]     │
│                                              │
│  NVDA  $45.2M  BLOCK  Dark Pool  ASK-SIDE  │
│  TSLA  $12.8M  SWEEP  Options    BID-SIDE  │
│  AAPL   $8.3M  BLOCK  Dark Pool  ASK-SIDE  │
│  META   $6.1M  SWEEP  Options    ASK-SIDE  │
│                                              │
│  P/C Ratio: 1.84 (LEAN BEARISH)            │
│  Dark Pool Premium: $72M net buying         │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Multi-Panel Terminal",
    tier: "PRO",
    description: "Bloomberg-style workspace with real-time WebSocket price streaming, portfolio tracking, and order management.",
    details: [
      "Real-time bid/ask/last via WebSocket",
      "Portfolio positions with P&L",
      "Order entry and management",
      "Custom watchlists (up to 500 tickers)",
      "Requires IBKR connection",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  TERMINAL                                    │
│                                              │
│  WATCHLIST          │  PORTFOLIO              │
│  AAPL  189.42 +1.2% │  NVDA  +$12,340  +8.2% │
│  MSFT  412.30 +0.8% │  AAPL   +$3,210  +2.1% │
│  NVDA  892.10 +2.3% │  TSLA   -$1,890  -3.4% │
│  TSLA  178.50 -1.1% │                         │
│                      │  Total: +$13,660        │
│  ─────────────────── │  Day:    +$2,140        │
│  ORDERS                                      │
│  NVDA  BUY 10  LMT 885.00  PENDING          │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Automated Trading + Backtester",
    tier: "ENTERPRISE",
    description: "Define signal-to-order rules, backtest strategies, and automate execution with built-in risk controls and a kill switch.",
    details: [
      "Strategy backtester with equity curves",
      "Signal-to-order automation pipeline",
      "Daily loss limits and position caps",
      "Kill switch (instant halt)",
      "Full audit log of every automated decision",
      "Paper trading validation before live",
      "Cloud-hosted Radon instance",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  AUTOMATION                   [KILL SWITCH] │
│                                              │
│  Strategy: VIX Mean Reversion               │
│  Status: ACTIVE  |  Paper Mode: OFF         │
│                                              │
│  Rules:                                      │
│  IF VIX > 30 AND CRI < 60 THEN BUY VIX_PUT │
│  IF VIX < 18 THEN CLOSE ALL                 │
│                                              │
│  Daily P&L: +$1,240  |  Limit: $5,000      │
│  Positions: 2/5 max   |  Risk: 1.8%         │
│                                              │
│  Last 30d: +$8,420 (+4.2%)                  │
│  Sharpe: 1.84  |  Max DD: -2.1%            │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Market Regime & Fragility Monitor",
    tier: "FREE",
    description: "Institutional-grade market health analysis with three pillars: Regime, Fragility, and Trigger. Eight scored signals from free FRED and Finnhub data.",
    details: [
      "SPX vs 200DMA — long-term trend position",
      "HY Credit Spread — BofA high yield OAS",
      "2s/10s Yield Curve — recession indicator",
      "Breadth — sector participation analysis",
      "RSP/SPY Ratio — equal vs cap-weight divergence",
      "VIX Level + Term Structure — acute vol risk",
      "Composite score with market state classification",
      "Action stance: Aggressive / Normal / Hedged / Defensive / Cash",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  MARKET STATE        COMPOSITE  CONFIDENCE   │
│  Fragile / Hedged        58         90       │
│                                   [Hedged]   │
│                                              │
│  ▲ Credit spreads widening significantly     │
│  ▲ VIX term structure flattening             │
│                                              │
│  REGIME  ████████░░  62  │  40%              │
│  FRAGILITY ██████░░░  48  │  35%             │
│  TRIGGER ████░░░░░░  38  │  25%             │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Financial Stress Indicator (FSI)",
    tier: "FREE",
    description: "Four separate market signals compressed into one number: (HYG/TLT) / (Vol x HY Spread). A leading indicator for equity drawdowns.",
    details: [
      "HYG/TLT ratio — risk appetite (junk vs safe bonds)",
      "MOVE / VIX — bond and equity market volatility",
      "BAMLH0A0HYM2 — BofA high yield credit spread",
      "Rising = healthy risk appetite, low vol, tight spreads",
      "Falling = deteriorating conditions across all three",
      "Collapses before major equity selloffs (2022 pattern)",
      "Component breakdown with individual readings",
      "Historical context and risk label",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  FINANCIAL STRESS INDICATOR                  │
│  (HYG/TLT) / (Vol x HY Spread)             │
│                                      1.42    │
│  ████████████░░░░░░░░  CAUTIOUS             │
│                                              │
│  HYG    $74.20   Junk bonds                 │
│  TLT    $88.45   Treasuries                 │
│  VOL    19.2     Bond/equity vol            │
│  HY     385 bps  Credit spread              │
│                                              │
│  Rising = healthy. Falling = deterioration. │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "SIBT Earnings Intelligence",
    tier: "FREE",
    description: "Earnings score per stock with historical beat/miss patterns, post-earnings price action, and AI summaries. Know how a stock typically moves after earnings before you trade it.",
    details: [
      "Earnings score based on historical patterns",
      "Beat/miss streak tracking per ticker",
      "Post-earnings price action: 1-day, 5-day, 30-day moves",
      "Surprise magnitude analysis (EPS and revenue)",
      "AI-generated earnings summaries (Pro tier)",
      "Integrated into earnings calendar and research hub",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  EARNINGS INTELLIGENCE         NVDA         │
│                                              │
│  Earnings Score:  8.2 / 10   STRONG         │
│  Beat Streak:     6 consecutive              │
│                                              │
│  POST-EARNINGS MOVES (last 8 quarters)      │
│  Q4 '25   Beat +12%   1D: +4.2%  5D: +6.1% │
│  Q3 '25   Beat  +8%   1D: +2.8%  5D: +3.4% │
│  Q2 '25   Beat +15%   1D: +5.1%  5D: +7.8% │
│  Q1 '25   Beat  +6%   1D: -1.2%  5D: +2.0% │
│                                              │
│  Avg post-earnings 1D move: +2.7%           │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "CSV Portfolio Import",
    tier: "STARTER",
    description: "Upload your portfolio from any major broker. Auto-detects Schwab, Fidelity, TD Ameritrade, Robinhood, E*Trade, Webull, and Vanguard CSV formats with a security sanitization pipeline.",
    details: [
      "Auto-detect broker format from CSV headers",
      "Supported: Schwab, Fidelity, TD, Robinhood, E*Trade, Webull, Vanguard",
      "Security sanitization pipeline (strips PII, validates tickers)",
      "Maps broker-specific columns to unified portfolio schema",
      "Handles options positions with strike/expiry parsing",
      "Instant portfolio analysis after upload",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  CSV PORTFOLIO IMPORT          [UPLOAD]     │
│                                              │
│  Detected: Charles Schwab format            │
│  Rows: 24  |  Valid: 23  |  Skipped: 1     │
│                                              │
│  AAPL     100 shares    $189.42   +$2,340   │
│  NVDA      50 shares    $892.10  +$12,050   │
│  SPY    Jan25 500C (2)  $12.40     +$480    │
│  MSFT      75 shares    $412.30   +$1,890   │
│                                              │
│  Portfolio value: $142,680                   │
│  ✓ Sanitized  ✓ Validated  ✓ Ready          │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "SnapTrade Broker Connect",
    tier: "PRO",
    description: "One-click brokerage connection via SnapTrade. Link 25+ brokers for live portfolio sync, positions, and account data — no API keys needed.",
    details: [
      "25+ supported brokers via SnapTrade OAuth",
      "Schwab, Fidelity, Robinhood, E*Trade, Webull, Vanguard, IBKR, Alpaca, Tradier",
      "Live portfolio sync with positions and balances",
      "Account summary: net liquidation, buying power, margin",
      "Secure OAuth flow — credentials never touch SIBT servers",
      "Automatic reconnection and token refresh",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  BROKER CONNECTIONS             [+ CONNECT] │
│                                              │
│  ● Schwab          Connected   3 accounts   │
│  ● Fidelity        Connected   1 account    │
│  ○ Robinhood       Not linked               │
│                                              │
│  SCHWAB — Individual                        │
│  Net Liq:  $142,680   Buying Power: $84,200 │
│  Positions: 12   |   Day P&L: +$1,340      │
│                                              │
│  Powered by SnapTrade  |  25+ brokers       │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Strategy Analyzer (Risk-Ranked)",
    tier: "STARTER",
    description: "Analyze covered calls, protective puts, collars, iron condors, butterflies, and spreads for your actual positions. Strategies are risk-ranked based on current market conditions.",
    details: [
      "19 strategies: covered calls, protective puts, collars, spreads, condors, butterflies",
      "Risk ranking based on current VIX and market regime",
      "Per-position strategy suggestions from your portfolio",
      "Max profit, max loss, breakevens, and risk/reward ratio",
      "Interactive payoff diagrams with price slider",
      "One-click entry with live options chain data",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  STRATEGY ANALYZER         REGIME: CAUTION  │
│                                              │
│  Your Position: NVDA 50 shares @ $892       │
│                                              │
│  RISK-RANKED STRATEGIES                     │
│  1. Covered Call  930C   Risk: LOW    +$850  │
│  2. Collar  860P/930C    Risk: LOW    +$420  │
│  3. Protective Put 860P  Risk: MED    -$380  │
│  4. Bear Put Spread      Risk: MED    +$640  │
│                                              │
│  ▶ Select strategy for full payoff analysis │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Wash Sale Monitor",
    tier: "STARTER",
    description: "Automatic 30-day lookback wash sale detection across your portfolio — including stock-to-option transactions. Flags potential wash sales before they become a tax surprise.",
    details: [
      "30-day lookback window per IRS wash sale rules",
      "Stock-to-option detection (buy stock, sell option on same underlying)",
      "Cross-account detection when multiple brokers connected",
      "Flags potential wash sales with affected lots",
      "Disallowed loss calculation with cost basis adjustment",
      "Visual timeline of wash sale windows",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  WASH SALE MONITOR                          │
│                                              │
│  ⚠ 2 POTENTIAL WASH SALES DETECTED          │
│                                              │
│  AAPL — Stock → Option                      │
│  Sold 100 shares @ $185   Loss: -$1,200     │
│  Bought 2x Jan 190C within 30 days          │
│  Disallowed loss: $1,200  Adj basis: +$600  │
│                                              │
│  TSLA — Stock → Stock                       │
│  Sold 50 shares @ $170    Loss: -$800       │
│  Repurchased 50 shares @ $168 (12 days)     │
│  Disallowed loss: $800                       │
│                                              │
│  ✓ 18 other positions: No wash sales        │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Learning Academy + Glossary",
    tier: "FREE",
    description: "Free progressive academy for novice traders: guided course paths, lesson-level teaching views, simulator practice, workflow handoffs into SIBT, badge ladders, and the glossary that explains the rest of the product.",
    details: [
      "Progressive course paths with locked lessons and track-by-track unlocks",
      "Dedicated lesson viewer so users learn the concept before jumping into tools",
      "Guided lessons on calls, puts, covered calls, spreads, ETFs, forex, futures, and how to use SIBT well",
      "SIBT badge ladders across beginner, intermediate, and expert progression",
      "Streak tracking and reminder preferences for daily/weekly practice",
      "Glossary and deep dives for quick lookup and deeper reading",
      "Simulator-linked walkthroughs and direct handoffs into relevant research or trading workflows",
      "Process-based progression, not short-term P&L gamification",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  LEARN                       [ACADEMY]      │
│                                              │
│  STREAK 4d   WEEKLY GOAL 2/3   FREE         │
│                                              │
│  ACTIVE TRACK                               │
│  Options Basics   2/3 complete              │
│                                              │
│  1 LEARN   Calls, Puts, Contract Basics     │
│  2 PRACTICE Defined Risk vs Undefined Risk  │
│  3 APPLY   Open Trading Workflow            │
│                                              │
│  NEXT STEP: Buy to Open / Sell to Close     │
│  [OPEN LESSON]   [SIMULATOR]   [WORKFLOW]   │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Strategy Execution",
    tier: "PRO",
    description: "From analysis to execution in one click. Execute strategies directly from risk-ranked suggestions with broker selection, multi-leg order placement, pre-execution validation, and real-time confirmation.",
    details: [
      "One-click execution from strategy suggestions",
      "Multi-leg order placement (spreads, condors, butterflies)",
      "Broker selection when multiple brokers connected",
      "Pre-execution validation with risk disclaimers",
      "Real-time order confirmation and status tracking",
      "Risk/reward summary before every order submission",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  EXECUTE STRATEGY           NVDA            │
│                                              │
│  Iron Condor  860P/880P/920C/940C           │
│  Net Credit: $4.20  Max Risk: $1,580        │
│                                              │
│  BROKER: Schwab - Individual  [CHANGE]      │
│                                              │
│  LEGS                                       │
│  SELL 1 PUT  880  $8.40   ✓ Valid           │
│  BUY  1 PUT  860  $5.20   ✓ Valid           │
│  SELL 1 CALL 920  $7.80   ✓ Valid           │
│  BUY  1 CALL 940  $4.80   ✓ Valid           │
│                                              │
│  ⚠ Risk: Max loss $1,580 per contract       │
│  [CANCEL]              [CONFIRM EXECUTION]  │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Multi-Brokerage Portfolio",
    tier: "PRO",
    description: "Connect multiple brokers simultaneously for a unified view of all your accounts. Combined portfolio analysis, cross-broker wash sale detection, and unified strategy suggestions.",
    details: [
      "Connect Schwab, Fidelity, Robinhood, and more at the same time",
      "Combined portfolio view across all connected brokers",
      "Cross-broker wash sale detection (stock sold at one broker, repurchased at another)",
      "Unified strategy analysis across all positions",
      "Per-broker account summaries with aggregate totals",
      "Broker selection for strategy execution",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  MULTI-BROKER PORTFOLIO                     │
│                                              │
│  CONNECTED BROKERS                          │
│  ● Schwab        $142,680   3 accounts      │
│  ● Fidelity       $89,420   2 accounts      │
│  ● Robinhood      $24,300   1 account       │
│                                              │
│  COMBINED         $256,400   6 accounts     │
│  Day P&L: +$2,840  |  Open P&L: +$18,200   │
│                                              │
│  ⚠ CROSS-BROKER WASH SALE                   │
│  AAPL: Sold at Schwab, bought at Robinhood  │
│  within 30 days. Disallowed loss: $1,200    │
│                                              │
│  [MANAGE CONNECTIONS]  [COMBINED ANALYSIS]  │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Risk Profile Preferences",
    tier: "FREE",
    description: "Set your risk appetite, max acceptable loss, and target profit. Strategy suggestions and the catalog automatically filter to match your trading style and comfort level.",
    details: [
      "Three risk appetite levels: Conservative, Moderate, Aggressive",
      "Configurable max acceptable loss percentage (2%, 5%, 10%, 20%)",
      "Target profit percentage selection (5%, 10%, 20%, 50%)",
      "Strategy Analyzer filters suggestions by your risk profile",
      "Strategy Library catalog filters by complexity and risk type",
      "Persisted in local storage — your settings follow you across sessions",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  RISK PROFILE                               │
│                                              │
│  Strategies filter to match your preferences │
│                                              │
│  RISK APPETITE                               │
│  [CONSERVATIVE]  [MODERATE]  [AGGRESSIVE]   │
│                    ^^^^^^^^                  │
│  MAX ACCEPTABLE LOSS                         │
│  [2%]  [5%]  [10%]  [20%]                   │
│         ^^^                                  │
│  TARGET PROFIT                               │
│  [5%]  [10%]  [20%]  [50%]                  │
│         ^^^^                                 │
│                                              │
│  Reset to Defaults                           │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Portfolio Risk Score",
    tier: "FREE",
    description: "Real-time composite risk score analyzing your entire portfolio across five institutional-grade pillars. Get an A-F grade with actionable warnings and suggestions.",
    details: [
      "Concentration analysis — flags positions exceeding safe thresholds",
      "Sector diversification scoring across 8+ sectors",
      "Drawdown risk monitoring with user risk tolerance integration",
      "Position sizing uniformity analysis (standard deviation)",
      "Hedge detection — puts, inverse ETFs, cash-like positions",
      "Actionable suggestions to improve portfolio risk profile",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  PORTFOLIO RISK SCORE                        │
│                                              │
│     B         73/100                         │
│              Moderate risk                   │
│                                              │
│  Concentration   ▓▓▓▓▓▓▓▓░░  82             │
│  Diversification ▓▓▓▓▓▓░░░░  65             │
│  Drawdown Risk   ▓▓▓▓▓▓▓▓▓░  90             │
│  Position Sizing ▓▓▓▓▓▓░░░░  58             │
│  Hedging         ▓▓▓▓▓░░░░░  50             │
│                                              │
│  ! Low sector diversification (2 sectors)    │
│  - Add Healthcare, Energy for diversity      │
│  - Consider protective puts for downside     │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Composite Trade Score",
    tier: "FREE",
    description: "Per-ticker TRADE/CAUTION/AVOID verdict combining 9 weighted signals into one actionable score. Covers market regime, insider activity, social sentiment, sector momentum, and more.",
    details: [
      "Market quality base score from the 5-category scoring engine",
      "Regime composite and Financial Stress Indicator integration",
      "Sector ETF momentum — measures relative sector strength",
      "Stock-level score from fundamentals or cached SIBT Score",
      "Insider signal score from SEC Form 4 filing analysis",
      "Social sentiment score from StockTwits, Reddit, and FinTwit",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  COMPOSITE TRADE SCREENER                    │
│                                              │
│  Universe: 250 symbols                       │
│  TRADE: 82  CAUTION: 104  AVOID: 64         │
│                                              │
│  SYMBOL  SECTOR       VERDICT  OVERALL  CONF│
│  NVDA    Technology   TRADE      78     88% │
│  AAPL    Technology   TRADE      72     85% │
│  MSFT    Technology   CAUTION    58     82% │
│  TSLA    Consumer     AVOID      34     76% │
│                                              │
│  Click column labels to sort                 │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Day Trading Activity Monitor",
    tier: "STARTER",
    description: "Track the most active stocks, biggest movers, volume leaders, insider clusters, and FINRA short interest data in one consolidated view.",
    details: [
      "Volume leaders — stocks with highest trading volume today",
      "Biggest movers — top gainers and losers by percentage",
      "Insider clusters — tickers with multiple insider transactions",
      "FINRA short interest — short volume ratios and trends",
      "Most active stocks — combined volume and volatility ranking",
      "Real-time data from Finnhub and FINRA sources",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  DAY TRADING ACTIVITY                        │
│                                              │
│  VOLUME LEADERS                              │
│  NVDA   142M  +3.2%  | AMD    89M  +1.8%   │
│  TSLA    98M  -2.1%  | AAPL   76M  +0.4%   │
│                                              │
│  INSIDER CLUSTERS                            │
│  LMT   5 buys  +$42M net   HEAVY BUYING    │
│  DELL   3 sells -$36M net   NET SELLING     │
│                                              │
│  SHORT INTEREST                              │
│  TSLA  18.2% ratio  | GME  22.4% ratio     │
│  AMC   14.8% ratio  | RIVN 16.1% ratio     │
└──────────────────────────────────────────────┘`,
  },
  {
    title: "Social Sentiment",
    tier: "STARTER",
    description: "Unified social sentiment analysis combining StockTwits, Reddit (WallStreetBets, stocks, investing), and FinTwit data into a single scored view per ticker.",
    details: [
      "StockTwits sentiment — bullish/bearish ratios and message volume",
      "Reddit coverage — mentions across r/wallstreetbets, r/stocks, r/investing",
      "FinTwit integration — financial Twitter posts via Exa search",
      "Unified social score combining all three sources",
      "Bullish/bearish keyword analysis on Reddit posts",
      "Relevance scoring for FinTwit content quality",
    ],
    mockup: `┌──────────────────────────────────────────────┐
│  SOCIAL SENTIMENT              NVDA          │
│                                              │
│  OVERALL SCORE: 72 / 100     BULLISH        │
│                                              │
│  STOCKTWITS                                  │
│  Bullish: 68%  Bearish: 18%  Vol: 2,340     │
│                                              │
│  REDDIT  (42 mentions)                       │
│  Bullish: 28  Bearish: 8  Neutral: 6        │
│                                              │
│  FINTWIT  (8 posts)                          │
│  Relevance: 0.84  Mostly positive            │
│                                              │
│  Combined social score feeds into composite  │
└──────────────────────────────────────────────┘`,
  },
];

const TIER_COLORS: Record<string, string> = {
  FREE: "#05AD98",
  STARTER: "#60a5fa",
  PRO: "#F5A623",
  ENTERPRISE: "#8B5CF6",
};

export function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Features
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto" }}>
            Institutional-grade trading intelligence for retail traders. From free market signals to technical overlays, AI analysis, and automated execution.
          </div>
        </div>

        {FEATURES.map((feature, i) => (
          <div
            key={i}
            style={{
              marginBottom: 32,
              padding: 24,
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              display: "grid",
              gridTemplateColumns: i % 2 === 0 ? "1fr 1fr" : "1fr 1fr",
              gap: 24,
            }}
          >
            <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {feature.title}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: `${TIER_COLORS[feature.tier]}22`,
                  color: TIER_COLORS[feature.tier],
                  fontWeight: 600,
                }}>
                  {feature.tier}
                </span>
              </div>

              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
                {feature.description}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {feature.details.map((d, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
                    <span style={{ color: TIER_COLORS[feature.tier], flexShrink: 0 }}>{"\u2713"}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
              <pre style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                background: "var(--bg-panel-raised)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                padding: 16,
                margin: 0,
                overflow: "auto",
                whiteSpace: "pre",
              }}>
                {feature.mockup}
              </pre>
            </div>
          </div>
        ))}

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/learn")}
              style={{
                padding: "12px 28px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                color: "var(--signal-core)",
                border: "1px solid var(--signal-core)",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              EXPLORE FREE LEARNING
            </button>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              padding: "12px 28px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--signal-core)",
              color: "var(--bg-base)",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            START 14-DAY FREE TRIAL
          </button>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
            Free plan forever. New accounts also get a 14-day Pro trial with no card required.
          </p>
        </div>
      </div>
    </TerminalShell>
  );
}
