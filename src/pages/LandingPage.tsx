import { useNavigate } from "react-router-dom";
import { PricingContent } from "./PricingPage";

export function LandingPage() {
  const navigate = useNavigate();

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
          One dashboard. One verdict. Crash risk, insider activity, congressional trades,
          and AI analysis combined into a simple traffic light that tells you whether
          the market conditions favor trading today.
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
        {["Interactive Brokers", "Unusual Whales", "Anthropic Claude", "FRED", "SEC EDGAR", "Exa"].map((name) => (
          <span key={name} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#94a3b8" }}>{name}</span>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, textAlign: "center", marginBottom: 48 }}>
          What You Get
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          <FeatureCard
            title="Market Regime Analysis"
            description="Crash Risk Index combines VIX term structure, equity put/call ratios, credit spreads, and realized volatility into a single score. Know instantly if conditions are dangerous."
            tag="FREE"
          />
          <FeatureCard
            title="Insider + Congressional Trading"
            description="Track SEC Form 4 filings and STOCK Act disclosures in real time. See when insiders are dumping shares across 50+ major stocks and what Congress is buying."
            tag="FREE"
          />
          <FeatureCard
            title="AI Market Confidant"
            description="Claude analyzes your regime data, insider signals, and market context to generate a daily briefing. Ask questions about any ticker. No generic advice, only data-driven analysis."
            tag="PRO"
          />
          <FeatureCard
            title="Dark Pool + Options Flow"
            description="Surface institutional positioning from dark pool prints and unusual options activity. See what smart money is doing before it shows up in price."
            tag="PRO"
          />
          <FeatureCard
            title="Sector Heat Map + Charts"
            description="Visualize money flow across all 11 S&P sectors. TradingView chart integration for any ticker. See rotation patterns at a glance."
            tag="FREE"
          />
          <FeatureCard
            title="Automated Strategies"
            description="Define signal-to-order rules. Set daily loss limits and position caps. Kill switch always available. Full audit log. Paper trading validation before going live."
            tag="ENTERPRISE"
          />
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 32px", borderTop: "1px solid #1e293b" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, textAlign: "center", marginBottom: 48 }}>
          How It Works
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 48, maxWidth: 800, margin: "0 auto" }}>
          <Step n={1} title="Connect" desc="Add your brokerage and API keys. BYOK model means your data stays yours." />
          <Step n={2} title="Analyze" desc="SIBT pulls regime data, insider activity, and flow signals. AI synthesizes it all." />
          <Step n={3} title="Decide" desc="Get a clear verdict: TRADE, CAUTION, or NO TRADE. Plus the reasoning behind it." />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "80px 24px", borderTop: "1px solid #1e293b" }}>
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
        <div style={{ display: "flex", gap: 16 }}>
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
  const tagColor = tag === "FREE" ? "#05AD98" : tag === "PRO" ? "#F5A623" : "#8B5CF6";
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
