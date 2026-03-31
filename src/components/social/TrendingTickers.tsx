/**
 * Horizontal scrolling row of trending ticker badges from StockTwits.
 * Shows ticker, company name hint, price, and change from Finnhub quotes.
 */

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getEdgeHeaders } from "../../api/edgeHeaders";
import { dedupFetch } from "../../api/fetchDedup";
import type { TrendingSymbol } from "../../api/stocktwitsClient";

interface TrendingTickersProps {
  tickers: TrendingSymbol[];
  onSelect: (symbol: string) => void;
}

interface QuoteData {
  c: number;   // current price
  dp: number;  // daily change %
  d: number;   // daily change $
}

export function TrendingTickers({ tickers, onSelect }: TrendingTickersProps) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});

  // Fetch quotes for trending tickers via Finnhub (already cached at 1min in edge function)
  useEffect(() => {
    if (tickers.length === 0 || !isSupabaseConfigured()) return;
    let cancelled = false;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    async function fetchQuotes() {
      const headers = await getEdgeHeaders();
      const results: Record<string, QuoteData> = {};

      // Batch 5 at a time
      for (let i = 0; i < Math.min(tickers.length, 15); i += 5) {
        const batch = tickers.slice(i, i + 5);
        await Promise.allSettled(
          batch.map(async (t) => {
            try {
              const res = await dedupFetch(
                `${supabaseUrl}/functions/v1/finnhub?endpoint=quote&symbol=${t.symbol}`,
                { headers },
                60_000,
              );
              if (!res.ok) return;
              const q = await res.json();
              if (q?.c) results[t.symbol] = { c: q.c, dp: q.dp ?? 0, d: q.d ?? 0 };
            } catch { /* skip */ }
          }),
        );
      }
      if (!cancelled) setQuotes(results);
    }

    fetchQuotes();
    return () => { cancelled = true; };
  }, [tickers]);

  if (tickers.length === 0) return null;

  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border-dim)",
      borderRadius: 4,
      padding: 12,
    }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "block",
          marginBottom: 8,
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
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tickers.slice(0, 15).map((t) => {
          const q = quotes[t.symbol];
          const changeColor = q ? (q.dp >= 0 ? "var(--positive)" : "var(--negative)") : "var(--text-muted)";

          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.symbol)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 3,
                padding: "8px 14px",
                background: "var(--bg-panel-raised)",
                border: "1px solid var(--border-dim)",
                borderRadius: 6,
                cursor: "pointer",
                flexShrink: 0,
                minWidth: 120,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--signal-core)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-dim)"; }}
            >
              {/* Ticker + Watchers */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}>
                  {t.symbol}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--text-muted)",
                  marginLeft: "auto",
                }}>
                  {t.watchlistCount.toLocaleString()}
                </span>
              </div>

              {/* Title / company hint */}
              {t.title && (
                <span style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 120,
                }}>
                  {t.title}
                </span>
              )}

              {/* Price + Change */}
              {q ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>
                    ${q.c.toFixed(2)}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: changeColor,
                  }}>
                    {q.dp >= 0 ? "+" : ""}{q.dp.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}>
                  ---
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
