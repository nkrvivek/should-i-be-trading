import { useState, useCallback, useEffect } from "react";
import { Panel } from "../layout/Panel";

type CongressTrade = {
  name: string;
  party: string;
  chamber: string;
  state_abbreviation: string;
  state_name: string;
  company: string;
  ticker: string;
  trade_date: string;
  days_until_disclosure: number;
  trade_type: string; // "buy" | "sell"
  trade_amount: string;
  value_at_purchase: string;
};

const API_URL = "https://politician-trade-tracker1.p.rapidapi.com/get_latest_trades";
const CACHE_KEY = "sibt_congress_cache_v2";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cleanTicker(raw: string): string {
  // API returns "CVX:US" format — strip the :US suffix
  return raw.replace(/:US$/i, "").trim();
}

function parseAmount(amount: string): { label: string; midpoint: number } {
  // Amounts like "1K-15K", "15K-50K", "50K-100K", "100K-250K", "250K-500K", "500K-1M", "1M-5M"
  const ranges: Record<string, { label: string; midpoint: number }> = {
    "1K-15K": { label: "$1K - $15K", midpoint: 8000 },
    "15K-50K": { label: "$15K - $50K", midpoint: 32500 },
    "50K-100K": { label: "$50K - $100K", midpoint: 75000 },
    "100K-250K": { label: "$100K - $250K", midpoint: 175000 },
    "250K-500K": { label: "$250K - $500K", midpoint: 375000 },
    "500K-1M": { label: "$500K - $1M", midpoint: 750000 },
    "1M-5M": { label: "$1M - $5M", midpoint: 3000000 },
    "5M-25M": { label: "$5M - $25M", midpoint: 15000000 },
    "25M-50M": { label: "$25M - $50M", midpoint: 37500000 },
  };
  return ranges[amount] ?? { label: amount || "N/A", midpoint: 0 };
}

function partyColor(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("republican") || p === "r") return "#E85D6C";
  if (p.includes("democrat") || p === "d") return "#5B8DEF";
  return "var(--text-muted)";
}

function partyBadge(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("republican") || p === "r") return "R";
  if (p.includes("democrat") || p === "d") return "D";
  if (p.includes("independent") || p === "i") return "I";
  return "?";
}

