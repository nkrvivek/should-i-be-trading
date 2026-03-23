import { useState, useCallback, useEffect } from "react";
import { Panel } from "../layout/Panel";

type CongressTrade = {
  ticker: string;
  representative: string;
  transaction_date: string;
  type: string; // "purchase" | "sale_full" | "sale_partial" | "exchange"
  amount: string;
  district: string;
  state: string;
  disclosure_date: string;
  asset_description: string;
};

const HOUSE_DATA_URL = "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json";
const CACHE_KEY = "sibt_congress_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour (data updates infrequently)

function parseAmountRange(amount: string): { from: number; to: number } {
  // Amounts like "$1,001 - $15,000" or "$15,001 - $50,000"
  const nums = amount.replace(/[$,]/g, "").match(/\d+/g);
  if (!nums) return { from: 0, to: 0 };
  return { from: parseInt(nums[0]) || 0, to: parseInt(nums[1]) || parseInt(nums[0]) || 0 };
}

function formatAmount(amount: string): string {
  const { from, to } = parseAmountRange(amount);
  if (from && to && from !== to) return `$${formatK(from)} - $${formatK(to)}`;
  if (to) return `$${formatK(to)}`;
  if (from) return `$${formatK(from)}`;
  return amount || "N/A";
}

function formatK(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}

function classifyType(type: string): "purchase" | "sale" | "other" {
  const t = type.toLowerCase();
  if (t.includes("purchase")) return "purchase";
  if (t.includes("sale")) return "sale";
  return "other";
}

export function CongressTradingPanel() {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "purchase" | "sale">("all");

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(HOUSE_DATA_URL);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const allTrades: CongressTrade[] = await res.json();

      // Filter to last 90 days, sort by date descending
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const recent = allTrades
        .filter((t) => t.transaction_date >= cutoffStr && t.ticker && t.ticker !== "--")
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
        .slice(0, 300);

      setTrades(recent);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: recent, ts: Date.now() }));
      } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch congressional trades");
    } finally {
      setLoading(false);
    }
  }, []);

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
    : trades.filter((t) => classifyType(t.type) === filter);

  const purchaseCount = trades.filter((t) => classifyType(t.type) === "purchase").length;
  const saleCount = trades.filter((t) => classifyType(t.type) === "sale").length;

  // Top traded tickers
  const tickerCounts = new Map<string, number>();
  for (const t of trades) {
    tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) ?? 0) + 1);
  }
  const topTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

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
            Recent stock trades by US House members (STOCK Act disclosures). Free, no API key needed.
          </div>
        </div>
      )}

      {trades.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Summary + Filter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <SummaryPill label="Purchases" count={purchaseCount} tone="positive" active={filter === "purchase"} onClick={() => setFilter(filter === "purchase" ? "all" : "purchase")} />
              <SummaryPill label="Sales" count={saleCount} tone="negative" active={filter === "sale"} onClick={() => setFilter(filter === "sale" ? "all" : "sale")} />
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
              {filtered.length} trades (90d)
            </span>
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
                  <Th>Representative</Th>
                  <Th>Ticker</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((t, i) => {
                  const txType = classifyType(t.type);
                  const isBuy = txType === "purchase";
                  return (
                    <tr key={`${t.ticker}-${t.transaction_date}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={tdStyle}>{t.transaction_date}</td>
                      <td style={{ ...tdStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.representative}
                        {t.state && <span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 4 }}>({t.state})</span>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{t.ticker}</td>
                      <td style={{ ...tdStyle, color: isBuy ? "var(--positive)" : txType === "sale" ? "var(--negative)" : "var(--text-muted)", fontWeight: 600 }}>
                        {isBuy ? "BUY" : txType === "sale" ? "SELL" : t.type.toUpperCase()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-secondary)" }}>
                        {formatAmount(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
            Source: House Stock Watcher (STOCK Act disclosures) — free, no API key required
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
