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
     +── Crash Trigger Conditions
     +── 20-Session History Charts
```

**Traffic Light** decides whether to trade based on:
- CRI score (4 components: VIX, VVIX, Correlation, Momentum)
- VIX regime (>= 45 buy aggressive, >= 30 buy, <= 14 sell)
- Market hours (ET timezone aware)
- Crash trigger conditions (SPX < 100d MA, RVOL > 25%, COR1M > 60)

## Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Traffic light verdict, CRI gauge, regime strip, component bars, crash triggers, D3 history charts |
| **Terminal** | Multi-panel Bloomberg layout: real-time watchlist, dark pool flow, options flow, portfolio, orders |
| **Macro** | Yield curve (FRED), economic calendar (Finnhub), macro indicators (GDP, CPI, unemployment) |
| **Analysis** | Claude AI chat with full regime context, Exa research feed |
| **Alerts** | Configurable triggers (VIX crosses, CRI changes, regime shifts) with browser push notifications |
| **Settings** | API key management, brokerage connection, profile |

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
│  │  usePortfolio, useAlerts, ...         │              │
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
    ┌─────────────┐  ┌──────────┐
    │ IB Gateway  │  │ UW API   │
    │ port 4001   │  │          │
    └─────────────┘  └──────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite 8, React 19, TypeScript 5.9, Tailwind CSS 4 |
| State | Zustand 5 |
| Charts | D3 7 |
| Auth | Supabase Auth |
| Database | Supabase Postgres (RLS) |
| Backend Proxy | Supabase Edge Functions (Deno) |
| Market Data | Interactive Brokers (via Radon), Unusual Whales |
| Free Data | FRED, Finnhub, SEC EDGAR |
| AI | Anthropic Claude, Exa Search |
| Testing | Vitest, Testing Library |

## Quick Start

### Prerequisites

- Node.js 20+
- [Radon](https://github.com/joemccann/radon) running locally (FastAPI on :8321, WS relay on :8765)
- IB Gateway connected (optional — degrades gracefully)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/should-i-be-trading.git
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
npm test        # Run all 69 tests
npm run build   # Production build
```

## Data Sources

### Included Free (server-side keys via Supabase)

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
| Anthropic Claude | AI-powered market analysis | Analysis page |
| Exa | Web research, company analysis | Research panel |

## Feature Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|-----------|
| Regime Dashboard | Yes | Yes | Yes |
| Macro Dashboard | Yes | Yes | Yes |
| Terminal | — | Yes | Yes |
| AI Analysis | — | Yes | Yes |
| Dark Pool Scanner | — | Yes | Yes |
| Alerts | — | Yes | Yes |
| Custom Watchlists | 1 / 10 tickers | Unlimited | Unlimited |
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

## Project Structure

```
src/
├── api/           # API clients (Radon, Anthropic, Exa, free data)
├── components/
│   ├── ai/        # Claude chat, research panel
│   ├── alerts/    # Alert rules and history
│   ├── auth/      # Login, signup, auth provider
│   ├── flow/      # Dark pool feed, options flow
│   ├── layout/    # Terminal shell, panel grid, status bar
│   ├── macro/     # Yield curve, economic calendar, indicators
│   ├── portfolio/ # Positions, orders
│   ├── regime/    # Traffic light, CRI gauge, component bars
│   ├── settings/  # API keys, brokerage config
│   ├── shared/    # Badge, MonoValue, LiveBadge, Disclaimer
│   └── watchlist/ # Real-time price grid
├── hooks/         # usePrices (WS), useRegime, usePortfolio, useAlerts, ...
├── lib/           # CRI calc, traffic light, format, market hours, signals
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
