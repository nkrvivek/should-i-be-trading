/**
 * Horizontal scrolling row of trending ticker badges from StockTwits.
 * Each badge is clickable to set the active search ticker.
 */

import type { TrendingSymbol } from "../../api/stocktwitsClient";

interface TrendingTickersProps {
  tickers: TrendingSymbol[];
  onSelect: (symbol: string) => void;
}

export function TrendingTickers({ tickers, onSelect }: TrendingTickersProps) {
  if (tickers.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        Trending on StockTwits
      </span>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {tickers.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.symbol)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 14px",
              background: "var(--bg-surface, #1a1a2e)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              cursor: "pointer",
              flexShrink: 0,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--accent-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--border-dim)";
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              ${t.symbol}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-muted)",
              }}
            >
              {t.watchlistCount.toLocaleString()} watchers
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
