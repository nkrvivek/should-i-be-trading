/**
 * Pillar Score — Shows one pillar's aggregate score with progress bar.
 */

import type { RegimePillar } from "../../lib/regimeScoring";

function barColor(score: number): string {
  if (score >= 75) return "#05AD98";
  if (score >= 50) return "#F5A623";
  if (score >= 25) return "#E85D6C";
  return "#dc2626";
}

type Props = {
  pillar: RegimePillar;
};

export function PillarScoreCard({ pillar }: Props) {
  const color = barColor(pillar.score);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        padding: 16,
        flex: 1,
        minWidth: 200,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {pillar.label}
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            {pillar.description}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
          {pillar.score}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12, height: 4, background: "var(--bg-hover)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: `${pillar.score}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
