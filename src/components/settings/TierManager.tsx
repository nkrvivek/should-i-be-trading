import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore, type UserTier } from "../../stores/authStore";
import { Badge } from "../shared/Badge";

const TIER_INFO: Record<UserTier, { label: string; color: string; features: string[] }> = {
  free: {
    label: "FREE",
    color: "var(--neutral)",
    features: ["Regime Dashboard", "Macro Data (FRED)", "Glossary", "Signal History"],
  },
  pro: {
    label: "PRO",
    color: "var(--positive)",
    features: ["Full Terminal", "AI Analysis", "Dark Pool Scanner", "Alerts", "Custom Watchlists", "Daily Briefings"],
  },
  enterprise: {
    label: "ENTERPRISE",
    color: "var(--info)",
    features: ["Strategy Backtester", "Automated Trading", "Kill Switch + Audit Log", "Early Access"],
  },
};

export function TierManager() {
  const { user, profile, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);

  const currentTier = profile?.tier ?? "free";
  const tierInfo = TIER_INFO[currentTier];

  const handleUpgrade = async (tier: UserTier) => {
    if (!user) return;
    setUpgrading(true);

    // In production, this would verify a Stripe/LemonSqueezy payment first.
    // For now, we directly update the tier (useful for testing).
    const { data, error } = await supabase
      .from("profiles")
      .update({ tier })
      .eq("id", user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }
    setUpgrading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Current plan */}
      <div style={{
        padding: 20,
        background: "var(--bg-panel-raised)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Current Plan
          </span>
          <Badge label={tierInfo.label} variant={currentTier === "pro" ? "positive" : currentTier === "enterprise" ? "info" : "default"} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tierInfo.features.map((f) => (
            <span key={f} style={{
              padding: "3px 8px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--text-secondary)",
            }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Upgrade options */}
      {currentTier !== "enterprise" && (
        <div style={{
          padding: 20,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Upgrade
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {currentTier === "free" && (
              <UpgradeCard
                tier="pro"
                price="$149"
                label="Upgrade to Pro"
                description="Full terminal + AI + scanners"
                onUpgrade={() => handleUpgrade("pro")}
                loading={upgrading}
              />
            )}
            <UpgradeCard
              tier="enterprise"
              price="$499"
              label={currentTier === "free" ? "Upgrade to Enterprise" : "Upgrade to Enterprise"}
              description="Automation + backtester"
              onUpgrade={() => handleUpgrade("enterprise")}
              loading={upgrading}
            />
          </div>

          <button
            onClick={() => navigate("/pricing")}
            style={{
              marginTop: 12,
              background: "none",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--signal-core)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            View full pricing details &rarr;
          </button>
        </div>
      )}

      {currentTier === "enterprise" && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
          You have the highest tier. All features are unlocked.
        </div>
      )}
    </div>
  );
}

function UpgradeCard({ tier, price, label, description, onUpgrade, loading }: {
  tier: string; price: string; label: string; description: string; onUpgrade: () => void; loading: boolean;
}) {
  return (
    <div style={{
      flex: 1,
      padding: 16,
      background: "var(--bg-panel-raised)",
      border: "1px solid var(--border-dim)",
      borderRadius: 4,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--signal-core)" }}>{price}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{description}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>One-time payment</div>
      <button
        onClick={onUpgrade}
        disabled={loading}
        style={{
          padding: "8px 16px",
          background: "var(--signal-core)",
          border: "none",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--bg-base)",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
          marginTop: 4,
        }}
      >
        {loading ? "..." : `BUY ${tier.toUpperCase()}`}
      </button>
    </div>
  );
}
