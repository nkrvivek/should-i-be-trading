import { useState, useCallback, useEffect } from "react";
import { Panel } from "../layout/Panel";
import { hasUWToken, fetchUWCongressTrades, type UWCongressTrade } from "../../api/uwClient";
import { isSupabaseConfigured } from "../../lib/supabase";

type NormalizedTrade = {
  name: string;
  party: string;
  chamber: string;
  state: string;
  ticker: string;
  tradeDate: string;
  tradeType: "buy" | "sell" | "other";
  amount: string;
  price: string;
  filedDate: string;
};

type RapidAPITrade = {
  name: string;
  party: string;
  chamber: string;
  state_abbreviation: string;
  ticker: string;
  trade_date: string;
  trade_type: string;
  trade_amount: string;
  value_at_purchase: string;
};

const RAPIDAPI_URL = "https://politician-trade-tracker1.p.rapidapi.com/get_latest_trades";
const CACHE_KEY = "sibt_congress_cache_v3";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function normalizeUWTrade(t: UWCongressTrade): NormalizedTrade | null {
  if (!t.ticker) return null;
  const txn = t.txn_type?.toLowerCase() ?? "";
  const tradeType: "buy" | "sell" | "other" = txn.includes("buy") || txn.includes("purchase")
    ? "buy" : txn.includes("sell") || txn.includes("sale") ? "sell" : "other";

  return {
    name: t.name,
    party: "", // UW doesn't return party directly
    chamber: t.member_type === "senate" ? "Senate" : "House",
    state: "",
    ticker: t.ticker,
    tradeDate: t.transaction_date,
    tradeType,
    amount: t.amounts,
    price: "",
    filedDate: t.filed_at_date,
  };
}

function normalizeRapidAPITrade(t: RapidAPITrade): NormalizedTrade | null {
  const ticker = t.ticker?.replace(/:US$/i, "").trim();
  if (!ticker) return null;

  return {
    name: t.name,
    party: t.party ?? "",
    chamber: t.chamber ?? "",
    state: t.state_abbreviation ?? "",
    ticker,
    tradeDate: t.trade_date,
    tradeType: t.trade_type === "buy" ? "buy" : t.trade_type === "sell" ? "sell" : "other",
    amount: formatAmountRange(t.trade_amount),
    price: t.value_at_purchase ?? "",
    filedDate: "",
  };
}

function formatAmountRange(amount: string): string {
  const ranges: Record<string, string> = {
    "1K-15K": "$1K - $15K", "15K-50K": "$15K - $50K", "50K-100K": "$50K - $100K",
    "100K-250K": "$100K - $250K", "250K-500K": "$250K - $500K",
    "500K-1M": "$500K - $1M", "1M-5M": "$1M - $5M", "5M-25M": "$5M - $25M",
  };
  return ranges[amount] ?? amount ?? "N/A";
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
  return "";
}

