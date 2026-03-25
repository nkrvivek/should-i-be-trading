/**
 * Market State Hero Card — Top of Regime Monitor page.
 * Shows market state, composite score, confidence, action stance, and warnings.
 */

import type { RegimeMonitorResult, MarketState, ActionStance } from "../../lib/regimeScoring";

function stateColor(state: MarketState): string {
  switch (state) {
    case "Strong / Risk-On": return "#05AD98";
    case "Stable / Normal": return "#0FCFB5";
    case "Fragile / Hedged": return "#F5A623";
    case "Stressed / Defensive": return "#E85D6C";
    case "Crisis / Risk-Off": return "#dc2626";
  }
}

function stanceColor(stance: ActionStance): string {
  switch (stance) {
    case "Aggressive": return "#05AD98";
    case "Normal": return "#0FCFB5";
    case "Hedged": return "#F5A623";
    case "Defensive": return "#E85D6C";
    case "Cash": return "#dc2626";
  }
}

type Props = {
  regime: RegimeMonitorResult;
};

export function MarketStateCard({ regime }: Props) {
  const { marketState, compositeScore, confidenceScore, actionStance, warnings } = regime;
  const color = stateColor(marketState);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        padding: 24,
      }}
    >
      {/* Top row: State + Scores + Stance */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        {/* Left: Market State */}
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            MARKET STATE
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color, lineHeight: 1.2 }}>
            {marketState}
          </div>
        </div>

        {/* Right: Scores + Stance */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              COMPOSITE RISK
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color }}>
              {compositeScore}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              CONFIDENCE
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--text-primary)" }}>
              {confidenceScore}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              ACTION STANCE
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: 999,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: stanceColor(actionStance),
              }}
            >
              {actionStance}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid var(--warning)",
                background: "color-mix(in srgb, var(--warning) 8%, transparent)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--warning)",
              }}
            >
              <span>&#9650;</span> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
