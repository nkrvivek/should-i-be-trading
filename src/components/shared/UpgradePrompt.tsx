import { useNavigate } from "react-router-dom";
import type { Feature } from "../../lib/featureGates";
import { getRequiredTier } from "../../lib/featureGates";

type Props = {
  feature: Feature;
  children?: React.ReactNode;
};

const featureLabels: Partial<Record<Feature, string>> = {
  terminal: "Full Terminal",
  ai_analysis: "AI Analysis",
  scanner: "Dark Pool Scanner",
  dark_pool: "Dark Pool Flow",
  alerts: "Alerts",
  backtester: "Strategy Backtester",
  automation: "Automated Trading",
  charts_advanced: "Advanced Charts",
};

export function UpgradePrompt({ feature, children }: Props) {
  const navigate = useNavigate();
  const requiredTier = getRequiredTier(feature);
  const label = featureLabels[feature] ?? feature;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        gap: 16,
        height: "100%",
        minHeight: 300,
      }}
    >
      {children}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
        {label} requires {requiredTier.toUpperCase()}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", textAlign: "center", maxWidth: 400 }}>
        Upgrade your plan to access {label.toLowerCase()}, along with real-time data streaming,
        portfolio analytics, and AI-powered market analysis.
      </div>
      <button
        onClick={() => navigate("/settings")}
        style={{
          padding: "10px 24px",
          background: "var(--accent-bg)",
          border: "none",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--accent-text)",
          cursor: "pointer",
          marginTop: 8,
        }}
      >
        UPGRADE TO {requiredTier.toUpperCase()}
      </button>
    </div>
  );
}
