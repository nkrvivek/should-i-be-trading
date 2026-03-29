<div align="center">

# SIBT — Should I Be Trading?

### Institutional-grade trading intelligence for retail traders

[![Live](https://img.shields.io/badge/LIVE-sibt.ai-05AD98?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTQgMjFjMC00IDQtNyA4LTdzOCAzIDggNyIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://sibt.ai)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-148_passing-05AD98?style=for-the-badge&logo=vitest&logoColor=white)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](tsconfig.json)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](package.json)

**One question. One score. One verdict.**

Computes a proprietary Market Quality Score from VIX, trend structure, sector breadth, momentum, and macro data. Delivers a clear traffic light: **TRADE** | **CAUTION** | **NO TRADE**.

Connect your brokerage in 30 seconds. No API keys needed.

[**Get Started**](https://sibt.ai) · [**Features**](https://sibt.ai/features) · [**Pricing**](https://sibt.ai/pricing) · [**Glossary**](https://sibt.ai/learn)

---

</div>

## Key Features

**Scoring & Regime Analysis**
- Market Quality Score (0-100) from 5 categories: Volatility, Momentum, Trend, Breadth, Macro
- SIBT Score — proprietary 1-10 composite stock rating across Technical, Fundamental, Sentiment, and Options signals
- SIBT Earnings Intelligence — earnings score, historical beat/miss patterns, post-earnings price action analysis with AI summaries
- Market Regime & Fragility Monitor — 3 pillars, 8 signals, composite market state classification
- Financial Stress Indicator (FSI) — HYG/TLT ratio vs volatility and credit spreads
- Signal Backtester — compare signal-following vs buy-and-hold over 90 simulated days

**Portfolio & Brokerage**
- SnapTrade integration (25+ brokers, one-click connect): Schwab, Fidelity, Robinhood, E\*Trade, Webull, Interactive Brokers, Alpaca, Tradier, Vanguard, and more
- Multi-brokerage support — connect multiple brokers simultaneously, combined portfolio view, cross-broker wash sale detection
- CSV portfolio upload with multi-broker auto-detection (Schwab, Fidelity, TD, Robinhood, E\*Trade, Webull, Vanguard) and security sanitization pipeline
- Strategy Analyzer: covered calls, protective puts, collars, iron condors, butterflies, spreads — 19 strategies, risk-ranked
- Strategy-to-Execution flow — execute strategies directly from suggestions with risk disclaimers, broker selection, and multi-leg order placement
- Options chain with live Greeks (Black-Scholes), one-click trade entry
- Wash Sale Monitor with 30-day lookback and stock-to-option detection

**Market Intelligence**
- Technical signal overlays: RSI, MACD, EMA/SMA crossovers, Bollinger Bands, Stochastic, ATR, support/resistance
- Dark pool flow and options flow via Radon integration
- Insider trading scanner (SEC Form 4) with 25-stock market-wide overview
- Congressional trading (STOCK Act disclosures)
- 13F institutional filings from 20 top hedge funds
- News sentiment feed with per-stock scoring
- CFTC Commitments of Traders (COT) dashboard
- Earnings calendar (80+ stocks, 10 sectors) with AI summaries and past-earnings analysis
- Stock fundamentals: income statements, balance sheets, ratios, analyst estimates
- Macro indicators: yield curve, economic calendar, FRED data

**AI-Powered**
- Portfolio-aware AI chat (Claude) grounded in live positions and market context — with rate limiting and usage tracking per tier
- AI stock screener — natural language queries against 70+ tickers
- AI earnings summaries — one-click TLDR of earnings call transcripts
- Daily market briefing with full regime context (auto-populated from free market data, enhanced with AI)

**Education & Alerts**
- 82-term searchable glossary with 9 deep-dive articles
- Alert system with real-time delivery (verdict changes, VIX spikes, insider surges)
- Push notifications via Service Worker (PWA)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite, React 19, TypeScript |
| **State** | Zustand (persisted stores) |
| **Auth** | Supabase Auth (Google, X/Twitter OAuth) |
| **Database** | Supabase Postgres (RLS) |
| **Edge Functions** | Supabase Deno (20+ functions) |
| **Market Data** | FRED, Finnhub, FMP, SEC EDGAR |
| **Brokerage** | SnapTrade (25+ brokers), Alpaca, Interactive Brokers, Tradier |
| **AI** | Anthropic Claude, Exa Search |
| **Charts** | TradingView (free embed) |
| **Payments** | Stripe (subscriptions + trials) |
| **Hosting** | Cloudflare Pages |
| **Testing** | Vitest (148 unit tests) + Playwright (20 E2E specs) |

<div align="center">

### Powered By

[![FRED](https://img.shields.io/badge/FRED-Federal_Reserve-003366?style=flat-square)](https://fred.stlouisfed.org)
[![Finnhub](https://img.shields.io/badge/Finnhub-Market_Data-000?style=flat-square)](https://finnhub.io)
[![FMP](https://img.shields.io/badge/FMP-Fundamentals-1a73e8?style=flat-square)](https://financialmodelingprep.com)
[![Anthropic](https://img.shields.io/badge/Anthropic-Claude_AI-d4a574?style=flat-square)](https://anthropic.com)
[![SnapTrade](https://img.shields.io/badge/SnapTrade-25+_Brokers-05AD98?style=flat-square)](https://snaptrade.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_+_DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com)

</div>

## Getting Started

```bash
git clone https://github.com/nkrvivek/should-i-be-trading.git
cd should-i-be-trading
npm install
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm run dev     # http://localhost:5173
npm run build   # Production build
```

## Supported Brokerages

Connect in 30 seconds via SnapTrade — no API keys needed:

> **Schwab** · **Fidelity** · **Robinhood** · **E\*Trade** · **Webull** · **Vanguard** · **Interactive Brokers** · **Chase** · **Wells Fargo** · **Alpaca** · **Tradier** · **Empower** · and 20+ more

## Testing

```bash
npm test                  # 148 unit tests (Vitest)
npx playwright test       # 20 E2E specs (Playwright, headless)
npm run test:e2e:ui       # Interactive Playwright UI
npm run test:e2e:headed   # Watch in browser
```

Unit tests cover: payoff calculations, order mapping, risk checks, execution engine, strategy analyzer, portfolio risk scoring, risk filtering, market scoring, and formatting utilities.

E2E tests cover: auth flows, CSV upload, strategy execution, multi-brokerage, settings, alerts, public pages, and responsive layout.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  SIBT (Vite + React 19 + TypeScript + Zustand)               │
│                                                              │
│  Pages: Dashboard, Signals, Research, Strategies,            │
│         Terminal, Settings, Learn, Execution                  │
│                                                              │
│  Hooks ─── Edge Functions ─── External APIs                  │
└──────┬───────────┬────────────┬───────────┬──────────────────┘
       │           │            │           │
   Finnhub      FRED       Supabase    SnapTrade
   (quotes,    (VIX, SP500, (Auth, DB,  (Brokerage
    insider,    yields,      Edge Fns,   connections)
    earnings)   macro)       Stripe)
                                │
                          Claude / Exa
                          (AI analysis)
```

## Credits

- [Radon](https://github.com/joemccann/radon) — dark pool flow analysis
- [Anthropic Claude](https://anthropic.com) — AI analysis
- [Exa](https://exa.ai) — web research
- [SnapTrade](https://snaptrade.com) — brokerage integrations
- [TradingView](https://tradingview.com) — chart widgets
- [Supabase](https://supabase.com) — auth, database, edge functions
- [FRED](https://fred.stlouisfed.org) — Federal Reserve economic data
- [Finnhub](https://finnhub.io) — market data API

## Disclaimer

> SIBT is an analytical tool for market data visualization, regime analysis, and portfolio tracking. It does **not** provide investment advice, recommendations, or financial planning services. All trading decisions are made solely by the user. Trading involves substantial risk of loss.

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.

---

<div align="center">

**[sibt.ai](https://sibt.ai)** · Built for retail traders who refuse to trade blind.

</div>
