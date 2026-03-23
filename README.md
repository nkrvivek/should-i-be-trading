# SIBT — Should I Be Trading?

A Bloomberg Terminal-style market dashboard that answers one question at a glance: **should I be trading right now?**

Self-service platform where you bring your own brokerage credentials and API keys. No investment advice — just the tools, data, and an AI confidant to help you make informed decisions.

## What It Does

```
Market Regime  ──>  Traffic Light Verdict  ──>  TRADE / CAUTION / NO TRADE
     |                     |
     |              VIX Regime Signal
     |          (BUY_AGGRESSIVE / BUY / HOLD / SELL)
     |
     +── CRI (Crash Risk Index, 0-100)
     +── VIX / VVIX / COR1M / RVOL
     +── Insider Activity (SEC Form 4)
     +── Crash Trigger Conditions
     +── 20-Session History Charts
```

**Traffic Light** decides whether to trade based on:
- CRI score (4 components: VIX, VVIX, Correlation, Momentum)
- VIX regime (>= 45 buy aggressive, >= 30 buy, <= 14 sell)
- Insider trading signals (heavy selling reduces confidence, buying increases it)
- Market hours (ET timezone aware)
- Crash trigger conditions (SPX < 100d MA, RVOL > 25%, COR1M > 60)

## Key Features

### Regime Dashboard
- Traffic light verdict with confidence scoring
- CRI gauge (0-100) with component breakdown
- VIX regime signal (historically proven mean-reversion strategy)
- Crash trigger monitoring with condition-by-condition breakdown
- 20-session regime history charts

### Insider Trading Intelligence
- **Per-ticker scanner** — Enter any ticker to scan SEC Form 4 filings via Finnhub
- **Market-wide overview** — Scan 50+ major stocks for aggregate insider buying/selling patterns
- Signal classification: HEAVY_SELLING / NET_SELLING / NEUTRAL / NET_BUYING / HEAVY_BUYING
- Score bar (-100 to +100) with transaction-level detail
- Insider signals feed directly into verdict confidence scoring

### Watchlist Management
- Create, name, and manage multiple watchlists
- Add/remove tickers with one click
- Persistent storage (Supabase for auth users, localStorage for local dev)
- Default watchlist with major ETFs and mega-cap stocks

### AI-Powered Analysis
- **Daily Briefing** — Claude-generated market summary with full regime context
- **Claude Chat** — Ask questions about market conditions, get analysis grounded in live data
- **Exa Research** — Web research for any ticker or topic
- Markdown-formatted responses with proper rendering

### Educational Tooltips
- Hover any metric for a plain-English explanation
- "Why it matters" context for every data point
- Current reading interpretation based on historical ranges
- Visual percentile bar showing where the value falls

### Signal History Timeline
- Tracks every verdict change with timestamp
- Shows CRI score and VIX at each signal change
- Persistent across sessions

## Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Traffic light, CRI gauge, regime strip, insider activity, watchlists, daily briefing, signal history |
| **Terminal** | Multi-panel Bloomberg layout: real-time watchlist, dark pool flow, options flow, portfolio, orders |
| **Macro** | Yield curve (FRED), economic calendar (Finnhub), macro indicators |
| **Analysis** | Claude AI chat with regime context, Exa research feed |
| **Alerts** | Configurable triggers with browser push notifications |
| **Learn** | Searchable glossary of every trading term and metric |
| **Settings** | API key management, brokerage connection, theme, profile |
| **Pricing** | One-time purchase tiers (free / pro / enterprise) |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  SIBT (Vite + React 19 + TypeScript)     port 5173     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Dashboard │  │Terminal  │  │Analysis  │  ...          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────┴──────────────┴──────────────┴────┐              │
│  │  Hooks: usePrices, useRegime,         │              │
│  │  useInsiderTrading, usePortfolio, ... │              │
│  └────┬──────────────┬──────────────┬────┘              │
│       │              │              │                    │
│  Vite Proxy      WebSocket      Supabase                │
│  /api/* ─┐       /ws ────┐      Edge Fns                │
└──────────┼───────────────┼──────────────────────────────┘
           │               │
           ▼               ▼
┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
│ Radon FastAPI│  │ IB WS Relay    │  │ Supabase         │
│ port 8321    │  │ port 8765      │  │ Auth + DB + Vault│
│              │  │                │  │ Edge Functions    │
│ 19 endpoints │  │ Batched prices │  │ FRED, Finnhub,   │
│ IB pool, UW  │  │ 100ms flush    │  │ SEC EDGAR        │
└──────────────┘  └────────────────┘  └──────────────────┘
           │               │
           ▼               ▼
    ┌─────────────┐  ┌──────────┐  ┌──────────┐
    │ IB Gateway  │  │ UW API   │  │ Finnhub  │
    │ port 4001   │  │          │  │ (free)   │
    └─────────────┘  └──────────┘  └──────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite 8, React 19, TypeScript 5.9, Tailwind CSS 4 |
| State | Zustand 5 |
| Charts | D3 7 |
| Auth | Supabase Auth (email + Google) |
| Database | Supabase Postgres (RLS) |
| Backend Proxy | Supabase Edge Functions (Deno) |
| Market Data | Interactive Brokers (via Radon), Unusual Whales |
| Free Data | FRED, Finnhub (insider trades, calendar), SEC EDGAR |
| AI | Anthropic Claude, Exa Search |
| Testing | Vitest, Testing Library |

## Quick Start

### Prerequisites

- Node.js 20+
- [Radon](https://github.com/joemccann/radon) running locally (FastAPI on :8321, WS relay on :8765)
- IB Gateway connected (optional — degrades gracefully)

### Setup

```bash
git clone https://github.com/nkrvivek/should-i-be-trading.git
cd should-i-be-trading
npm install
cp .env.example .env
```

Edit `.env` with your keys:

```bash
# Required for auth features (optional for local dev)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Optional — for local dev without Supabase
VITE_ANTHROPIC_API_KEY=
VITE_EXA_API_KEY=
VITE_FINNHUB_API_KEY=    # Free at https://finnhub.io/register
```

### Run

```bash
# Start Radon first (in the radon directory)
npm run dev  # Starts Next.js :3000, FastAPI :8321, WS relay :8765

# Then start SIBT
cd should-i-be-trading
npm run dev  # Starts on http://localhost:5173
```

### Test

```bash
npm test        # Run all tests
npm run build   # Production build
```

## Data Sources

### Included Free (no key required or server-side keys via Supabase)

| Source | Data | Cost |
|--------|------|------|
| FRED | Yield curves, GDP, CPI, unemployment, fed funds rate | Free |
| Finnhub | Economic calendar, insider trades, ESG, earnings | Free (60 calls/min) |
| SEC EDGAR | 13F filings, Form 4 insider trades | Free |

### Bring Your Own Key (user provides in Settings)

| Source | Data | Required For |
|--------|------|-------------|
| Interactive Brokers | Real-time quotes, portfolio, orders, options | Terminal, Portfolio |
| Unusual Whales | Dark pool flow, options flow, sweeps, ratings | Scanner, Dark Pool |
| Anthropic Claude | AI-powered market analysis | Analysis, Daily Briefing |
| Exa | Web research, company analysis | Research panel |
| Finnhub | Insider trading, economic calendar | Insider Activity panel |

## Feature Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|-----------|
| Regime Dashboard | Yes | Yes | Yes |
| Macro Dashboard | Yes | Yes | Yes |
| Insider Activity | Yes | Yes | Yes |
| Watchlists | 1 / 10 tickers | Unlimited | Unlimited |
| Terminal | — | Yes | Yes |
| AI Analysis | — | Yes | Yes |
| Dark Pool Scanner | — | Yes | Yes |
| Alerts | — | Yes | Yes |
| Backtester | — | Yes | Yes |
| Automation | — | — | Yes |

## VIX Regime Signal

Based on the historically proven VIX mean-reversion strategy:

| VIX Level | Signal | Action |
|-----------|--------|--------|
| >= 45 | BUY AGGRESSIVE | Extreme fear = maximum equity opportunity |
| >= 30 | BUY STOCKS | Elevated fear = favorable equity entry |
| 14 - 30 | HOLD / NORMAL | Standard position management |
| <= 14 | SELL / TAKE PROFITS | Complacency historically precedes corrections |

## Insider Trading Signals

SEC Form 4 filings via Finnhub, classified over a 90-day window:

| Score Range | Signal | Meaning |
|-------------|--------|---------|
| +40 to +100 | HEAVY BUYING | Strong bullish — insiders are accumulating |
| +10 to +39 | NET BUYING | Mild bullish — more buying than selling |
| -9 to +9 | NEUTRAL | Balanced activity |
| -39 to -10 | NET SELLING | Mild bearish — more selling than buying |
| -100 to -40 | HEAVY SELLING | Strong bearish — insiders are exiting |

Insider signals adjust the traffic light confidence score: heavy selling reduces confidence by up to 15 points, heavy buying increases it by up to 10 points.

## Project Structure

```
src/
├── api/           # API clients (Radon, Anthropic, Exa, Finnhub)
├── components/
│   ├── ai/        # Claude chat, research panel, daily briefing
│   ├── alerts/    # Alert rules and history
│   ├── auth/      # Login, signup, auth provider
│   ├── flow/      # Dark pool feed, options flow
│   ├── insider/   # Insider activity panel, market overview
│   ├── layout/    # Terminal shell, panel grid, status bar
│   ├── macro/     # Yield curve, economic calendar, indicators
│   ├── portfolio/ # Positions, orders
│   ├── regime/    # Traffic light, CRI gauge, component bars
│   ├── settings/  # API keys, brokerage config
│   ├── shared/    # Badge, MonoValue, LiveBadge, InfoTooltip
│   └── watchlist/ # Price grid, watchlist manager
├── hooks/         # usePrices (WS), useRegime, useInsiderTrading, ...
├── lib/           # Traffic light, format, market hours, metric defs, markdown
├── pages/         # Dashboard, Terminal, Macro, Analysis, Alerts, Settings, Legal
└── stores/        # Zustand (app, auth)

supabase/
├── migrations/    # SQL schema (profiles, credentials, watchlists, alerts)
└── functions/     # Edge functions (proxy-uw, proxy-anthropic, fred, finnhub, ...)
```

## Disclaimer

SIBT is an analytical tool that provides market data visualization, regime analysis, and portfolio tracking capabilities. It does **not** provide investment advice, recommendations, or financial planning services.

All trading and investment decisions are made solely by the user. SIBT is not a registered investment adviser, broker-dealer, or financial planner. Past performance does not guarantee future results. Trading involves substantial risk of loss.

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.
