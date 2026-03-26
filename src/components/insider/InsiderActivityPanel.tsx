import { useState, useEffect } from "react";
import { Panel } from "../layout/Panel";
import { useInsiderTrading } from "../../hooks/useInsiderTrading";
import { getCredential } from "../../lib/credentials";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getEdgeHeaders } from "../../api/edgeHeaders";
import type { InsiderActivitySummary, InsiderSignal, InsiderTransaction } from "../../api/types";

// Simple company name lookup cache
const companyCache = new Map<string, { name: string; sector: string }>();

async function fetchCompanyInfo(symbol: string): Promise<{ name: string; sector: string } | null> {
  const cached = companyCache.get(symbol);
  if (cached) return cached;

  try {
    let res: Response;
    const apiKey = getCredential("finnhub");

    if (apiKey) {
      res = await fetch(`/finnhub-api/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`);
    } else if (isSupabaseConfigured()) {
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finnhub?endpoint=stock/profile2&symbol=${encodeURIComponent(symbol)}`;
      const edgeHeaders = await getEdgeHeaders();
      res = await fetch(edgeUrl, {
        headers: edgeHeaders,
      });
    } else {
      return null;
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (data.name) {
      const info = { name: data.name, sector: data.finnhubIndustry ?? "" };
      companyCache.set(symbol, info);
      return info;
    }
  } catch { /* ignore */ }
  return null;
}

const SIGNAL_CONFIG: Record<InsiderSignal, { label: string; color: string; icon: string }> = {
  HEAVY_BUYING: { label: "HEAVY BUYING", color: "var(--positive)", icon: "\u25b2\u25b2" },
  NET_BUYING: { label: "NET BUYING", color: "var(--positive)", icon: "\u25b2" },
  NEUTRAL: { label: "NEUTRAL", color: "var(--text-muted)", icon: "\u2500" },
  NET_SELLING: { label: "NET SELLING", color: "var(--negative)", icon: "\u25bc" },
  HEAVY_SELLING: { label: "HEAVY SELLING", color: "var(--negative)", icon: "\u25bc\u25bc" },
};

type TimePeriod = "1w" | "1m" | "1q" | "6m";
const PERIOD_LABELS: Record<TimePeriod, string> = { "1w": "1 Week", "1m": "1 Month", "1q": "1 Quarter", "6m": "6 Months" };
const PERIOD_DAYS: Record<TimePeriod, number> = { "1w": 7, "1m": 30, "1q": 90, "6m": 180 };

function formatDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatShares(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d.slice(5); // fallback: MM-DD
  }
}

function SignalBadge({ signal }: { signal: InsiderSignal }) {
  const cfg = SIGNAL_CONFIG[signal];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      border: `1px solid ${cfg.color}`,
      fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
      color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const barColor = score > 0 ? "var(--positive)" : score < 0 ? "var(--negative)" : "var(--text-muted)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
        <span>SELL</span>
        <span style={{ color: barColor, fontWeight: 600 }}>{score > 0 ? "+" : ""}{score}</span>
        <span>BUY</span>
      </div>
      <div style={{ height: 6, background: "var(--border-dim)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%", width: "100%",
          background: "linear-gradient(to right, var(--negative), var(--text-muted), var(--positive))",
          opacity: 0.3, borderRadius: 3,
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: 1, height: "100%",
          background: "var(--text-muted)", transform: "translateY(-50%)", opacity: 0.5,
        }} />
        <div style={{
          position: "absolute", top: -2, left: `${pct}%`, width: 10, height: 10,
          borderRadius: "50%", background: barColor,
          border: "2px solid var(--bg-panel)", transform: "translateX(-50%)",
        }} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  const color = tone === "positive" ? "var(--positive)" : tone === "negative" ? "var(--negative)" : "var(--text-primary)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function TransactionRow({ t }: { t: InsiderTransaction }) {
  const isBuy = t.transactionCode === "P" || t.change > 0;
  const value = Math.abs(t.change) * (t.transactionPrice || 0);

  return (
    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
      <td style={tdStyle}>{formatDate(t.transactionDate)}</td>
      <td style={{ ...tdStyle, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {t.name}
        {t.officerTitle && (
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 3 }}>
            ({t.officerTitle})
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, color: isBuy ? "var(--positive)" : "var(--negative)", fontWeight: 600 }}>
        {isBuy ? "BUY" : "SELL"}
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        {formatShares(Math.abs(t.change))}
      </td>
      <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-muted)" }}>
        {t.transactionPrice > 0 ? `$${t.transactionPrice.toFixed(2)}` : "---"}
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        {value > 0 ? formatDollar(value) : "---"}
      </td>
      {t.securityTitle && (
        <td style={{ ...tdStyle, fontSize: 10, color: "var(--text-muted)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.securityTitle}
        </td>
      )}
    </tr>
  );
}

function filterByPeriod(transactions: InsiderTransaction[], period: TimePeriod): InsiderTransaction[] {
  const days = PERIOD_DAYS[period];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return transactions.filter((t) => t.transactionDate >= cutoffStr);
}

const PAGE_SIZE = 20;

function SummaryView({ data }: { data: InsiderActivitySummary }) {
  const [page, setPage] = useState(0);
  const [period, setPeriod] = useState<TimePeriod>("1q");

  const filteredTx = filterByPeriod(data.transactions, period);
  const totalPages = Math.ceil(filteredTx.length / PAGE_SIZE);
  const visibleTx = filteredTx.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when period changes
  const handlePeriodChange = (p: TimePeriod) => { setPeriod(p); setPage(0); };

  // Recompute metrics for filtered period
  let periodBuys = 0, periodSells = 0, periodBuyVal = 0, periodSellVal = 0;
  for (const t of filteredTx) {
    const val = Math.abs(t.change) * (t.transactionPrice || 0);
    if (t.transactionCode === "P" || t.change > 0) { periodBuys++; periodBuyVal += val; }
    else if (t.transactionCode === "S" || t.change < 0) { periodSells++; periodSellVal += val; }
  }

  // Show sector if available
  const sector = data.transactions.find((t) => t.sector)?.sector;

  const hasSecurityTitle = filteredTx.some((t) => t.securityTitle);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Signal + Period Filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SignalBadge signal={data.signal} />
        <div style={{ display: "flex", gap: 2 }}>
          {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              style={{
                padding: "2px 8px", borderRadius: 999,
                border: `1px solid ${period === p ? "var(--signal-core)" : "var(--border-dim)"}`,
                background: period === p ? "rgba(5, 173, 152, 0.1)" : "transparent",
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: period === p ? "var(--signal-core)" : "var(--text-muted)",
                cursor: "pointer", fontWeight: period === p ? 600 : 400,
              }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {sector && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          Sector: <span style={{ color: "var(--text-secondary)" }}>{sector}</span>
        </div>
      )}

      <ScoreBar score={data.signalScore} />

      {/* Metrics Grid */}
      <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
        <MetricRow
          label="Buy Transactions"
          value={`${periodBuys} (${formatDollar(periodBuyVal)})`}
          tone={periodBuys > 0 ? "positive" : "neutral"}
        />
        <MetricRow
          label="Sell Transactions"
          value={`${periodSells} (${formatDollar(periodSellVal)})`}
          tone={periodSells > 0 ? "negative" : "neutral"}
        />
        <MetricRow
          label="Net Value"
          value={`${periodBuyVal - periodSellVal >= 0 ? "+" : ""}${formatDollar(periodBuyVal - periodSellVal)}`}
          tone={periodBuyVal - periodSellVal > 0 ? "positive" : periodBuyVal - periodSellVal < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Transaction Table */}
      {filteredTx.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
          <div style={{ maxHeight: 350, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Insider</th>
                  <th style={thStyle}>Type</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Shares</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Value</th>
                  {hasSecurityTitle && <th style={thStyle}>Security</th>}
                </tr>
              </thead>
              <tbody>
                {visibleTx.map((t, i) => (
                  <TransactionRow key={`${t.name}-${t.transactionDate}-${i}`} t={t} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12,
            }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: "3px 10px", borderRadius: 4,
                  border: "1px solid var(--border-dim)", background: "transparent",
                  color: page === 0 ? "var(--text-muted)" : "var(--signal-core)",
                  cursor: page === 0 ? "default" : "pointer", fontFamily: "var(--font-mono)", fontSize: 12,
                }}
              >
                PREV
              </button>
              <span style={{ color: "var(--text-muted)" }}>
                Page {page + 1} of {totalPages} ({filteredTx.length} transactions)
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: "3px 10px", borderRadius: 4,
                  border: "1px solid var(--border-dim)", background: "transparent",
                  color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--signal-core)",
                  cursor: page >= totalPages - 1 ? "default" : "pointer", fontFamily: "var(--font-mono)", fontSize: 12,
                }}
              >
                NEXT
              </button>
            </div>
          )}
        </div>
      )}

      {filteredTx.length === 0 && (
        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
          No transactions in the {PERIOD_LABELS[period]} window.
        </div>
      )}

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        {filteredTx.length} transactions in {PERIOD_LABELS[period]} window
      </div>
    </div>
  );
}

type Props = {
  symbol?: string;
};

export function InsiderActivityPanel({ symbol = "AAPL" }: Props) {
  const [inputSymbol, setInputSymbol] = useState(symbol);
  const [activeSymbol, setActiveSymbol] = useState(symbol);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; sector: string } | null>(null);
  const { data, loading, error, refresh } = useInsiderTrading(activeSymbol || null);

  // Fetch company info only when insider data loads (avoids showing name before data)
  useEffect(() => {
    if (!activeSymbol) { setCompanyInfo(null); return; }
    if (!data && !error) return; // Wait for insider data first
    fetchCompanyInfo(activeSymbol).then(setCompanyInfo);
  }, [activeSymbol, data, error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = inputSymbol.trim().toUpperCase();
    if (s) setActiveSymbol(s);
  };

  return (
    <Panel title="Insider Activity" onRefresh={refresh} loading={loading}>
      {/* Search input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: companyInfo ? 4 : 12 }}>
        <input
          type="text"
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          placeholder="AAPL"
          style={{
            flex: 1, padding: "6px 10px",
            background: "var(--bg-panel-raised)", border: "1px solid var(--border-dim)",
            borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 14,
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!inputSymbol.trim()}
          style={{
            padding: "6px 14px", background: "var(--signal-core)",
            color: "#000", border: "none", borderRadius: 4,
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
            cursor: inputSymbol.trim() ? "pointer" : "not-allowed",
            opacity: inputSymbol.trim() ? 1 : 0.5,
          }}
        >
          SCAN
        </button>
      </form>

      {/* Company name + sector */}
      {companyInfo && (
        <div style={{ marginBottom: 10, fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{companyInfo.name}</span>
          {companyInfo.sector && (
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>
              {companyInfo.sector}
            </span>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)",
          border: "1px solid var(--negative)", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)",
        }}>
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{
          padding: "20px 0", textAlign: "center",
          fontFamily: "var(--font-sans)", fontSize: 14,
          color: "var(--text-muted)", lineHeight: 1.6,
        }}>
          Enter a ticker to scan SEC Form 4 insider filings.
          <br />
          <span style={{ fontSize: 12 }}>Tracks insider buys and sells with dates, quantities, and values.</span>
        </div>
      )}

      {data && <SummaryView data={data} />}
    </Panel>
  );
}

const thStyle: React.CSSProperties = {
  padding: "4px 6px", textAlign: "left", fontSize: 11,
  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
  position: "sticky", top: 0, background: "var(--bg-panel)", fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "4px 6px", whiteSpace: "nowrap",
};
