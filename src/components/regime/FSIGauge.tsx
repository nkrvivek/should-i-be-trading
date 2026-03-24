/**
 * Financial Stress Indicator (FSI) Display
 * Formula: (HYG/TLT) / (MOVE × HY Spread)
 * Shows components, value, and risk appetite label.
 */

import type { FSIResult } from "../../lib/regimeScoring";

function labelColor(label: string): string {
  switch (label) {
    case "Healthy": return "#05AD98";
    case "Cautious": return "#F5A623";
    case "Stressed": return "#E85D6C";
    case "Critical": return "#dc2626";
    default: return "var(--text-muted)";
  }
}

type Props = {
  fsi: FSIResult;
};

export function FSIGauge({ fsi }: Props) {
  const color = labelColor(fsi.label);
  const { hyg, tlt, move, hySpread } = fsi.components;

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            FINANCIAL STRESS INDICATOR
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            (HYG/TLT) / (Vol x HY Spread)
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color }}>
            {fsi.value !== null ? fsi.value.toFixed(2) : "---"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              color,
              textTransform: "uppercase",
            }}
          >
            {fsi.label}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div
          style={{
            width: `${fsi.score}%`,
            height: "100%",
            background: `linear-gradient(90deg, #dc2626, #E85D6C, #F5A623, #05AD98)`,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Component values */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <ComponentChip label="HYG" value={hyg ? `$${hyg.toFixed(2)}` : "N/A"} desc="Junk bonds" />
        <ComponentChip label="TLT" value={tlt ? `$${tlt.toFixed(2)}` : "N/A"} desc="Treasuries" />
        <ComponentChip label="VOL" value={move ? move.toFixed(1) : "N/A"} desc="Bond/equity vol" />
        <ComponentChip label="HY Spread" value={hySpread ? `${(hySpread * 100).toFixed(0)} bps` : "N/A"} desc="Credit spread" />
      </div>

      {/* Explanation */}
      <div style={{ marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Rising = healthy risk appetite, low bond vol, tight credit spreads. Falling = deteriorating conditions across all three.
        When all components deteriorate simultaneously, the indicator collapses — a leading signal for equity drawdowns.
      </div>
    </div>
  );
}

function ComponentChip({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        {value}
      </span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--text-muted)" }}>
        {desc}
      </span>
    </div>
  );
}
