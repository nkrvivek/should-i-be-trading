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
    title: "AI Market Confidant",
    tier: "PRO",
    description: "Claude analyzes your regime data, insider signals, and market context. Generate daily briefings or ask questions about any ticker.",
    details: [
      "Daily AI-generated market briefing",
      "Ask about any ticker, strategy, or market condition",
      "Contextual analysis using live regime data",
      "Scoped to market analysis only (not general AI chat)",
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
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto" }}>
            Everything you need to make informed trading decisions. From free market signals to automated execution.
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
                  fontSize: 9,
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
                  <div key={j} style={{ display: "flex", gap: 8, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                    <span style={{ color: TIER_COLORS[feature.tier], flexShrink: 0 }}>{"\u2713"}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
              <pre style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
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
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 12 }}>
            No credit card required. All features unlocked for 14 days.
          </p>
        </div>
      </div>
    </TerminalShell>
  );
}
