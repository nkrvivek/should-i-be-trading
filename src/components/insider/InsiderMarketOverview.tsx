import { useEffect, useState, useCallback } from "react";
import { Panel } from "../layout/Panel";
import type { InsiderActivitySummary, InsiderSignal } from "../../api/types";
import { getCredential } from "../../lib/credentials";

const SCAN_TICKERS = [
  "AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "TSLA", "AMD", "CRM", "NFLX",
  "AVGO", "ORCL", "ADBE", "INTC", "CSCO", "QCOM", "TXN", "MU", "SNOW", "PLTR",
  "JPM", "BAC", "GS", "MS", "WFC", "C", "BX", "KKR", "SCHW", "AXP",
  "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "BMY", "AMGN",
  "XOM", "CVX", "COP", "SLB", "EOG",
  "DIS", "HD", "MCD", "NKE", "SBUX",
];

function getApiKey(): string | null {
  return getCredential("finnhub");
}

function classifySignal(buyValue: number, sellValue: number): InsiderSignal {
  const total = buyValue + sellValue;
  if (total === 0) return "NEUTRAL";
  const score = ((buyValue - sellValue) / total) * 100;
  if (score >= 40) return "HEAVY_BUYING";
  if (score >= 10) return "NET_BUYING";
  if (score <= -40) return "HEAVY_SELLING";
  if (score <= -10) return "NET_SELLING";
  return "NEUTRAL";
}

type TickerSummary = {
  symbol: string;
  signal: InsiderSignal;
  netValue: number;
  sellValue: number;
  buyValue: number;
  totalTx: number;
};

