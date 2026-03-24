/**
 * Fear & Greed Gauge — Visual arc gauge for the dashboard.
 * Maps Market Quality Score 0-100 to Fear/Greed zones.
 */

import { useMemo } from "react";

type Props = {
  score: number; // 0-100
};

const ZONES = [
  { label: "Extreme Fear", min: 0, max: 20, color: "#dc2626" },
  { label: "Fear", min: 20, max: 40, color: "#E85D6C" },
  { label: "Neutral", min: 40, max: 60, color: "#94a3b8" },
  { label: "Greed", min: 60, max: 80, color: "#05AD98" },
  { label: "Extreme Greed", min: 80, max: 100, color: "#0FCFB5" },
];

function getZone(score: number) {
  return ZONES.find((z) => score >= z.min && score < z.max) ?? ZONES[ZONES.length - 1];
}

export function FearGreedGauge({ score }: Props) {
  const zone = useMemo(() => getZone(score), [score]);

  // Arc parameters
  const cx = 120;
  const cy = 110;
  const r = 90;
  // Needle angle: map 0-100 to PI-0 (left to right)
  const needleAngle = Math.PI - (score / 100) * Math.PI;
  const needleX = cx + (r - 10) * Math.cos(needleAngle);
  const needleY = cy - (r - 10) * Math.sin(needleAngle);

  // Build arc segments for zones
  const arcSegments = ZONES.map((z) => {
    const a1 = Math.PI - (z.min / 100) * Math.PI;
    const a2 = Math.PI - (z.max / 100) * Math.PI;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy - r * Math.sin(a2);
    const largeArc = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
    return {
      ...z,
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`,
    };
  });

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 240 140" width="100%" style={{ maxWidth: 280 }}>
        {/* Zone arcs */}
        {arcSegments.map((seg) => (
          <path
            key={seg.label}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth={12}
            strokeLinecap="butt"
            opacity={0.3}
          />
        ))}

        {/* Active arc (filled to current score) */}
        {(() => {
          const activeAngle = Math.PI - (score / 100) * Math.PI;
          const sx = cx + r * Math.cos(Math.PI);
          const sy = cy - r * Math.sin(Math.PI);
          const ex = cx + r * Math.cos(activeAngle);
          const ey = cy - r * Math.sin(activeAngle);
          const largeArc = score > 50 ? 1 : 0;
          return (
            <path
              d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`}
              fill="none"
              stroke={zone.color}
              strokeWidth={12}
              strokeLinecap="round"
            />
          );
        })()}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={zone.color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill={zone.color} />

        {/* Score text */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={32}
          fontWeight={700}
          fill={zone.color}
        >
          {score}
        </text>

        {/* Zone label */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fontWeight={600}
          fill={zone.color}
          style={{ textTransform: "uppercase" }}
        >
          {zone.label.toUpperCase()}
        </text>

        {/* Scale labels */}
        <text x={20} y={cy + 20} fontFamily="var(--font-mono)" fontSize={8} fill="var(--text-muted)">0</text>
        <text x={cx - 4} y={cy - r - 8} fontFamily="var(--font-mono)" fontSize={8} fill="var(--text-muted)" textAnchor="middle">50</text>
        <text x={220} y={cy + 20} fontFamily="var(--font-mono)" fontSize={8} fill="var(--text-muted)" textAnchor="end">100</text>
      </svg>

      {/* Zone bar labels */}
      <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 280, margin: "0 auto", padding: "0 4px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)" }}>EXTREME FEAR</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)" }}>NEUTRAL</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)" }}>EXTREME GREED</span>
      </div>

      {/* Link to Regime page */}
      <a
        href="/regime"
        style={{
          display: "inline-block",
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--signal-core)",
          textDecoration: "none",
        }}
      >
        View Regime Monitor &rarr;
      </a>
    </div>
  );
}
