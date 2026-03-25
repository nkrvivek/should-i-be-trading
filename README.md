# SIBT — Should I Be Trading?

A Bloomberg Terminal-style market dashboard that answers one question: **should I be trading right now?**

Computes a Market Quality Score (0-100) from VIX, trend structure, sector breadth, momentum, and macro data. Gives you a clear traffic light: TRADE / CAUTION / NO TRADE.

Self-service platform. Bring your own brokerage and API keys. No investment advice — just the tools, data, and an AI confidant to help you make informed decisions.

**Live at [sibt.ai](https://sibt.ai)**

## How It Works

```
FRED (VIX, SP500, 10Y, HY spread, yields)  ──┐
Finnhub (sectors, SPY, RSP, HYG, TLT)       ──┼──>  Market Quality Score (0-100)
Insider Activity (SEC Form 4)                ──┤     Regime Monitor (3 pillars, 8 signals)
Congress Trades (STOCK Act)                   ──┤     Financial Stress Indicator
AI Analysis (Claude)                          ──┘     ──>  TRADE / CAUTION / NO TRADE

Market Quality Score:  Volatility 25% | Momentum 25% | Trend 20% | Breadth 20% | Macro 10%
Regime Monitor:        Regime 40% | Fragility 35% | Trigger 25%
FSI:                   (HYG/TLT) / (Vol x HY Spread)
```

**Decision logic:**
- 80-100 → **YES** — Full position sizing, press risk
- 60-79 → **CAUTION** — Half size, A+ setups only
- Below 60 → **NO** — Preserve capital, avoid new positions

## Pages

| Page | Tier | What You Get |
|------|------|-------------|
| **Dashboard** | Free | Traffic light verdict, Market Quality Score (5 categories), sector heatmap, TradingView charts, watchlists, signal history |
| **Insider** | Free | SEC Form 4 insider trading per ticker, congressional STOCK Act trades, 25-stock market overview scan |
| **Earnings** | Free | Sector-wise earnings calendar, 80+ major stocks, pre/after market timing, EPS/revenue estimates, beat/miss tracking |
| **Regime** | Free | Market Regime & Fragility Monitor: 3 pillars, 8 signals, FSI, composite score, market state, action stance |
| **Macro** | Free | FRED yield curves, economic calendar (FRED releases + Finnhub earnings), macro indicators |
| **Strategies** | Starter | Strategy library (19 strategies) + interactive payoff visualizer with SVG charts, regime-aware highlights |
| **Terminal** | Pro | Radon integration: dark pool flow, options flow, real-time portfolio, orders, AI daily briefing, Claude chat |
| **Analysis** | Pro | Deep ticker analysis with Claude AI, Exa web research, AI stock screener (natural language) |
| **Earnings** | Free | Earnings calendar + AI earnings summaries (Pro) with one-click TLDR via Exa + Claude |
| **Learn** | Free | Searchable glossary of 35+ trading terms and metrics |
| **Settings** | Free | API key management (BYOK), theme toggle, profile |

## Key Features

### Market Quality Score
Standalone scoring engine — no paid APIs required. Uses FRED (free, unlimited) + Finnhub (free, 60/min):

| Category | Weight | Data Source |
|----------|--------|-------------|
| Volatility | 25% | VIX via FRED VIXCLS |
| Momentum | 25% | SPY daily change + sector leadership spread |
| Trend | 20% | SP500 vs 20/50/200d SMA + RSI-14 (FRED SP500) |
| Breadth | 20% | % of 11 S&P sectors positive (Finnhub quotes) |
| Macro | 10% | 10Y Treasury yield (FRED DGS10) + DXY trend |

### Market Regime & Fragility Monitor
Three-pillar institutional analysis using free FRED + Finnhub data:

| Pillar | Weight | Signals |
|--------|--------|---------|
| Regime | 40% | SPX vs 200DMA, HY credit spread (BAMLH0A0HYM2), 2s/10s yield curve, FSI |
| Fragility | 35% | Sector breadth (% positive), RSP/SPY ratio (equal vs cap-weight) |
| Trigger | 25% | VIX level, VIX term structure (spot vs 3-month) |

Market states: Strong / Risk-On, Stable / Normal, Fragile / Hedged, Stressed / Defensive, Crisis / Risk-Off

### Financial Stress Indicator (FSI)
Four signals compressed into one number:
```
FSI = (HYG/TLT) / (Vol x HY Credit Spread)
```
- **HYG/TLT** — risk appetite (junk bonds vs safe Treasuries)
- **Vol** — bond/equity market volatility (MOVE or VIX proxy)
- **HY Spread** — BofA high yield credit spread
- Rising = healthy. Falling = deterioration. Collapse precedes equity drawdowns.

### Fear & Greed Gauge
Arc gauge on the dashboard mapping Market Quality Score to sentiment zones: Extreme Fear (0-20), Fear (20-40), Neutral (40-60), Greed (60-80), Extreme Greed (80-100).

### Insider Trading Intelligence
- **Per-ticker scanner** — SEC Form 4 filings via Finnhub edge function
- **Market-wide overview** — Scan 25 major stocks for insider buying/selling patterns
- Signal classification: HEAVY_SELLING → NET_SELLING → NEUTRAL → NET_BUYING → HEAVY_BUYING
- Score bar (-100 to +100) with transaction-level detail

### Congressional Trading
- STOCK Act disclosures from US House members via RapidAPI (server-side, free for users)
- Buy/sell filter, politician badges (D/R), ticker breakdown
- Pagination, 90-day rolling window

### Earnings Calendar
- 80+ major stocks across 10 sectors (Technology, Financials, Healthcare, etc.)
- Weekly groupings with sector and timing filters
- Pre-market (BMO) / After-market (AMC) indicators
- EPS and revenue estimates with beat/miss tracking
- Powered by Finnhub earnings calendar (free tier)

### Sector Heat Map
- All 11 S&P 500 sector ETFs with color-coded performance
- Horizontal bar chart for quick rotation comparison
- Real-time quotes via Finnhub

### AI-Powered Analysis (Pro)
- **Daily Briefing** — Claude-generated market summary with full regime context
- **Claude Chat** — Ask about market conditions, grounded in live data
- **Exa Research** — Web research for any ticker or topic
- Rate-limited server key for trial users (5/day), unlimited with your own key

### TradingView Charts
- Full advanced chart embed with candlesticks and MACD
- Fullscreen expand mode for detailed technical analysis
- Symbol search, auto-adapts to light/dark theme
- No API key needed

### Strategy Simulator (Starter+)
- 19 curated strategies: options (covered call, iron condor, straddles, spreads, butterfly, collar), stocks (momentum, mean reversion, pairs), ETFs (sector rotation, dual momentum), volatility
- Interactive payoff visualizer with SVG charting
- Configurable legs: buy/sell calls, puts, stock with custom strikes and premiums
- Real-time metrics: max profit, max loss, breakevens, risk/reward ratio
- Regime-aware: highlights strategies matching current SIBT signal + VIX level
- Price-at-expiry slider for what-if analysis
- Inspired by *151 Trading Strategies* (Kakushadze & Serur, 2018)

### AI Stock Screener (Pro)
- Natural language stock screening: "show me tech stocks with PE under 20"
- Claude interprets queries into structured filters
- Screens 70+ major tickers with live Finnhub fundamental metrics
- Dynamic result columns based on query context

### AI Earnings Summaries (Pro)
- One-click AI summary of any earnings call transcript
- 3-stage pipeline: Exa search → read transcript → Claude summarize
- Structured output: TLDR, Key Numbers, Guidance, Risks, Notable Quotes
- Works for any ticker on the earnings calendar

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  SIBT (Vite + React 19 + TypeScript)                 │
│                                                      │
│  Dashboard ─ Insider ─ Earnings ─ Macro ─ Regime ─ Terminal │
│       │          │         │        │         │      │
│  ┌────┴──────────┴─────────┴────────┴─────────┴──┐   │
│  │  Hooks: useMarketScore, useRegimeMonitor,     │   │
│  │  useInsiderTrading, useEarningsCalendar, ...  │   │
│  └────┬──────────────┬──────────────┬────────────┘   │
│       │              │              │                 │
│  Finnhub Edge    FRED Edge     Supabase Auth         │
│  (quotes)       (VIX, SP500)   (Google OAuth)        │
└───────┼──────────────┼──────────────┼────────────────┘
        │              │              │
        ▼              ▼              ▼
┌────────────┐  ┌───────────┐  ┌──────────────────────┐
│ Finnhub    │  │ FRED      │  │ Supabase             │
│ (free)     │  │ (free)    │  │ Auth + DB + Edge Fns │
└────────────┘  └───────────┘  │ Stripe, Anthropic,   │
                               │ RapidAPI proxies      │
        Optional:              └──────────────────────┘
┌────────────┐  ┌────────────┐
│ Radon      │  │ IB Gateway │  (Pro tier — dark pool, portfolio, orders)
│ FastAPI    │  │ WS Relay   │
└────────────┘  └────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite 8, React 19, TypeScript 5.9 |
| State | Zustand 5 |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase Postgres (RLS) |
| Edge Functions | Supabase Deno (ES256 JWT via JWKS) |
| Free Market Data | FRED (VIX, SP500, yields), Finnhub (quotes, earnings, insider) |
| Congressional Data | RapidAPI Politician Trade Tracker (server-side) |
| AI | Anthropic Claude (BYOK or server-side rate-limited) |
| Research | Exa Search (BYOK) |
| Charts | TradingView (free embed) |
| Payments | Stripe (14-day trial, no card required) |
| Hosting | Cloudflare Pages (auto-deploy from GitHub) |

## Quick Start

```bash
git clone https://github.com/nkrvivek/should-i-be-trading.git
cd should-i-be-trading
npm install
cp .env.example .env
```

Edit `.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # JWT anon key from supabase projects api-keys

# Optional for local dev (bypasses edge functions)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_FINNHUB_API_KEY=...       # Free at https://finnhub.io/register
```

```bash
npm run dev     # http://localhost:5173
npm run build   # Production build
npm test        # Tests
```

## Data Sources

### Free (no key required — server-side keys via Supabase Edge Functions)

| Source | Data |
|--------|------|
| FRED | VIX (VIXCLS), VIX3M (VXVCLS), SP500 (250d for MAs), 10Y/2Y yield (DGS10/DGS2), HY spread (BAMLH0A0HYM2), DXY, GDP, CPI |
| Finnhub | Sector ETF quotes, RSP, HYG, TLT, insider transactions (SEC Form 4), earnings calendar, company profiles |
| RapidAPI | Congressional stock trades (STOCK Act disclosures) |
| TradingView | Advanced chart widget |

### Bring Your Own Key (Pro features)

| Source | Data |
|--------|------|
| Interactive Brokers | Real-time quotes, portfolio, orders, options chains |
| Unusual Whales | Dark pool flow, options sweeps, ratings |
| Anthropic Claude | AI market analysis, daily briefing |
| Exa | Web research |

### Signal Backtester (Starter+)
- Simulates 90 trading days of market quality scores
- Compares signal-following strategy vs buy-and-hold SPY
- Shows trade count, win rate, cumulative returns, max drawdown, Sharpe ratio
- Clear verdict: does the system actually add value?

### Push Notifications (Starter+)
- Browser push alerts via Service Worker (PWA)
- Verdict change notifications (TRADE to NO TRADE)
- VIX spike alerts (configurable thresholds)
- Insider buying surge detection
- Works on desktop and mobile

## Pricing

| Feature | Free | Starter ($12/mo) | Pro ($29/mo) | Enterprise ($79/mo) |
|---------|------|----------|-----|-----------|
| Market Quality Score | Yes | Yes | Yes | Yes |
| Regime Monitor | Yes | Yes | Yes | Yes |
| Financial Stress Indicator | Yes | Yes | Yes | Yes |
| Fear & Greed Gauge | Yes | Yes | Yes | Yes |
| Insider Trading | Yes | Yes | Yes | Yes |
| Congressional Trading | Yes | Yes | Yes | Yes |
| Earnings Calendar | Yes | Yes | Yes | Yes |
| Sector Heat Map | Yes | Yes | Yes | Yes |
| TradingView Charts | Yes | Yes | Yes | Yes |
| Macro Dashboard | Yes | Yes | Yes | Yes |
| Glossary | Yes | Yes | Yes | Yes |
| Signal Backtester | — | Yes | Yes | Yes |
| Strategy Simulator | — | Yes | Yes | Yes |
| Push Notifications | — | Yes | Yes | Yes |
| Regime Signal Interpretations | — | Yes | Yes | Yes |
| AI Briefing | 5/day | 15/day | 25/day | 100/day |
| AI Stock Screener | — | — | Yes | Yes |
| AI Earnings Summaries | — | — | Yes | Yes |
| Terminal (Dark Pool) | — | — | Yes | Yes |
| AI Analysis | — | — | Yes | Yes |
| Automated Trading | — | — | — | Yes |
| Cloud Radon Instance | — | — | — | Yes |

14-day Pro trial, no credit card required. Annual pricing: Starter $99/yr, Pro $249/yr, Enterprise $699/yr.

## Credits

Built on top of incredible open source projects:

- [Radon](https://github.com/joemccann/radon) by [@joemccann](https://github.com/joemccann) — market structure reconstruction, dark pool flow analysis
- [Anthropic Claude](https://anthropic.com) — AI analysis and market briefings
- [Exa](https://exa.ai) — web intelligence and research
- [TradingView](https://tradingview.com) — chart widgets
- [Supabase](https://supabase.com) — auth, database, edge functions
- [FRED](https://fred.stlouisfed.org) — Federal Reserve economic data
- [Finnhub](https://finnhub.io) — market data API
- [House Stock Watcher](https://housestockwatcher.com) — congressional trading data

## Disclaimer

SIBT is an analytical tool that provides market data visualization, regime analysis, and portfolio tracking capabilities. It does **not** provide investment advice, recommendations, or financial planning services.

All trading and investment decisions are made solely by the user. SIBT is not a registered investment adviser, broker-dealer, or financial planner. Past performance does not guarantee future results. Trading involves substantial risk of loss.

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.