function formatDollar(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const SIGNAL_COLORS: Record<InsiderSignal, string> = {
  HEAVY_BUYING: "var(--positive)",
  NET_BUYING: "var(--positive)",
  NEUTRAL: "var(--text-muted)",
  NET_SELLING: "var(--negative)",
  HEAVY_SELLING: "var(--negative)",
};

const SIGNAL_LABELS: Record<InsiderSignal, string> = {
  HEAVY_BUYING: "HEAVY BUY",
  NET_BUYING: "NET BUY",
  NEUTRAL: "NEUTRAL",
  NET_SELLING: "NET SELL",
  HEAVY_SELLING: "HEAVY SELL",
};

export function InsiderMarketOverview() {
  const [tickers, setTickers] = useState<TickerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastScan, setLastScan] = useState<string | null>(null);

  const scan = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("Finnhub API key required. Add in Settings or .env.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: SCAN_TICKERS.length });

    const results: TickerSummary[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Batch in groups of 5 to respect Finnhub rate limits (60/min)
    for (let i = 0; i < SCAN_TICKERS.length; i += 5) {
      const batch = SCAN_TICKERS.slice(i, i + 5);
      const promises = batch.map(async (sym) => {
        try {
          const res = await fetch(`/finnhub-api/api/v1/stock/insider-transactions?symbol=${sym}&token=${apiKey}`);
          if (!res.ok) return null;
          const json = await res.json();
          const txs = (json.data ?? []).filter((t: { transactionDate: string }) => t.transactionDate >= cutoffStr);

          let buyValue = 0, sellValue = 0, buys = 0, sells = 0;
          for (const t of txs) {
            const val = Math.abs(t.change) * (t.transactionPrice || 0);
            if (t.transactionCode === "P" || t.change > 0) { buys++; buyValue += val; }
            else if (t.transactionCode === "S" || t.change < 0) { sells++; sellValue += val; }
          }

          if (buys + sells === 0) return null;

          return {
            symbol: sym,
            signal: classifySignal(buyValue, sellValue),
            netValue: buyValue - sellValue,
            sellValue, buyValue,
            totalTx: buys + sells,
          };
        } catch { return null; }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) { if (r) results.push(r); }
      setProgress({ done: Math.min(i + 5, SCAN_TICKERS.length), total: SCAN_TICKERS.length });

      // Rate limit pause between batches
      if (i + 5 < SCAN_TICKERS.length) await new Promise((r) => setTimeout(r, 1200));
    }

    // Sort by absolute net value (most significant first)
    results.sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue));
    setTickers(results);
    setLastScan(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  // Load cached results on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("sibt_insider_overview");
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 30 * 60 * 1000) {
          setTickers(data);
          setLastScan(new Date(ts).toLocaleTimeString());
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Cache results when updated
  useEffect(() => {
    if (tickers.length > 0) {
      try {
        localStorage.setItem("sibt_insider_overview", JSON.stringify({ data: tickers, ts: Date.now() }));
      } catch { /* ignore */ }
    }
  }, [tickers]);

  const heavySellers = tickers.filter((t) => t.signal === "HEAVY_SELLING");
  const netSellers = tickers.filter((t) => t.signal === "NET_SELLING");
  const heavyBuyers = tickers.filter((t) => t.signal === "HEAVY_BUYING");
  const netBuyers = tickers.filter((t) => t.signal === "NET_BUYING");
  const totalSellValue = [...heavySellers, ...netSellers].reduce((s, t) => s + t.sellValue, 0);
  const totalBuyValue = [...heavyBuyers, ...netBuyers].reduce((s, t) => s + t.buyValue, 0);

  return (
    <Panel title="Insider Market Overview" onRefresh={scan} loading={loading}>
      {/* Scan button */}
      {tickers.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <button
            onClick={scan}
            disabled={!getApiKey()}
            style={{
              padding: "8px 24px", background: "var(--signal-core)", color: "#000",
              border: "none", borderRadius: 4, fontFamily: "var(--font-mono)",
              fontSize: 12, fontWeight: 600, cursor: getApiKey() ? "pointer" : "not-allowed",
              opacity: getApiKey() ? 1 : 0.5,
            }}
          >
            SCAN {SCAN_TICKERS.length} TICKERS
          </button>
          <div style={{ marginTop: 8, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
            Scans SEC Form 4 filings across top stocks for insider buying/selling patterns.
          </div>
          {!getApiKey() && (
            <div style={{ marginTop: 4, fontSize: 10, color: "var(--warning)" }}>
              Add Finnhub API key in Settings first.
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div style={{ padding: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
            <span>Scanning insider filings...</span>
            <span>{progress.done}/{progress.total}</span>
          </div>
          <div style={{ height: 4, background: "var(--border-dim)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`,
              background: "var(--signal-core)", borderRadius: 2, transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)",
          border: "1px solid var(--negative)", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)",
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {tickers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Summary strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8,
          }}>
            <SummaryCard label="Heavy Sellers" count={heavySellers.length} value={totalSellValue} tone="negative" />
            <SummaryCard label="Net Sellers" count={netSellers.length} value={0} tone="negative" />
            <SummaryCard label="Net Buyers" count={netBuyers.length} value={0} tone="positive" />
            <SummaryCard label="Heavy Buyers" count={heavyBuyers.length} value={totalBuyValue} tone="positive" />
          </div>

          {/* Aggregate insight */}
          <div style={{
            padding: "10px 12px", background: "var(--bg-panel-raised)",
            borderRadius: 4, border: "1px solid var(--border-dim)",
            fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6,
          }}>
            {heavySellers.length > heavyBuyers.length * 2
              ? `Broad insider selling detected — ${heavySellers.length} tickers with heavy insider sales (${formatDollar(totalSellValue)}). This pattern often precedes market weakness. Exercise caution.`
              : heavyBuyers.length > heavySellers.length * 2
              ? `Broad insider buying detected — ${heavyBuyers.length} tickers with heavy insider purchases (${formatDollar(totalBuyValue)}). Insider buying is often a bullish signal.`
              : `Mixed insider activity — ${heavySellers.length + netSellers.length} selling vs ${heavyBuyers.length + netBuyers.length} buying. No strong directional bias from insiders.`}
          </div>

          {/* Table */}
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <th style={thStyle}>Ticker</th>
                  <th style={thStyle}>Signal</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Sell Value</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Buy Value</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Net</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Txns</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map((t) => (
                  <tr key={t.symbol} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{t.symbol}</td>
                    <td style={tdStyle}>
                      <span style={{ color: SIGNAL_COLORS[t.signal], fontWeight: 600, fontSize: 10 }}>
                        {SIGNAL_LABELS[t.signal]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: t.sellValue > 0 ? "var(--negative)" : "var(--text-muted)" }}>
                      {t.sellValue > 0 ? formatDollar(t.sellValue) : "---"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: t.buyValue > 0 ? "var(--positive)" : "var(--text-muted)" }}>
                      {t.buyValue > 0 ? formatDollar(t.buyValue) : "---"}
                    </td>
                    <td style={{
                      ...tdStyle, textAlign: "right", fontWeight: 600,
                      color: t.netValue > 0 ? "var(--positive)" : t.netValue < 0 ? "var(--negative)" : "var(--text-muted)",
                    }}>
                      {t.netValue >= 0 ? "+" : ""}{formatDollar(t.netValue)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-muted)" }}>{t.totalTx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastScan && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>
              Last scan: {lastScan} · {tickers.length} tickers with activity
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function SummaryCard({ label, count, value, tone }: { label: string; count: number; value: number; tone: "positive" | "negative" }) {
  const color = tone === "positive" ? "var(--positive)" : "var(--negative)";
  return (
    <div style={{
      padding: "8px 10px", background: "var(--bg-panel-raised)",
      borderRadius: 4, border: "1px solid var(--border-dim)", textAlign: "center",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      {value > 0 && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color, marginTop: 2 }}>{formatDollar(value)}</div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "6px 8px", textAlign: "left", fontSize: 9,
  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
  position: "sticky", top: 0, background: "var(--bg-panel)", fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px", whiteSpace: "nowrap",
};
