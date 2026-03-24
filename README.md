# SIBT — Should I Be Trading?

A Bloomberg Terminal-style market dashboard that answers one question: **should I be trading right now?**

Computes a Market Quality Score (0-100) from VIX, trend structure, sector breadth, momentum, and macro data. Gives you a clear traffic light: TRADE / CAUTION / NO TRADE.

Self-service platform. Bring your own brokerage and API keys. No investment advice — just the tools, data, and an AI confidant to help you make informed decisions.

**Live at [sibt.ai](https://sibt.ai)**

## How It Works

```
FRED (VIX, SP500, 10Y)  ──┐
Finnhub (sectors, SPY)   ──┼──>  Market Quality Score (0-100)  ──>  TRADE / CAUTION / NO TRADE
Insider Activity (SEC)   ──┤           |
Congress Trades (STOCK Act)┘     5 categories weighted:
                                 Volatility 25% | Momentum 25% | Trend 20% | Breadth 20% | Macro 10%
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
| **Macro** | Free | FRED yield curves, economic calendar (FRED releases + Finnhub earnings), macro indicators |
| **Terminal** | Pro | Radon integration: dark pool flow, options flow, real-time portfolio, orders, AI daily briefing, Claude chat |
| **Analysis** | Pro | Deep ticker analysis with Claude AI, Exa web research |
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
- Symbol search, auto-adapts to light/dark theme
- No API key needed

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  SIBT (Vite + React 19 + TypeScript)                 │
│                                                      │
│  Dashboard ─ Insider ─ Earnings ─ Macro ─ Terminal   │
│       │          │         │        │         │      │
│  ┌────┴──────────┴─────────┴────────┴─────────┴──┐   │
│  │  Hooks: useMarketScore, useInsiderTrading,    │   │
│  │  useEarningsCalendar, usePrices, ...          │   │
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
| FRED | VIX (VIXCLS), SP500 (daily closes for MAs), 10Y yield, DXY, GDP, CPI, fed funds |
| Finnhub | Sector ETF quotes, insider transactions (SEC Form 4), earnings calendar, company profiles |
| RapidAPI | Congressional stock trades (STOCK Act disclosures) |
| TradingView | Advanced chart widget |

### Bring Your Own Key (Pro features)

| Source | Data |
|--------|------|
| Interactive Brokers | Real-time quotes, portfolio, orders, options chains |
| Unusual Whales | Dark pool flow, options sweeps, ratings |
| Anthropic Claude | AI market analysis, daily briefing |
| Exa | Web research |

## Pricing

| | Free | Pro | Enterprise |
|--|------|-----|-----------|
| Market Quality Score | Yes | Yes | Yes |
| Insider Trading | Yes | Yes | Yes |
| Congressional Trading | Yes | Yes | Yes |
| Earnings Calendar | Yes | Yes | Yes |
| Sector Heat Map | Yes | Yes | Yes |
| TradingView Charts | Yes | Yes | Yes |
| Macro Dashboard | Yes | Yes | Yes |
| Glossary | Yes | Yes | Yes |
| AI Briefing | 5/day | 25/day | 100/day |
| Terminal (Dark Pool) | — | Yes | Yes |
| AI Analysis | — | Yes | Yes |
| Alerts | — | Yes | Yes |

14-day Pro trial, no credit card required.

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
