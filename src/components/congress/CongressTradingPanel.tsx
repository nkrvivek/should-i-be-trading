import { useState, useCallback, useEffect } from "react";
import { Panel } from "../layout/Panel";
import { getCredential } from "../../lib/credentials";

type CongressTrade = {
  symbol: string;
  name: string;
  transactionDate: string;
  transactionType: string;
  amountFrom: number;
  amountTo: number;
  filingDate: string;
  ownerType: string;
  position: string;
  chamber?: string;
};

const CACHE_KEY = "sibt_congress_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function formatAmount(from: number, to: number): string {
  if (from && to) {
    return `$${formatK(from)} - $${formatK(to)}`;
  }
  if (to) return `up to $${formatK(to)}`;
  if (from) return `$${formatK(from)}+`;
  return "N/A";
}

function formatK(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}

export function CongressTradingPanel() {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "purchase" | "sale">("all");

  const fetchTrades = useCallback(async () => {
    const apiKey = getCredential("finnhub");
    if (!apiKey) {
      setError("Finnhub API key required. Add it in Settings.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch congressional trading from Finnhub
      const res = await fetch(`/finnhub-api/api/v1/stock/congressional-trading?token=${apiKey}`);
      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limited — try again in a minute");
        throw new Error(`Finnhub error: ${res.status}`);
      }

      const json = await res.json();
      const rawTrades: CongressTrade[] = (json.data ?? []).map((t: Record<string, unknown>) => ({
        symbol: t.symbol ?? "",
        name: t.name ?? "",
        transactionDate: t.transactionDate ?? "",
        transactionType: t.transactionType ?? "",
        amountFrom: t.amountFrom ?? 0,
        amountTo: t.amountTo ?? 0,
        filingDate: t.filingDate ?? "",
        ownerType: t.ownerType ?? "",
        position: t.position ?? "",
      }));

      // Sort by transaction date descending
      rawTrades.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
      setTrades(rawTrades.slice(0, 200));

      // Cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rawTrades.slice(0, 200), ts: Date.now() }));
      } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
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
    : trades.filter((t) => t.transactionType.toLowerCase().includes(filter));

  const purchaseCount = trades.filter((t) => t.transactionType.toLowerCase().includes("purchase")).length;
  const saleCount = trades.filter((t) => t.transactionType.toLowerCase().includes("sale")).length;

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
          <button onClick={fetchTrades} disabled={!getCredential("finnhub")} style={{
            padding: "8px 24px", background: "var(--signal-core)", color: "#000",
            border: "none", borderRadius: 4, fontFamily: "var(--font-mono)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            LOAD CONGRESS TRADES
          </button>
          <div style={{ marginTop: 8, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
            Recent stock trades by members of the US Congress (STOCK Act disclosures).
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
              {filtered.length} trades
            </span>
          </div>

          {/* Table */}
          <div style={{ maxHeight: 450, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <Th>Date</Th>
                  <Th>Member</Th>
                  <Th>Ticker</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((t, i) => {
                  const isBuy = t.transactionType.toLowerCase().includes("purchase");
                  return (
                    <tr key={`${t.symbol}-${t.transactionDate}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={tdStyle}>{t.transactionDate}</td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.name}
                        {t.position && <span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 4 }}>({t.position})</span>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{t.symbol}</td>
                      <td style={{ ...tdStyle, color: isBuy ? "var(--positive)" : "var(--negative)", fontWeight: 600 }}>
                        {isBuy ? "BUY" : "SELL"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-secondary)" }}>
                        {formatAmount(t.amountFrom, t.amountTo)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