export function CongressTradingPanel() {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");

  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;

  const fetchTrades = useCallback(async () => {
    if (!apiKey) {
      setError("RapidAPI key not configured. Add VITE_RAPIDAPI_KEY to .env");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "politician-trade-tracker1.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      });
      if (!res.ok) throw new Error(`Politician Trade Tracker error: ${res.status}`);

      const data: CongressTrade[] = await res.json();

      // Filter out entries without valid tickers
      const valid = data.filter((t) => t.ticker && t.ticker !== "--" && t.name);

      setTrades(valid);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: valid, ts: Date.now() }));
      } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch congressional trades");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Load cache on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setTrades(data);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchTrades();
  }, [fetchTrades]);

  const filtered = filter === "all"
    ? trades
    : trades.filter((t) => t.trade_type === filter);

  const buyCount = trades.filter((t) => t.trade_type === "buy").length;
  const sellCount = trades.filter((t) => t.trade_type === "sell").length;

  // Top traded tickers
  const tickerCounts = new Map<string, number>();
  for (const t of trades) {
    const clean = cleanTicker(t.ticker);
    tickerCounts.set(clean, (tickerCounts.get(clean) ?? 0) + 1);
  }
  const topTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top traders by trade count
  const traderCounts = new Map<string, { count: number; party: string }>();
  for (const t of trades) {
    const existing = traderCounts.get(t.name);
    if (existing) existing.count++;
    else traderCounts.set(t.name, { count: 1, party: t.party });
  }
  const topTraders = [...traderCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <Panel title="Congressional Trading" onRefresh={fetchTrades} loading={loading}>
      {error && (
        <div style={{
          padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)",
          border: "1px solid var(--negative)", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)", marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      {trades.length === 0 && !loading && !error && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <button onClick={fetchTrades} style={{
            padding: "8px 24px", background: "var(--signal-core)", color: "#000",
            border: "none", borderRadius: 4, fontFamily: "var(--font-mono)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            LOAD CONGRESS TRADES
          </button>
          <div style={{ marginTop: 8, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
            Recent stock trades by US politicians (STOCK Act disclosures).
          </div>
        </div>
      )}

      {trades.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Summary + Filter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <SummaryPill label="Buys" count={buyCount} tone="positive" active={filter === "buy"} onClick={() => setFilter(filter === "buy" ? "all" : "buy")} />
              <SummaryPill label="Sells" count={sellCount} tone="negative" active={filter === "sell"} onClick={() => setFilter(filter === "sell" ? "all" : "sell")} />
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} style={{
                  background: "none", border: "none", fontFamily: "var(--font-mono)",
                  fontSize: 9, color: "var(--text-muted)", cursor: "pointer", padding: "2px 6px",
                }}>
                  CLEAR
                </button>
              )}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
              {filtered.length} trades
            </span>
          </div>

          {/* Top politicians */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topTraders.map(([name, { count, party }]) => (
              <span key={name} style={{
                padding: "2px 8px", borderRadius: 999,
                border: `1px solid ${partyColor(party)}33`,
                background: `${partyColor(party)}11`,
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)",
              }}>
                <span style={{ color: partyColor(party), fontWeight: 600, marginRight: 2 }}>
                  {partyBadge(party)}
                </span>
                {name.split(" ").pop()} <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{count}</span>
              </span>
            ))}
          </div>

          {/* Top traded tickers */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topTickers.map(([ticker, count]) => (
              <span key={ticker} style={{
                padding: "2px 8px", borderRadius: 999,
                border: "1px solid var(--border-dim)", background: "var(--bg-panel-raised)",
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)",
              }}>
                {ticker} <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{count}</span>
              </span>
            ))}
          </div>

          {/* Table */}
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <Th>Date</Th>
                  <Th>Politician</Th>
                  <Th>Ticker</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Price</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((t, i) => {
                  const isBuy = t.trade_type === "buy";
                  return (
                    <tr key={`${t.ticker}-${t.trade_date}-${t.name}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={tdStyle}>{t.trade_date}</td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block", width: 14, height: 14, lineHeight: "14px",
                          textAlign: "center", borderRadius: 2, fontSize: 8, fontWeight: 700,
                          color: "#fff", background: partyColor(t.party), marginRight: 4,
                          verticalAlign: "middle",
                        }}>
                          {partyBadge(t.party)}
                        </span>
                        {t.name}
                        {t.state_abbreviation && (
                          <span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 4 }}>
                            ({t.state_abbreviation})
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{cleanTicker(t.ticker)}</td>
                      <td style={{
                        ...tdStyle,
                        color: isBuy ? "var(--positive)" : "var(--negative)",
                        fontWeight: 600,
                      }}>
                        {isBuy ? "BUY" : "SELL"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-secondary)" }}>
                        {parseAmount(t.trade_amount).label}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-secondary)" }}>
                        {t.value_at_purchase || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
            Source: Politician Trade Tracker (STOCK Act disclosures) via RapidAPI
          </div>
        </div>
      )}
    </Panel>
  );
}

function SummaryPill({ label, count, tone, active, onClick }: {
  label: string; count: number; tone: "positive" | "negative"; active: boolean; onClick: () => void;
}) {
  const color = tone === "positive" ? "var(--positive)" : "var(--negative)";
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999,
      border: `1px solid ${active ? color : "var(--border-dim)"}`,
      background: active ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
      fontFamily: "var(--font-mono)", fontSize: 10, color: active ? color : "var(--text-muted)",
      cursor: "pointer", fontWeight: active ? 600 : 400,
    }}>
      {label} <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{
      padding: "6px 8px", textAlign: align, fontSize: 9,
      color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
      position: "sticky", top: 0, background: "var(--bg-panel)", fontWeight: 500,
    }}>
      {children}
    </th>
  );
}

const tdStyle: React.CSSProperties = { padding: "5px 8px", whiteSpace: "nowrap" };
