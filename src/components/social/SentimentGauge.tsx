/**
 * Horizontal sentiment gauge — green (bullish) vs red (bearish) bar
 * with percentage labels on each side.
 */

interface SentimentGaugeProps {
  bullishPercent: number | null;
  bearishPercent: number | null;
  label?: string;
}

export function SentimentGauge({ bullishPercent, bearishPercent, label }: SentimentGaugeProps) {
  const hasData = bullishPercent !== null && bearishPercent !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      )}
      {hasData ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--green, #22c55e)",
              minWidth: 40,
              textAlign: "right",
            }}
          >
            {bullishPercent}%
          </span>
          <div
            style={{
              flex: 1,
              height: 16,
              borderRadius: 4,
              overflow: "hidden",
              display: "flex",
              background: "var(--bg-surface, #1a1a2e)",
            }}
          >
            <div
              style={{
                width: `${bullishPercent}%`,
                background: "var(--green, #22c55e)",
                transition: "width 0.3s ease",
              }}
            />
            <div
              style={{
                width: `${bearishPercent}%`,
                background: "var(--red, #ef4444)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--red, #ef4444)",
              minWidth: 40,
            }}
          >
            {bearishPercent}%
          </span>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-muted)",
            padding: "8px 0",
          }}
        >
          N/A
        </div>
      )}
    </div>
  );
}
