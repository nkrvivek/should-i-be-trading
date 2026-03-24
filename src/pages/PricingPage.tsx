import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { useAuthStore } from "../stores/authStore";
import { redirectToCheckout } from "../lib/stripe";
import { isSupabaseConfigured } from "../lib/supabase";

type BillingInterval = "month" | "year";

type Tier = {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  tier: "free" | "pro" | "enterprise";
  trial?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Market regime dashboard with real-time signals",
    features: [
      "Traffic Light verdict (TRADE / CAUTION / NO TRADE)",
      "CRI Crash Risk Index with 4 components",
      "VIX Regime signal (BUY / HOLD / SELL)",
      "Macro dashboard (FRED yield curves, economic calendar)",
      "Glossary with 35+ trading terms",
      "Signal history timeline",
      "Insider activity overview",
      "Dark / light theme",
    ],
    tier: "free",
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    yearlyPrice: 249,
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
      "Congressional trading tracker",
      "TradingView chart integration",
      "Priority support",
    ],
    highlighted: true,
    trial: true,
    tier: "pro",
  },
  {
    name: "Enterprise",
    monthlyPrice: 79,
    yearlyPrice: 699,
    description: "Automated strategies with risk controls + cloud Radon",
    features: [
      "Everything in Pro",
      "Strategy backtester (Web Worker engine)",
      "Automated trading (user-configured rules)",
      "Signal-to-order pipeline with kill switch",
      "Daily loss limits + position caps",
      "Full audit log of automated decisions",
      "Paper trading validation mode",
      "Cloud-hosted Radon instance",
      "Early access to new features",
    ],
    trial: true,
    tier: "enterprise",
  },
];

export function PricingPage() {
  return (
    <TerminalShell cri={null}>
      <PricingContent />
    </TerminalShell>
  );
}

/** Extracted so LandingPage can embed it without TerminalShell */
export function PricingContent() {
  const navigate = useNavigate();
  const { user, isTrialActive, effectiveTier } = useAuthStore();
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (tier: Tier) => {
    if (tier.tier === "free") {
      navigate(user ? "/" : "/login");
      return;
    }

    // Not logged in: send to signup (they'll get the 14-day free trial on signup)
    if (!user) {
      navigate("/login");
      return;
    }

    // User is on trial: clicking a paid tier means they want to subscribe after trial
    // Or trial expired: they need to pay now
    if (!isSupabaseConfigured()) {
      navigate("/settings");
      return;
    }

    setLoading(tier.tier);
    try {
      await redirectToCheckout(tier.tier as "pro" | "enterprise", interval);
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(null);
    }
  };

  const formatPrice = (tier: Tier) => {
    if (tier.tier === "free") return "$0";
    return interval === "year"
      ? `$${tier.yearlyPrice}`
      : `$${tier.monthlyPrice}`;
  };

  const priceNote = (tier: Tier) => {
    if (tier.tier === "free") return "Free forever";
    if (interval === "year") {
      const monthly = Math.round(tier.yearlyPrice / 12);
      const savings = Math.round((1 - tier.yearlyPrice / (tier.monthlyPrice * 12)) * 100);
      return `$${monthly}/mo billed annually (save ${savings}%)`;
    }
    return "per month";
  };

  const ctaLabel = (tier: Tier) => {
    const currentEffective = effectiveTier();
    const isCurrent = currentEffective === tier.tier;
    if (isCurrent && isTrialActive()) return "ON TRIAL";
    if (isCurrent) return "CURRENT PLAN";
    if (tier.tier === "free") return "GET STARTED";
    // Not logged in: show trial CTA
    if (!user) return "START 14-DAY FREE TRIAL";
    // Logged in + on trial: show subscribe CTA
    if (isTrialActive()) return `SUBSCRIBE — ${formatPrice(tier)}${interval === "year" ? "/yr" : "/mo"}`;
    // Trial expired: show subscribe
    return `SUBSCRIBE — ${formatPrice(tier)}${interval === "year" ? "/yr" : "/mo"}`;
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
          Simple, Transparent Pricing
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 20px" }}>
          Start with a 14-day free trial on any paid plan. Cancel anytime.
          You bring your own API keys and brokerage — we provide the tools.
        </div>

        {/* Billing toggle */}
        <div style={{ display: "inline-flex", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4, overflow: "hidden" }}>
          <button
            onClick={() => setInterval("month")}
            style={{
              padding: "6px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              background: interval === "month" ? "var(--signal-core)" : "transparent",
              color: interval === "month" ? "var(--bg-base)" : "var(--text-muted)",
              border: "none",
              cursor: "pointer",
            }}
          >
            MONTHLY
          </button>
          <button
            onClick={() => setInterval("year")}
            style={{
              padding: "6px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              background: interval === "year" ? "var(--signal-core)" : "transparent",
              color: interval === "year" ? "var(--bg-base)" : "var(--text-muted)",
              border: "none",
              cursor: "pointer",
            }}
          >
            ANNUAL
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {TIERS.map((tier) => {
          const isCurrent = effectiveTier() === tier.tier;

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

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {tier.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 600, color: tier.highlighted ? "var(--signal-core)" : "var(--text-primary)" }}>
                    {formatPrice(tier)}
                  </span>
                  {tier.tier !== "free" && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      {interval === "year" ? "/yr" : "/mo"}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                  {priceNote(tier)}
                </div>
                {tier.trial && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--signal-core)", marginTop: 4 }}>
                    14-day free trial included
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                  {tier.description}
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {tier.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--positive)", flexShrink: 0 }}>{"\u2713"}</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelect(tier)}
                disabled={isCurrent || loading === tier.tier}
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
                  opacity: loading === tier.tier ? 0.6 : 1,
                }}
              >
                {loading === tier.tier ? "REDIRECTING..." : ctaLabel(tier)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        textAlign: "center",
      }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
          SIBT is an analytical tool. It does not provide investment advice or recommendations.
          All trading decisions are your sole responsibility. Not a registered investment adviser.
          Cancel your subscription anytime from the Settings page. See our{" "}
          <a href="/terms" style={{ color: "var(--signal-core)" }}>Terms</a>,{" "}
          <a href="/privacy" style={{ color: "var(--signal-core)" }}>Privacy</a>, and{" "}
          <a href="/risk" style={{ color: "var(--signal-core)" }}>Risk Disclosure</a>.
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 48, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
          Common Questions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700, margin: "0 auto", textAlign: "left" }}>
          <FaqItem q="Why not a one-time payment?" a="Subscriptions let us keep improving SIBT with new data sources, AI models, and features. You get continuous updates. Cancel anytime." />
          <FaqItem q="What happens during the trial?" a="Full access to all features for 14 days. No charge until the trial ends. Cancel before it ends and you pay nothing." />
          <FaqItem q="What API keys do I need?" a="You bring your own: Interactive Brokers for live data, Unusual Whales for dark pool flow, Anthropic for AI analysis. Each is optional and unlocks specific features." />
          <FaqItem q="Is this investment advice?" a="No. SIBT is an analytical tool. It provides data, charts, and AI-powered context. All trading decisions are yours. We are not a registered investment adviser." />
          <FaqItem q="Can I change plans?" a="Yes. Upgrade or downgrade anytime from the Settings page. Changes take effect at the next billing cycle." />
          <FaqItem q="Can I self-host?" a="Yes. SIBT is open source (AGPL-3.0). You can run the free tier entirely self-hosted. Paid features require an active subscription." />
        </div>
      </div>
    </div>
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
