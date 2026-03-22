import type { TrafficLightVerdict, TrafficSignal, VixRegimeAction } from "../../lib/trafficLight";

type Props = {
  verdict: TrafficLightVerdict;
};

const signalConfig: Record<TrafficSignal, { color: string; label: string; glow: string }> = {
  TRADE: { color: "var(--positive)", label: "TRADE", glow: "0 0 40px rgba(5, 173, 152, 0.4)" },
  CAUTION: { color: "var(--warning)", label: "CAUTION", glow: "0 0 40px rgba(245, 166, 35, 0.4)" },
  NO_TRADE: { color: "var(--negative)", label: "NO TRADE", glow: "0 0 40px rgba(232, 93, 108, 0.4)" },
};

export function TrafficLight({ verdict }: Props) {
  const config = signalConfig[verdict.signal];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "24px 32px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      {/* Signal indicator */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: config.color,
          boxShadow: config.glow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--bg-base)",
            letterSpacing: "0.05em",
          }}
        >
          {verdict.signal === "TRADE" ? "GO" : verdict.signal === "CAUTION" ? "!" : "X"}
        </span>
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 28,
          fontWeight: 600,
          color: config.color,
          letterSpacing: "0.05em",
        }}
      >
        {config.label}
      </span>

      {/* Confidence */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        Confidence: {verdict.confidence}%
      </span>

      {/* Reasons */}
      <div style={{ width: "100%", marginTop: 8 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          Why
        </div>
        {verdict.reasons.map((r, i) => (
          <div
            key={i}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-secondary)",
              padding: "2px 0",
            }}
          >
            {r}
          </div>
        ))}
      </div>

      {/* VIX Regime Signal */}
      <div
        style={{
          width: "100%",
          marginTop: 8,
          padding: "8px 12px",
          background: "var(--bg-panel-raised)",
          borderRadius: 4,
          border: `1px solid ${vixRegimeColor(verdict.vixRegime.action)}22`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          VIX Regime
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 600,
            color: vixRegimeColor(verdict.vixRegime.action),
            marginBottom: 2,
          }}
        >
          {verdict.vixRegime.label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-secondary)",
          }}
        >
          {verdict.vixRegime.detail}
        </div>
      </div>

      {/* Overrides */}
      {verdict.overrides.length > 0 && (
        <div style={{ width: "100%", marginTop: 4 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 500,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            Consider
          </div>
          {verdict.overrides.map((o, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-muted)",
                fontStyle: "italic",
                padding: "2px 0",
              }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function vixRegimeColor(action: VixRegimeAction): string {
  switch (action) {
    case "BUY_AGGRESSIVE": return "var(--signal-strong)";
    case "BUY": return "var(--positive)";
    case "SELL": return "var(--negative)";
    case "HOLD": return "var(--neutral)";
  }
}
