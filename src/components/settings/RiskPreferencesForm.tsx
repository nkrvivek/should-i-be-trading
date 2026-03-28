import { useRiskPrefsStore, type RiskTolerance } from "../../stores/riskPrefsStore";

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  marginBottom: 4,
};

const subtextStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--text-muted)",
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 6,
};

const groupStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  marginBottom: 16,
};

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.03em",
    color: active ? "var(--bg-base, #0a0f14)" : "var(--text-secondary)",
    background: active ? "var(--signal-core)" : "transparent",
    border: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
    borderRight: "none",
    cursor: "pointer",
    transition: "all 0.15s",
  };
}

function lastToggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    ...toggleBtnStyle(active),
    borderRight: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
    borderRadius: "0 4px 4px 0",
  };
}

function firstToggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    ...toggleBtnStyle(active),
    borderRadius: "4px 0 0 4px",
  };
}

function midToggleBtnStyle(active: boolean): React.CSSProperties {
  return toggleBtnStyle(active);
}

const TOLERANCE_OPTIONS: { value: RiskTolerance; label: string }[] = [
  { value: "conservative", label: "CONSERVATIVE" },
  { value: "moderate", label: "MODERATE" },
  { value: "aggressive", label: "AGGRESSIVE" },
];

export function RiskPreferencesForm() {
  const { riskTolerance, setRiskTolerance, resetDefaults } = useRiskPrefsStore();

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 6,
        padding: 20,
      }}
    >
      <div style={sectionHeaderStyle}>Risk Profile</div>
      <div style={subtextStyle}>
        Filters strategy suggestions and the catalog to match your risk appetite.
        Per-trade risk/reward analysis is shown in the order review before execution.
      </div>

      {/* Risk Appetite */}
      <div style={labelStyle}>Risk Appetite</div>
      <div style={groupStyle}>
        {TOLERANCE_OPTIONS.map((opt, i) => {
          const active = riskTolerance === opt.value;
          const style =
            i === 0
              ? firstToggleBtnStyle(active)
              : i === TOLERANCE_OPTIONS.length - 1
                ? lastToggleBtnStyle(active)
                : midToggleBtnStyle(active);
          return (
            <button
              key={opt.value}
              onClick={() => setRiskTolerance(opt.value)}
              style={style}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Reset */}
      <button
        onClick={resetDefaults}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-muted)",
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        Reset to Defaults
      </button>
    </div>
  );
}