export function CongressTradingPanel() {
  const [trades, setTrades] = useState<NormalizedTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [source, setSource] = useState<"uw" | "rapidapi" | "">("")
  const [page, setPage] = useState(0);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Strategy 1: UW (Pro users with UW_TOKEN)
    if (hasUWToken()) {
      try {
        const raw = await fetchUWCongressTrades();
        const normalized = raw.map(normalizeUWTrade).filter(Boolean) as NormalizedTrade[];
        if (normalized.length > 0) {
          setTrades(normalized);
          setSource("uw");
          cacheResults(normalized, "uw");
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("UW congress fetch failed, falling back:", e);
      }
    }

    // Strategy 2: Server-side RapidAPI via Supabase Edge Function (free tier, no client key needed)
    if (isSupabaseConfigured()) {
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-congress`;
        const res = await fetch(edgeUrl, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });
        if (res.ok) {
          const data: RapidAPITrade[] = await res.json();
          const normalized = data.map(normalizeRapidAPITrade).filter(Boolean) as NormalizedTrade[];
          if (normalized.length > 0) {
            setTrades(normalized);
            setSource("rapidapi");
            cacheResults(normalized, "rapidapi");
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Edge proxy-congress failed, falling back:", e);
      }
    }

    // Strategy 3: Direct RapidAPI (if user has their own key in env)
    const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
    if (rapidApiKey) {
      try {
        const res = await fetch(RAPIDAPI_URL, {
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "politician-trade-tracker1.p.rapidapi.com",
            "x-rapidapi-key": rapidApiKey,
          },
        });
        if (!res.ok) throw new Error(`RapidAPI error: ${res.status}`);
        const data: RapidAPITrade[] = await res.json();
        const normalized = data.map(normalizeRapidAPITrade).filter(Boolean) as NormalizedTrade[];
        setTrades(normalized);
        setSource("rapidapi");
        cacheResults(normalized, "rapidapi");
        setLoading(false);
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch congressional trades");
      }
    }

    setError("Congressional trading data unavailable. Sign up for automatic access or add a UW_TOKEN in Settings for premium data.");
    setLoading(false);
  }, []);

  function cacheResults(data: NormalizedTrade[], src: string) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, source: src, ts: Date.now() }));
    } catch { /* ignore */ }
  }

  // Load cache on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, source: src, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setTrades(data);
          setSource(src);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchTrades();
  }, [fetchTrades]);

  const filtered = filter === "all" ? trades : trades.filter((t) => t.tradeType === filter);
  const PAGE_SIZE = 25;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filter changes
  const handleFilter = (f: "all" | "buy" | "sell") => { setFilter(f === filter ? "all" : f); setPage(0); };

  const buyCount = trades.filter((t) => t.tradeType === "buy").length;
  const sellCount = trades.filter((t) => t.tradeType === "sell").length;

  // Top traded tickers
  const tickerCounts = new Map<string, number>();
  for (const t of trades) tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) ?? 0) + 1);
  const topTickers = [...tickerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Top traders
  const traderCounts = new Map<string, { count: number; party: string }>();
  for (const t of trades) {
    const existing = traderCounts.get(t.name);
    if (existing) existing.count++;
    else traderCounts.set(t.name, { count: 1, party: t.party });
  }
  const topTraders = [...traderCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  const sourceLabel = source === "uw" ? "Unusual Whales (premium)" : "Politician Trade Tracker (RapidAPI)";

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
              <SummaryPill label="Buys" count={buyCount} tone="positive" active={filter === "buy"} onClick={() => handleFilter("buy")} />
              <SummaryPill label="Sells" count={sellCount} tone="negative" active={filter === "sell"} onClick={() => handleFilter("sell")} />
              {filter !== "all" && (
                <button onClick={() => handleFilter("all")} style={{
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
                border: party ? `1px solid ${partyColor(party)}33` : "1px solid var(--border-dim)",
                background: party ? `${partyColor(party)}11` : "var(--bg-panel-raised)",
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)",
              }}>
                {party && (
                  <span style={{ color: partyColor(party), fontWeight: 600, marginRight: 2 }}>
                    {partyBadge(party)}
                  </span>
                )}
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
                  {source !== "uw" && <Th align="right">Price</Th>}
                  {source === "uw" && <Th>Filed</Th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((t, i) => {
                  const isBuy = t.tradeType === "buy";
                  return (
                    <tr key={`${t.ticker}-${t.tradeDate}-${t.name}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={tdStyle}>{t.tradeDate}</td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.party && (
                          <span style={{
                            display: "inline-block", width: 14, height: 14, lineHeight: "14px",
                            textAlign: "center", borderRadius: 2, fontSize: 8, fontWeight: 700,
                            color: "#fff", background: partyColor(t.party), marginRight: 4,
                            verticalAlign: "middle",
                          }}>
                            {partyBadge(t.party)}
                          </span>
                        )}
                        {t.name}
                        {t.state && (
                          <span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 4 }}>({t.state})</span>
                        )}
                        {t.chamber && !t.state && (
                          <span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 4 }}>({t.chamber})</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{t.ticker}</td>
                      <td style={{
                        ...tdStyle,
                        color: isBuy ? "var(--positive)" : t.tradeType === "sell" ? "var(--negative)" : "var(--text-muted)",
                        fontWeight: 600,
                      }}>
                        {isBuy ? "BUY" : t.tradeType === "sell" ? "SELL" : t.tradeType.toUpperCase()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-secondary)" }}>{t.amount}</td>
                      {source !== "uw" && (
                        <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-secondary)" }}>{t.price || "N/A"}</td>
                      )}
                      {source === "uw" && (
                        <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 9 }}>{t.filedDate}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: "var(--font-mono)", fontSize: 10,
            }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: "3px 10px", borderRadius: 4,
                  border: "1px solid var(--border-dim)", background: "transparent",
                  color: page === 0 ? "var(--text-muted)" : "var(--signal-core)",
                  cursor: page === 0 ? "default" : "pointer", fontFamily: "var(--font-mono)", fontSize: 10,
                }}
              >
                PREV
              </button>
              <span style={{ color: "var(--text-muted)" }}>
                Page {page + 1} of {totalPages} ({filtered.length} trades)
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: "3px 10px", borderRadius: 4,
                  border: "1px solid var(--border-dim)", background: "transparent",
                  color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--signal-core)",
                  cursor: page >= totalPages - 1 ? "default" : "pointer", fontFamily: "var(--font-mono)", fontSize: 10,
                }}
              >
                NEXT
              </button>
            </div>
          )}

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
            Source: {sourceLabel}
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
