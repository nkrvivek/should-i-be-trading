import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PricingContent } from "./PricingPage";

export function LandingPage() {
  const navigate = useNavigate();

  // Landing page needs body scroll (global CSS sets overflow: hidden for dashboard)
  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) root.style.overflow = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (root) root.style.overflow = "";
    };
  }, []);

  return (
    <div style={{ background: "#0a0f14", color: "#e2e8f0", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* Nav */}
      <nav className="landing-nav" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: "1px solid #1e293b",
        position: "sticky",
        top: 0,
        background: "rgba(10, 15, 20, 0.95)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo-icon.svg" alt="SIBT" style={{ height: 32 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "#05AD98" }}>SIBT</span>
          <span className="landing-nav-tagline" style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#94a3b8" }}>Should I Be Trading?</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/login")} style={navBtn}>SIGN IN</button>
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={{ ...navBtn, background: "#05AD98", color: "#0a0f14", border: "1px solid #05AD98" }}>
            GET STARTED
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        textAlign: "center",
        padding: "60px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Grid background */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.3,
        }} />

        {/* Traffic light */}
        <div style={{ position: "relative", marginBottom: 40 }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "20px 16px",
            background: "#151c22",
            border: "1px solid #1e293b",
            borderRadius: 4,
          }}>
            <Light color="#E85D6C" label="NO TRADE" />
            <Light color="#F5A623" label="CAUTION" />
            <Light color="#05AD98" label="TRADE" active />
          </div>
        </div>

        <h1 className="landing-hero-heading" style={{
          position: "relative",
          fontFamily: "var(--font-mono)",
          fontSize: 48,
          fontWeight: 700,
          lineHeight: 1.2,
          maxWidth: 700,
          marginBottom: 16,
        }}>
          Should You Be Trading{" "}
          <span style={{ color: "#05AD98" }}>Right Now?</span>
        </h1>

        <p className="landing-hero-desc" style={{
          position: "relative",
          fontSize: 16,
          color: "#94a3b8",
          maxWidth: 560,
          lineHeight: 1.7,
          marginBottom: 32,
        }}>
          One dashboard. One verdict. Market regime analysis, technical signal overlays,
          earnings intelligence, institutional 13F filings, insider &amp; congressional trades,
          news sentiment, SIBT Score, multi-brokerage portfolio sync, strategy execution,
          and portfolio-aware AI.
          Combined into a simple traffic light that tells you whether the market conditions favor trading today.
        </p>

        <div className="landing-cta-row" style={{ position: "relative", display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/login")} style={ctaBtn}>
            TRY FREE
          </button>
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={ctaSecondaryBtn}>
            SEE PRICING
          </button>
        </div>

        <p style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 12, color: "#64748b", marginTop: 16 }}>
          Not investment advice. Analytical tool only.
        </p>
      </section>

      {/* Powered by */}
      <section className="landing-powered-row landing-section" style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        padding: "24px 32px",
        borderTop: "1px solid #1e293b",
        borderBottom: "1px solid #1e293b",
        flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#64748b", letterSpacing: "0.05em" }}>POWERED BY</span>
        {["FRED", "Finnhub", "FMP", "SEC EDGAR", "Anthropic Claude", "Tradier", "Exa", "Interactive Brokers", "SnapTrade"].map((name) => (
          <span key={name} style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#94a3b8" }}>{name}</span>
        ))}
        <a href="https://github.com/nkrvivek/should-i-be-trading" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#05AD98", textDecoration: "none" }}>
          GitHub
        </a>
      </section>

      {/* Supported Brokerages */}
      <section className="landing-section" style={{
        padding: "48px 32px",
        textAlign: "center",
      }}>
        <h3 style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 600,
          color: "#64748b",
          letterSpacing: "0.08em",
          marginBottom: 20,
        }}>
          SUPPORTED BROKERAGES
        </h3>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px 24px",
          maxWidth: 700,
          margin: "0 auto",
        }}>
          {["Schwab", "Fidelity", "Robinhood", "E*Trade", "Webull", "Vanguard", "Interactive Brokers", "Alpaca", "Tradier"].map((name) => (
            <span key={name} style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "#e2e8f0",
              padding: "6px 14px",
              background: "#151c22",
              border: "1px solid #1e293b",
              borderRadius: 4,
            }}>
              {name}
            </span>
          ))}
        </div>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#64748b",
          marginTop: 14,
        }}>
          25+ more via SnapTrade
        </p>
      </section>

      {/* Features */}
      <section className="landing-section" style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, textAlign: "center", marginBottom: 48 }}>
          What You Get
        </h2>
        <div className="landing-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          <FeatureCard
            title="Market Quality Score"
            description="Five-category scoring engine: Volatility (VIX), Momentum, Trend (SP500 vs 20/50/200d MAs), Sector Breadth, and Macro (10Y yield). Computes a 0-100 score with clear YES / CAUTION / NO verdict."
            tag="FREE"
          />
          <FeatureCard
            title="Technical Signal Overlays"
            description="10+ technical indicators per stock: RSI, MACD, EMA/SMA crossovers, Bollinger Bands, Stochastic, ATR. Auto-detected support/resistance levels, composite signal scoring, and sparkline charts across daily, weekly, and intraday timeframes."
            tag="STARTER"
          />
          <FeatureCard
            title="SIBT Score (Proprietary)"
            description="Our proprietary 1-10 composite stock rating — like a credit score for any ticker. Synthesizes 15+ real-time signals across Technical, Fundamental, Sentiment, and Options into one actionable number with full signal-level transparency. Institutional-grade analysis, simplified."
            tag="STARTER"
          />
          <FeatureCard
            title="Stock Fundamentals"
            description="Deep company research powered by FMP: income statements, balance sheets, financial ratios, analyst estimates, price targets with visual consensus bars. All in the Research hub Fundamentals tab."
            tag="STARTER"
          />
          <FeatureCard
            title="13F Institutional Tracker"
            description="Follow the smart money. Track 13F-HR filings from 20 top hedge funds — Buffett, Dalio, Ackman, Druckenmiller, and more. See filing history with direct SEC EDGAR links. All from free public data."
            tag="STARTER"
          />
          <FeatureCard
            title="News Sentiment Feed"
            description="Real-time market news with per-stock sentiment scoring. Bullish/bearish percentages, buzz ratios, and news scores vs sector averages. Filter by general, forex, crypto, and merger categories."
            tag="STARTER"
          />
          <FeatureCard
            title="Insider + Congressional Trading"
            description="SEC Form 4 filings for any ticker plus STOCK Act disclosures from Congress. 25-stock market scan shows aggregate insider buying and selling. See what insiders and politicians are doing with their money."
            tag="FREE"
          />
          <FeatureCard
            title="CFTC/COT Dashboard"
            description="Commitments of Traders data for 10 key contracts (ES, NQ, gold, oil, bonds, etc.). Speculator vs commercial positioning, COT Index percentiles, posture classification, and weekly trend sparklines."
            tag="FREE"
          />
          <FeatureCard
            title="Portfolio-Aware AI Chat"
            description="Claude analyzes your live positions, P&L, account summary, and market context. Quick-action prompts for Market Outlook, Portfolio Risk, Position Sizing, and more. Your AI trading confidant."
            tag="PRO"
          />
          <FeatureCard
            title="Strategy Simulator + Greeks"
            description="19 curated strategies with interactive payoff diagrams. Live options chain from Tradier with one-click BUY/SELL. Black-Scholes Greeks (Delta, Gamma, Theta, Vega) per leg and net position. DTE and IV inputs."
            tag="STARTER"
          />
          <FeatureCard
            title="Market Regime Monitor"
            description="Three-pillar institutional analysis: Regime (credit spreads, yield curve, SPX/200DMA), Fragility (breadth, RSP/SPY ratio), and Trigger (VIX, term structure). Eight signals scored 0-100 with composite market state."
            tag="FREE"
          />
          <FeatureCard
            title="AI Stock Screener"
            description={"Describe what you're looking for in plain English \u2014 \"show me tech stocks with PE under 20\" \u2014 and let Claude + Finnhub find matching stocks from 70+ major tickers."}
            tag="PRO"
          />
          <FeatureCard
            title="AI Earnings Summaries"
            description="One-click TLDR of any earnings call. Exa finds the transcript, Claude distills it into Key Numbers, Guidance, Risks, and Notable Quotes — read it in 30 seconds."
            tag="PRO"
          />
          <FeatureCard
            title="Signal Backtester"
            description="Test what would have happened if you only traded on TRADE days and sat out NO TRADE days. Simulates 3-month history using real market quality scores. Compare your strategy vs buy-and-hold SPY."
            tag="STARTER"
          />
          <FeatureCard
            title="Earnings Calendar"
            description="80+ major stocks across 10 sectors. Weekly groupings with pre/after market timing. EPS and revenue estimates with beat/miss tracking. Filter by sector, timing, and week."
            tag="FREE"
          />
          <FeatureCard
            title="Dark Pool + Options Flow"
            description="Surface institutional positioning from dark pool prints and unusual options activity via Radon integration. Connect your Interactive Brokers account for real-time portfolio and order management."
            tag="PRO"
          />
          <FeatureCard
            title="SIBT Earnings Intelligence"
            description="Earnings score per stock with historical beat/miss patterns, post-earnings price action analysis, and AI-generated summaries. See how a stock typically moves after earnings before you trade it."
            tag="FREE"
          />
          <FeatureCard
            title="CSV Portfolio Import"
            description="Upload your portfolio from any broker — Schwab, Fidelity, TD Ameritrade, Robinhood, E*Trade, Webull, or Vanguard. Auto-detects broker format with security sanitization pipeline."
            tag="STARTER"
          />
          <FeatureCard
            title="SnapTrade Broker Connect"
            description="One-click brokerage connection via SnapTrade. Link 25+ brokers including Schwab, Fidelity, Robinhood, E*Trade, Webull, Interactive Brokers, Alpaca, and Tradier. Live portfolio sync."
            tag="PRO"
          />
          <FeatureCard
            title="Strategy Analyzer (Risk-Ranked)"
            description="Analyze covered calls, protective puts, collars, iron condors, butterflies, and spreads for your actual positions. Strategies are risk-ranked based on current market regime and your portfolio context."
            tag="STARTER"
          />
          <FeatureCard
            title="Wash Sale Monitor"
            description="Automatic 30-day lookback wash sale detection across your portfolio — including stock-to-option transactions. Flags potential wash sales before they become a tax surprise."
            tag="STARTER"
          />
          <FeatureCard
            title="Strategy Execution"
            description="From analysis to execution in one click. Risk-ranked strategies with multi-leg order placement, pre-execution validation, broker selection, and real-time confirmation. Risk disclaimers built in."
            tag="PRO"
          />
          <FeatureCard
            title="Multi-Brokerage Portfolio"
            description="Connect Robinhood, Schwab, Fidelity, and more simultaneously. Cross-broker wash sale detection, combined portfolio view, and unified strategy analysis across all your accounts."
            tag="PRO"
          />
          <FeatureCard
            title="82-Term Trading Glossary"
            description="Searchable glossary with 82 trading terms and 9 deep-dive articles covering options strategies, market regimes, technical analysis, and risk management. Built-in education for every skill level."
            tag="FREE"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" style={{ padding: "80px 32px", borderTop: "1px solid #1e293b" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, textAlign: "center", marginBottom: 48 }}>
          How It Works
        </h2>
        <div className="landing-steps-row" style={{ display: "flex", justifyContent: "center", gap: 48, maxWidth: 800, margin: "0 auto" }}>
          <Step n={1} title="Sign Up" desc="14-day Pro trial, no credit card required. Free tier available permanently." />
          <Step n={2} title="Analyze" desc="Market Quality Score, technical signals, SIBT Score, earnings intelligence, insider activity, 13F filings, news sentiment, COT data, and AI briefings — all computed automatically. Import your portfolio via CSV or connect your broker." />
          <Step n={3} title="Decide" desc="Get a clear verdict: TRADE, CAUTION, or NO TRADE. Bring your own keys for advanced features." />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" data-theme="dark" className="landing-section" style={{ padding: "80px 24px", borderTop: "1px solid #1e293b" }}>
        <PricingContent />
      </section>

      {/* Footer */}
      <footer className="landing-footer" style={{
        padding: "32px",
        borderTop: "1px solid #1e293b",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        <div>
          <img src="/logo-icon.svg" alt="SIBT" style={{ height: 20, verticalAlign: "middle", marginRight: 8 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "#94a3b8" }}>SIBT</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#64748b", marginLeft: 8 }}>
            &copy; {new Date().getFullYear()} Should I Be Trading?
          </span>
        </div>
        <div className="landing-footer-links" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="mailto:hello@sibt.ai" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#05AD98", textDecoration: "none" }}>
            hello@sibt.ai
          </a>
          {[
            { to: "/terms", label: "Terms" },
            { to: "/privacy", label: "Privacy" },
            { to: "/risk", label: "Risk Disclosure" },
            { to: "/glossary", label: "Glossary" },
          ].map(({ to, label }) => (
            <a key={to} href={to} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#64748b", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

      {/* Bottom disclaimer */}
      <div className="landing-section" style={{ padding: "16px 32px", background: "#0f1519", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#475569", maxWidth: 700, margin: "0 auto", lineHeight: 1.6 }}>
          SIBT is not a registered investment adviser, broker-dealer, or financial planner. The platform provides
          market data analysis tools for informational and educational purposes only. Nothing on this platform
          constitutes investment advice, a recommendation, or a solicitation to buy or sell any security. All
          trading decisions are made solely by the user. Past performance does not guarantee future results.
          Options and derivatives trading involves substantial risk of loss and is not suitable for all investors.
        </p>
      </div>
    </div>
  );
}

function Light({ color, label, active }: { color: string; label: string; active?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: active ? color : `${color}33`,
        boxShadow: active ? `0 0 20px ${color}, 0 0 40px ${color}66` : "none",
        transition: "all 0.3s",
      }} />
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 600,
        color: active ? color : "#475569",
        letterSpacing: "0.05em",
      }}>
        {label}
      </span>
    </div>
  );
}

function FeatureCard({ title, description, tag }: { title: string; description: string; tag: string }) {
  const tagColor = tag === "FREE" ? "#05AD98" : tag === "STARTER" ? "#60a5fa" : tag === "PRO" ? "#F5A623" : "#8B5CF6";
  return (
    <div style={{
      padding: 24,
      background: "#0f1519",
      border: "1px solid #1e293b",
      borderRadius: 4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{title}</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 999,
          background: `${tagColor}22`,
          color: tagColor,
          fontWeight: 600,
        }}>
          {tag}
        </span>
      </div>
      <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{description}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "2px solid #05AD98",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 16,
        fontWeight: 600,
        color: "#05AD98",
      }}>
        {n}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: "6px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 500,
  background: "transparent",
  color: "#e2e8f0",
  border: "1px solid #1e293b",
  borderRadius: 4,
  cursor: "pointer",
  letterSpacing: "0.03em",
};

const ctaBtn: React.CSSProperties = {
  padding: "12px 28px",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  background: "#05AD98",
  color: "#0a0f14",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  letterSpacing: "0.03em",
};

const ctaSecondaryBtn: React.CSSProperties = {
  padding: "12px 28px",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  background: "transparent",
  color: "#e2e8f0",
  border: "1px solid #1e293b",
  borderRadius: 4,
  cursor: "pointer",
  letterSpacing: "0.03em",
};
