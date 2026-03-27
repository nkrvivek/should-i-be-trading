import type { MarketScore } from "../../lib/marketScoring";

type Props = { score: MarketScore };

/** Parse a number from a category detail string using a regex pattern. */
function extractNumber(detail: string, pattern: RegExp): number | null {
  const m = detail.match(pattern);
  return m ? parseFloat(m[1]) : null;
}

/** Compact grid of key market stats extracted from the MarketScore categories. */
export function QuickMarketStats({ score }: Props) {
  const volCat = score.categories.find((c) => c.name === "Volatility");
  const momCat = score.categories.find((c) => c.name === "Momentum");
  const macroCat = score.categories.find((c) => c.name === "Macro");
  const trendCat = score.categories.find((c) => c.name === "Trend");

  const vix = volCat ? extractNumber(volCat.detail, /VIX\s+([\d.]+)/) : null;
  const spyChange = momCat ? extractNumber(momCat.detail, /SPY\s+([+-]?[\d.]+)%/) : null;
  const tenY = macroCat ? extractNumber(macroCat.detail, /10Y yield\s+([\d.]+)%/) : null;
  const rsi = trendCat ? extractNumber(trendCat.detail, /RSI\s+([\d.]+)/) : null;

  const stats: { label: string; value: string; color?: string }[] = [];

  if (vix !== null) {
    stats.push({
      label: "VIX",
      value: vix.toFixed(1),
      color: vix > 25 ? "var(--fault)" : vix > 18 ? "var(--warning, #f59e0b)" : "var(--positive)",
    });
  }

  if (spyChange !== null) {
    const sign = spyChange >= 0 ? "+" : "";
    stats.push({
      label: "SPY",
      value: `${sign}${spyChange.toFixed(2)}%`,
      color: spyChange >= 0 ? "var(--positive)" : "var(--fault)",
    });
  }

  if (tenY !== null) {
    stats.push({
      label: "10Y",
      value: `${tenY.toFixed(2)}%`,
      color: tenY > 4.5 ? "var(--fault)" : "var(--text-primary)",
    });
  }

  if (rsi !== null) {
    stats.push({
      label: "RSI",
      value: rsi.toFixed(0),
      color: rsi > 70 ? "var(--fault)" : rsi < 30 ? "var(--positive)" : "var(--text-primary)",
    });
  }

  stats.push({
    label: "SCORE",
    value: `${score.total}/100`,
    color: score.total >= 65 ? "var(--positive)" : score.total >= 40 ? "var(--warning, #f59e0b)" : "var(--fault)",
  });

  stats.push({
    label: "WINDOW",
    value: `${score.executionWindow}%`,
    color: score.executionWindow >= 60 ? "var(--positive)" : score.executionWindow >= 35 ? "var(--warning, #f59e0b)" : "var(--fault)",
  });

  if (stats.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        padding: 10,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          gridColumn: "1 / -1",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 2,
        }}
      >
        Market Snapshot
      </div>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 8px",
            background: "var(--bg-panel-raised, rgba(0,0,0,0.03))",
            borderRadius: 3,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              color: s.color ?? "var(--text-primary)",
            }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
