# SIBT — Should I Be Trading?

A market intelligence dashboard that answers one question: **should I be trading right now?**

Computes a proprietary SIBT Score from VIX, trend structure, sector breadth, momentum, macro data, and 15+ technical/fundamental/sentiment signals. Delivers a clear traffic light verdict: **TRADE / CAUTION / NO TRADE**.

Self-service platform. Connect your brokerage or bring your own API keys. No investment advice — just tools, data, and an AI confidant.

**Live at [sibt.ai](https://sibt.ai)**

## Key Features

**Scoring & Regime Analysis**
- Market Quality Score (0-100) from 5 categories: Volatility, Momentum, Trend, Breadth, Macro
- SIBT Score — proprietary 1-10 composite stock rating across Technical, Fundamental, Sentiment, and Options signals
- Market Regime & Fragility Monitor — 3 pillars, 8 signals, composite market state classification
- Financial Stress Indicator (FSI) — HYG/TLT ratio vs volatility and credit spreads
- Signal Backtester — compare signal-following vs buy-and-hold over 90 simulated days

**Portfolio & Brokerage**
- 7 broker integrations via SnapTrade: Schwab, E\*Trade, Webull, Fidelity, Robinhood, Interactive Brokers, Alpaca, Tradier (20+ more supported)
- CSV portfolio upload with multi-broker auto-detection and security sanitization pipeline
- Strategy analyzer: covered calls, protective puts, collars, iron condors, butterflies, spreads (19 strategies)
- Options chain with live Greeks (Black-Scholes), one-click trade entry
- Wash sale monitoring with 30-day lookback

**Market Intelligence**
- Technical signal overlays: RSI, MACD, EMA/SMA crossovers, Bollinger Bands, Stochastic, ATR, support/resistance
- Dark pool flow and options flow via Radon integration
- Insider trading scanner (SEC Form 4) with 25-stock market-wide overview
- Congressional trading (STOCK Act disclosures)
- 13F institutional filings from 20 top hedge funds
- News sentiment feed with per-stock scoring
- CFTC Commitments of Traders (COT) dashboard
- Earnings calendar (80+ stocks, 10 sectors) with AI summaries
- Stock fundamentals: income statements, balance sheets, ratios, analyst estimates

**AI-Powered**
- Portfolio-aware AI chat (Claude) grounded in live positions and market context
- AI stock screener — natural language queries against 70+ tickers
- AI earnings summaries — one-click TLDR of earnings call transcripts
- Daily market briefing with full regime context

**Education & Alerts**
- 82-term searchable glossary with deep-dive articles
- Alert system with real-time delivery (verdict changes, VIX spikes, insider surges)
- Push notifications via Service Worker (PWA)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite, React 19, TypeScript |
| State | Zustand |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase Postgres (RLS) |
| Edge Functions | Supabase Deno |
| Market Data | FRED, Finnhub, FMP, SEC EDGAR |
| Brokerage | SnapTrade, Alpaca, Interactive Brokers, Tradier |
| AI | Anthropic Claude, Exa Search |
| Charts | TradingView (free embed) |
| Payments | Stripe |
| Hosting | Cloudflare Pages |
| E2E Testing | Playwright (178 tests) |

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

## Testing

```bash
npm test                  # Unit tests (Vitest)
npx playwright test       # E2E tests (178 tests, headless)
npm run test:e2e:ui       # Interactive Playwright UI
npm run test:e2e:headed   # Watch in browser
```

E2E tests cover: navigation, CSV upload (multi-broker auto-detect, security sanitization), AI usage tracking, strategy analysis, wash sale monitoring, auth gates, trial flows, alerts, and responsive layout.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  SIBT (Vite + React 19 + TypeScript + Zustand)               │
│                                                              │
│  Pages: Dashboard, Signals, Research, Strategies,            │
│         Terminal, Settings, Learn                             │
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

SIBT is an analytical tool for market data visualization, regime analysis, and portfolio tracking. It does **not** provide investment advice, recommendations, or financial planning services. All trading decisions are made solely by the user. Trading involves substantial risk of loss.

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.
