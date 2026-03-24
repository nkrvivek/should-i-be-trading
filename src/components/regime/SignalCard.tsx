/**
 * Signal Card — Individual regime signal with badge, value, interpretation, and score bar.
 */

import type { RegimeSignalResult, SignalBadge } from "../../lib/regimeScoring";

function badgeStyle(badge: SignalBadge): { bg: string; fg: string; border: string } {
  switch (badge) {
    case "POSITIVE": return { bg: "color-mix(in srgb, #05AD98 12%, transparent)", fg: "#05AD98", border: "#05AD98" };
    case "NEUTRAL": return { bg: "color-mix(in srgb, var(--text-muted) 12%, transparent)", fg: "var(--text-secondary)", border: "var(--text-muted)" };
    case "CAUTION": return { bg: "color-mix(in srgb, #F5A623 12%, transparent)", fg: "#F5A623", border: "#F5A623" };
    case "ELEVATED": return { bg: "color-mix(in srgb, #E85D6C 12%, transparent)", fg: "#E85D6C", border: "#E85D6C" };
  }
}

function barColor(score: number): string {
  if (score >= 75) return "#05AD98";
  if (score >= 50) return "#F5A623";
  if (score >= 25) return "#E85D6C";
  return "#dc2626";
}

function categoryDotColor(category: string): string {
  switch (category) {
    case "REGIME": return "#3b82f6";
    case "FRAGILITY": return "#F5A623";
    case "TRIGGER": return "#E85D6C";
    default: return "var(--text-muted)";
  }
}

type Props = {
  signal: RegimeSignalResult;
  showInterpretation?: boolean; // Pro-gated
};

export function SignalCard({ signal, showInterpretation = true }: Props) {
  const bs = badgeStyle(signal.badge);
  const color = barColor(signal.score);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 180,
      }}
    >
      {/* Category + Badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: categoryDotColor(signal.category) }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {signal.category}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            border: `1px solid ${bs.border}`,
            background: bs.bg,
            color: bs.fg,
          }}
        >
          {signal.badge}
        </span>
      </div>

      {/* Metric name + description */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {signal.metricName}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          {signal.description}
        </div>
      </div>

      {/* Current value */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
        {signal.currentValue}
      </div>

      {/* Interpretation (Pro-gated) */}
      {showInterpretation ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
          {signal.interpretation}
        </div>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.5,
            flex: 1,
            filter: "blur(4px)",
            userSelect: "none",
          }}
        >
          Detailed signal interpretation and context analysis available with Pro subscription.
        </div>
      )}

      {/* Score bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
        <div style={{ flex: 1, height: 3, background: "var(--bg-hover)", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              width: `${signal.score}%`,
              height: "100%",
              background: color,
              borderRadius: 2,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", minWidth: 20, textAlign: "right" }}>
          {signal.score}
        </span>
      </div>
    </div>
  );
}
