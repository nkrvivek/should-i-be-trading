import { useState, useCallback, useEffect } from "react";
import { Panel } from "../layout/Panel";
import { getCredential } from "../../lib/credentials";
import { isSupabaseConfigured } from "../../lib/supabase";

type SectorData = {
  symbol: string;
  name: string;
  change: number;
  price: number;
};

const SECTORS: { symbol: string; name: string; color: string }[] = [
  { symbol: "XLK", name: "Technology", color: "#3B82F6" },
  { symbol: "XLF", name: "Financials", color: "#10B981" },
  { symbol: "XLV", name: "Healthcare", color: "#EC4899" },
  { symbol: "XLY", name: "Cons. Disc.", color: "#F59E0B" },
  { symbol: "XLP", name: "Cons. Staples", color: "#8B5CF6" },
  { symbol: "XLE", name: "Energy", color: "#EF4444" },
  { symbol: "XLI", name: "Industrials", color: "#6366F1" },
  { symbol: "XLB", name: "Materials", color: "#14B8A6" },
  { symbol: "XLRE", name: "Real Estate", color: "#F97316" },
  { symbol: "XLC", name: "Comm. Svcs", color: "#06B6D4" },
  { symbol: "XLU", name: "Utilities", color: "#84CC16" },
];

const CACHE_KEY = "sibt_sector_heatmap";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export function SectorHeatMap() {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSectors = useCallback(async () => {
    const apiKey = getCredential("finnhub");
    const useEdge = !apiKey && isSupabaseConfigured();

    if (!apiKey && !useEdge) {
      setError("Finnhub API key required. Add in Settings or sign up for automatic access.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results: SectorData[] = [];

      // Fetch in batches of 4 to respect rate limits
      for (let i = 0; i < SECTORS.length; i += 4) {
        const batch = SECTORS.slice(i, i + 4);
        const promises = batch.map(async (s) => {
          try {
            let res: Response;
            if (useEdge) {
              const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finnhub?endpoint=quote&symbol=${s.symbol}`;
              res = await fetch(edgeUrl, {
                headers: {
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
              });
            } else {
              res = await fetch(`/finnhub-api/api/v1/quote?symbol=${s.symbol}&token=${apiKey}`);
            }
            if (!res.ok) return null;
            const q = await res.json();
            return {
              symbol: s.symbol,
              name: s.name,
              change: q.dp ?? 0,
              price: q.c ?? 0,
            };
          } catch { return null; }
        });
        const batchResults = await Promise.all(promises);
        for (const r of batchResults) { if (r) results.push(r); }
        if (i + 4 < SECTORS.length) await new Promise((r) => setTimeout(r, 600));
      }

      results.sort((a, b) => b.change - a.change);
      setSectors(results);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: results, ts: Date.now() }));
      } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setSectors(data);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchSectors();
  }, [fetchSectors]);

  return (
    <Panel title="Sector Performance" onRefresh={fetchSectors} loading={loading} className="sector-heatmap-panel">
      {error && (
        <div style={{
          padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)",
          border: "1px solid var(--negative)", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)", marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      {sectors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Heat map grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 6,
          }}>
            {sectors.map((s) => {
              const isPositive = s.change >= 0;
              const intensity = Math.min(1, Math.abs(s.change) / 3); // normalize to 3% max
              const bgColor = isPositive
                ? `rgba(5, 173, 152, ${0.08 + intensity * 0.25})`
                : `rgba(232, 93, 108, ${0.08 + intensity * 0.25})`;
              const borderColor = isPositive
                ? `rgba(5, 173, 152, ${0.2 + intensity * 0.4})`
                : `rgba(232, 93, 108, ${0.2 + intensity * 0.4})`;

              return (
                <div
                  key={s.symbol}
                  style={{
                    padding: "10px 12px",
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 4,
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                    color: "var(--text-primary)", marginBottom: 2,
                  }}>
                    {s.symbol}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-sans)", fontSize: 11,
                    color: "var(--text-muted)", marginBottom: 4,
                  }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
                    color: isPositive ? "var(--positive)" : "var(--negative)",
                  }}>
                    {isPositive ? "+" : ""}{s.change.toFixed(2)}%
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 12,
                    color: "var(--text-muted)", marginTop: 2,
                  }}>
                    ${s.price.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart view */}
          <div style={{ marginTop: 8 }}>
            {sectors.map((s) => {
              const maxAbsChange = Math.max(...sectors.map((x) => Math.abs(x.change)), 1);
              const width = (Math.abs(s.change) / maxAbsChange) * 100;
              const isPositive = s.change >= 0;

              return (
                <div key={s.symbol} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, width: 40, textAlign: "right", color: "var(--text-muted)" }}>
                    {s.symbol}
                  </span>
                  <div style={{ flex: 1, height: 14, background: "var(--border-dim)", borderRadius: 2, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      position: "absolute",
                      left: isPositive ? "50%" : `${50 - width / 2}%`,
                      width: `${width / 2}%`,
                      height: "100%",
                      background: isPositive ? "var(--positive)" : "var(--negative)",
                      borderRadius: 2,
                      opacity: 0.7,
                      transition: "width 0.3s",
                    }} />
                    <div style={{
                      position: "absolute", left: "50%", top: 0, width: 1, height: "100%",
                      background: "var(--text-muted)", opacity: 0.3,
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 12, width: 55, textAlign: "right",
                    color: isPositive ? "var(--positive)" : "var(--negative)", fontWeight: 600,
                  }}>
                    {isPositive ? "+" : ""}{s.change.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
