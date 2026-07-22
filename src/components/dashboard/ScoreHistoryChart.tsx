import { useMemo, useId } from "react";
import type { SignalHistoryEntry } from "../../hooks/useSignalHistory";

type Props = {
  history: SignalHistoryEntry[];
};

const WIDTH = 720;
const HEIGHT = 120;
const PAD_Y = 10;

/**
 * Minimalist single-line score history chart — the RH-style sparkline under
 * the hero number. No axes, no gridlines. Line and fill color follow trend:
 * green if the score is up since the first point in view, red if down.
 */
export function ScoreHistoryChart({ history }: Props) {
  const gradientId = useId();

  const points = useMemo(() => {
    // history is newest-first; chart reads left-to-right chronologically.
    return history
      .filter((entry) => entry.criScore != null)
      .slice(0, 30)
      .reverse()
      .map((entry) => entry.criScore as number);
  }, [history]);

  if (points.length < 2) {
    return (
      <div style={{ height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
          Not enough history yet — the chart fills in as your score changes.
        </span>
      </div>
    );
  }

  const trendUp = points[points.length - 1] >= points[0];
  const color = trendUp ? "var(--positive)" : "var(--negative)";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((value, i) => {
    const x = (i / (points.length - 1)) * WIDTH;
    const y = PAD_Y + (1 - (value - min) / range) * (HEIGHT - PAD_Y * 2);
    return { x, y };
  });

  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3.5} fill={color} />
    </svg>
  );
}
