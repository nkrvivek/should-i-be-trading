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
      <nav style={{
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#05AD98" }}>SIBT</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#94a3b8" }}>Should I Be Trading?</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/login")} style={navBtn}>SIGN IN</button>
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={{ ...navBtn, background: "#05AD98", color: "#0a0f14", border: "1px solid #05AD98" }}>
            GET STARTED
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
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

        <h1 style={{
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

        <p style={{
          position: "relative",
          fontSize: 16,
          color: "#94a3b8",
          maxWidth: 560,
          lineHeight: 1.7,
          marginBottom: 32,
        }}>
          One dashboard. One verdict. Market regime analysis, financial stress indicators,
          insider activity, congressional trades, and AI analysis combined into a simple
          traffic light that tells you whether the market conditions favor trading today.
        </p>

        <div style={{ position: "relative", display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/login")} style={ctaBtn}>
            TRY FREE
          </button>
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={ctaSecondaryBtn}>
            SEE PRICING
          </button>
        </div>

        <p style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 10, color: "#64748b", marginTop: 16 }}>
          Not investment advice. Analytical tool only.
        </p>
      </section>

      {/* Powered by */}
      <section style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        padding: "24px 32px",
        borderTop: "1px solid #1e293b",
        borderBottom: "1px solid #1e293b",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#64748b", letterSpacing: "0.05em" }}>POWERED BY</span>
        {["FRED", "Finnhub", "Anthropic Claude", "Radon", "Interactive Brokers", "Exa"].map((name) => (
          <span key={name} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#94a3b8" }}>{name}</span>
        ))}
        <a href="https://github.com/nkrvivek/should-i-be-trading" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#05AD98", textDecoration: "none" }}>
          GitHub
        </a>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, textAlign: "center", marginBottom: 48 }}>
          What You Get
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          <FeatureCard
            title="Market Quality Score"
            description="Five-category scoring engine: Volatility (VIX), Momentum, Trend (SP500 vs 20/50/200d MAs), Sector Breadth, and Macro (10Y yield). Computes a 0-100 score with clear YES / CAUTION / NO verdict."
            tag="FREE"
          />
          <FeatureCard
            title="Insider + Congressional Trading"
            description="SEC Form 4 filings for any ticker plus STOCK Act disclosures from Congress. 25-stock market scan shows aggregate insider buying and selling. See what insiders and politicians are doing with their money."
            tag="FREE"
          />
          <FeatureCard
            title="Earnings Calendar"
            description="80+ major stocks across 10 sectors. Weekly groupings with pre/after market timing. EPS and revenue estimates with beat/miss tracking. Filter by sector, timing, and week."
            tag="FREE"
          />
          <FeatureCard
            title="AI Market Confidant"
            description="Claude generates a daily market briefing grounded in your regime data, VIX, sector performance, and insider signals. Chat with AI about any market question. Rate-limited free tier included."
            tag="PRO"
          />
          <FeatureCard
            title="Sector Heat Map + Charts"
            description="All 11 S&P sector ETFs with color-coded performance and bar chart comparison. TradingView advanced charts for any ticker with candlesticks and MACD. No API key needed."
            tag="FREE"
          />
          <FeatureCard
            title="Market Regime Monitor"
            description="Three-pillar institutional analysis: Regime (credit spreads, yield curve, SPX/200DMA), Fragility (breadth, RSP/SPY ratio), and Trigger (VIX, term structure). Eight signals scored 0-100 with composite market state classification."
            tag="FREE"
          />
          <FeatureCard
            title="Financial Stress Indicator"
            description="Four market signals compressed into one number: (HYG/TLT) / (Vol x HY Spread). When risk appetite is healthy, bond vol is low, and credit spreads are tight, the FSI rises. When all three deteriorate, it collapses."
            tag="FREE"
          />
          <FeatureCard
            title="Signal Backtester"
            description="Test what would have happened if you only traded on TRADE days and sat out NO TRADE days. Simulates 3-month history using real market quality scores. Compare your strategy vs buy-and-hold SPY."
            tag="STARTER"
          />
          <FeatureCard
            title="Push Notifications"
            description="Get notified when the market regime flips. Verdict changes, VIX spikes, insider buying surges, or earnings surprises — delivered to your browser. Never miss a signal shift."
            tag="STARTER"
          />
          <FeatureCard
            title="Dark Pool + Options Flow"
            description="Surface institutional positioning from dark pool prints and unusual options activity via Radon integration. Connect your Interactive Brokers account for real-time portfolio and order management."
            tag="PRO"
          />
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 32px", borderTop: "1px solid #1e293b" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, textAlign: "center", marginBottom: 48 }}>
          How It Works
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 48, maxWidth: 800, margin: "0 auto" }}>
          <Step n={1} title="Sign Up" desc="14-day Pro trial, no credit card required. Free tier available permanently." />
          <Step n={2} title="Analyze" desc="Market Quality Score, insider signals, earnings calendar, and AI briefings computed automatically." />
          <Step n={3} title="Decide" desc="Get a clear verdict: TRADE, CAUTION, or NO TRADE. Bring your own keys for advanced features." />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" data-theme="dark" style={{ padding: "80px 24px", borderTop: "1px solid #1e293b" }}>
        <PricingContent />
      </section>

      {/* Footer */}
      <footer style={{
        padding: "32px",
        borderTop: "1px solid #1e293b",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#94a3b8" }}>SIBT</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "#64748b", marginLeft: 8 }}>
            &copy; {new Date().getFullYear()} Should I Be Trading?
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="mailto:hello@sibt.ai" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#05AD98", textDecoration: "none" }}>
            hello@sibt.ai
          </a>
          {[
            { to: "/terms", label: "Terms" },
            { to: "/privacy", label: "Privacy" },
            { to: "/risk", label: "Risk Disclosure" },
            { to: "/glossary", label: "Glossary" },
          ].map(({ to, label }) => (
            <a key={to} href={to} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#64748b", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

      {/* Bottom disclaimer */}
      <div style={{ padding: "16px 32px", background: "#0f1519", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "#475569", maxWidth: 700, margin: "0 auto", lineHeight: 1.6 }}>
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
        fontSize: 11,
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
          fontSize: 9,
          padding: "2px 8px",
          borderRadius: 999,
          background: `${tagColor}22`,
          color: tagColor,
          fontWeight: 600,
        }}>
          {tag}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{description}</p>
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
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: "6px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
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
