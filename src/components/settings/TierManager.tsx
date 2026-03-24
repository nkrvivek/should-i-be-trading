import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, type UserTier } from "../../stores/authStore";
import { redirectToCheckout, redirectToPortal } from "../../lib/stripe";
import { supabase } from "../../lib/supabase";
import { Badge } from "../shared/Badge";

const TIER_INFO: Record<UserTier, { label: string; color: string; features: string[] }> = {
  free: {
    label: "FREE",
    color: "var(--neutral)",
    features: ["Regime Dashboard", "Macro Data (FRED)", "Glossary", "Signal History"],
  },
  starter: {
    label: "STARTER",
    color: "var(--signal-core)",
    features: ["Signal Interpretations", "AI Chat (10/day)", "Backtester (3M)", "All Notifications", "5 Watchlists"],
  },
  pro: {
    label: "PRO",
    color: "var(--positive)",
    features: ["Full Terminal", "AI Analysis", "Dark Pool Scanner", "Alerts", "Custom Watchlists", "Daily Briefings"],
  },
  enterprise: {
    label: "ENTERPRISE",
    color: "var(--info)",
    features: ["Strategy Backtester", "Automated Trading", "Kill Switch + Audit Log", "Cloud Radon", "Early Access"],
  },
};

export function TierManager() {
  const { user, subscription, isTrialActive, trialDaysLeft, effectiveTier } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const currentTier = effectiveTier();
  const tierInfo = TIER_INFO[currentTier];

  const handleUpgrade = async (tier: "starter" | "pro" | "enterprise") => {
    if (!user) return;
    setLoading(true);
    try {
      // If user hasn't had a trial yet, activate no-card trial first
      const currentProfile = useAuthStore.getState().profile;
      const hasHadTrial = currentProfile?.trial_ends_at != null;

      if (!hasHadTrial) {
        // Activate 14-day no-card trial directly
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        const { error } = await supabase
          .from("profiles")
          .update({
            trial_tier: tier,
            trial_ends_at: trialEnd.toISOString(),
          })
          .eq("id", user.id);

        if (error) throw new Error(error.message);

        // Update local store to reflect new trial immediately
        const store = useAuthStore.getState();
        if (store.profile) {
          store.setProfile({
            ...store.profile,
            trial_tier: tier,
            trial_ends_at: trialEnd.toISOString(),
          });
        }
        setLoading(false);
        return;
      }

      // Trial already used — go to Stripe checkout for paid subscription
      await redirectToCheckout(tier, "year");
    } catch (err) {
      console.error("Upgrade error:", err);
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      await redirectToPortal();
    } catch (err) {
      console.error("Portal error:", err);
      setLoading(false);
    }
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          {isTrialActive() && (
            <Badge label={`TRIAL — ${trialDaysLeft()}d left`} variant="warning" />
          )}
          {subscription?.status === "trialing" && (
            <Badge label="TRIAL" variant="warning" />
          )}
          {subscription?.status === "past_due" && (
            <Badge label="PAST DUE" variant="negative" />
          )}
          {subscription?.cancel_at_period_end && (
            <Badge label="CANCELING" variant="warning" />
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
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

        {/* Subscription details */}
        {subscription && subscription.plan_tier !== "free" && (
          <div style={{
            padding: 12,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                Billing
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
                {subscription.billing_interval === "year" ? "Annual" : "Monthly"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                {subscription.cancel_at_period_end ? "Access until" : "Renews on"}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
                {formatDate(subscription.current_period_end)}
              </span>
            </div>
            <button
              onClick={handleManage}
              disabled={loading}
              style={{
                marginTop: 8,
                padding: "8px 16px",
                background: "var(--bg-panel-raised)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-primary)",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "..." : "MANAGE SUBSCRIPTION"}
            </button>
          </div>
        )}
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

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {currentTier === "free" && (
              <UpgradeCard
                label="Upgrade to Starter"
                price="$12/mo or $99/yr"
                description="AI chat + interpretations + backtester"
                trial="14-day free trial"
                onUpgrade={() => handleUpgrade("starter")}
                loading={loading}
              />
            )}
            {(currentTier === "free" || currentTier === "starter") && (
              <UpgradeCard
                label="Upgrade to Pro"
                price="$29/mo or $249/yr"
                description="Full terminal + AI + scanners"
                trial="14-day free trial"
                onUpgrade={() => handleUpgrade("pro")}
                loading={loading}
              />
            )}
            <UpgradeCard
              label="Upgrade to Enterprise"
              price="$79/mo or $699/yr"
              description="Automation + backtester + cloud Radon"
              trial="14-day free trial"
              onUpgrade={() => handleUpgrade("enterprise")}
              loading={loading}
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

function UpgradeCard({ label, price, description, trial, onUpgrade, loading }: {
  label: string; price: string; description: string; trial: string; onUpgrade: () => void; loading: boolean;
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
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--signal-core)" }}>{price}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{description}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--signal-core)" }}>{trial}</div>
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
        {loading ? "..." : "START FREE TRIAL"}
      </button>
    </div>
  );
}
