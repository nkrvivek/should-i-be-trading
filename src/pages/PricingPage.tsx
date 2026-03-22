import { useNavigate } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { useAuthStore } from "../stores/authStore";

type Tier = {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  tier: "free" | "pro" | "enterprise";
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    priceNote: "Forever",
    description: "Market regime dashboard with real-time data",
    features: [
      "Traffic Light verdict (TRADE / CAUTION / NO TRADE)",
      "CRI Crash Risk Index with 4 components",
      "VIX Regime signal (BUY / HOLD / SELL)",
      "Macro dashboard (FRED yield curves, economic calendar)",
      "Glossary with 35+ trading terms",
      "Signal history timeline",
      "Dark / light theme",
    ],
    cta: "GET STARTED",
    tier: "free",
  },
  {
    name: "Pro",
    price: "$149",
    priceNote: "One-time payment, lifetime access",
    description: "Full Bloomberg-style terminal with AI analysis",
    features: [
      "Everything in Free",
      "Multi-panel terminal (watchlist, portfolio, orders)",
      "Real-time WebSocket price streaming",
      "Dark pool flow scanner (via your UW key)",
      "Options flow discovery + unusual activity",
      "AI market analysis (Claude confidant)",
      "Exa research integration",
      "Custom watchlists (unlimited)",
      "Configurable alerts (VIX, CRI, price)",
      "Daily AI-generated market briefings",
      "Priority support",
    ],
    highlighted: true,
    cta: "BUY PRO — $149",
    tier: "pro",
  },
  {
    name: "Enterprise",
    price: "$499",
    priceNote: "One-time payment, lifetime access",
    description: "Automated strategies with risk controls",
    features: [
      "Everything in Pro",
      "Strategy backtester (Web Worker engine)",
      "Automated trading (user-configured rules)",
      "Signal-to-order pipeline with kill switch",
      "Daily loss limits + position caps",
      "Full audit log of automated decisions",
      "Paper trading validation mode",
      "Early access to new features",
    ],
    cta: "BUY ENTERPRISE — $499",
    tier: "enterprise",
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();

  const handleSelect = (tier: Tier) => {
    if (tier.tier === "free") {
      navigate(user ? "/" : "/login");
      return;
    }
    // For paid tiers, navigate to settings to handle upgrade
    // In production, this would integrate with Stripe/Lemon Squeezy
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/settings");
  };

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Simple Pricing
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
            One-time payment. Lifetime access. No subscriptions, no recurring fees.
            You bring your own API keys and brokerage — we provide the tools.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {TIERS.map((tier) => {
            const isCurrent = profile?.tier === tier.tier;

            return (
              <div
                key={tier.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  background: "var(--bg-panel)",
                  border: `${tier.highlighted ? "2px" : "1px"} solid ${tier.highlighted ? "var(--signal-core)" : "var(--border-dim)"}`,
                  borderRadius: 4,
                  position: "relative",
                }}
              >
                {tier.highlighted && (
                  <div style={{
                    position: "absolute",
                    top: -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "2px 12px",
                    background: "var(--signal-core)",
                    color: "var(--bg-base)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    borderRadius: 999,
                    letterSpacing: "0.05em",
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {tier.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 600, color: tier.highlighted ? "var(--signal-core)" : "var(--text-primary)" }}>
                      {tier.price}
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                    {tier.priceNote}
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                    {tier.description}
                  </div>
                </div>

                {/* Features */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                  {tier.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--positive)", flexShrink: 0 }}>{"\u2713"}</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelect(tier)}
                  disabled={isCurrent}
                  style={{
                    padding: "10px 16px",
                    background: isCurrent ? "var(--bg-panel-raised)" : tier.highlighted ? "var(--signal-core)" : "var(--bg-panel-raised)",
                    color: isCurrent ? "var(--text-muted)" : tier.highlighted ? "var(--bg-base)" : "var(--text-primary)",
                    border: `1px solid ${tier.highlighted ? "var(--signal-core)" : "var(--border-dim)"}`,
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: isCurrent ? "default" : "pointer",
                    letterSpacing: "0.03em",
                  }}
                >
                  {isCurrent ? "CURRENT PLAN" : tier.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Trust signals */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
            Common Questions
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700, margin: "0 auto", textAlign: "left" }}>
            <FaqItem q="Why one-time, not subscription?" a="We believe in fair pricing. You pay once, you own it forever. No surprises, no recurring charges eating into your trading capital." />
            <FaqItem q="What API keys do I need?" a="You bring your own: Interactive Brokers for live data, Unusual Whales for dark pool flow, Anthropic for AI analysis. Each is optional and unlocks specific features." />
            <FaqItem q="Is this investment advice?" a="No. SIBT is an analytical tool. It provides data, charts, and AI-powered context. All trading decisions are yours. We are not a registered investment adviser." />
            <FaqItem q="Can I self-host?" a="Yes. SIBT is open source (AGPL-3.0). You can run the free tier entirely self-hosted. Pro features require a license key." />
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ padding: 12, background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>{q}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{a}</div>
    </div>
  );
}
