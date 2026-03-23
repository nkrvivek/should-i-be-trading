import { useState } from "react";
import { Panel } from "../layout/Panel";
import { useInsiderTrading } from "../../hooks/useInsiderTrading";
import type { InsiderActivitySummary, InsiderSignal, InsiderTransaction } from "../../api/types";

const SIGNAL_CONFIG: Record<InsiderSignal, { label: string; color: string; icon: string }> = {
  HEAVY_BUYING: { label: "HEAVY BUYING", color: "var(--positive)", icon: "\u25b2\u25b2" },
  NET_BUYING: { label: "NET BUYING", color: "var(--positive)", icon: "\u25b2" },
  NEUTRAL: { label: "NEUTRAL", color: "var(--text-muted)", icon: "\u2500" },
  NET_SELLING: { label: "NET SELLING", color: "var(--negative)", icon: "\u25bc" },
  HEAVY_SELLING: { label: "HEAVY SELLING", color: "var(--negative)", icon: "\u25bc\u25bc" },
};

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

function SignalBadge({ signal }: { signal: InsiderSignal }) {
  const cfg = SIGNAL_CONFIG[signal];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${cfg.color}`,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  // score: -100 to +100
  const pct = ((score + 100) / 200) * 100;
  const barColor = score > 0 ? "var(--positive)" : score < 0 ? "var(--negative)" : "var(--text-muted)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>
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
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function TransactionRow({ t }: { t: InsiderTransaction }) {
  const isBuy = t.transactionCode === "P" || t.change > 0;
  const value = Math.abs(t.change) * (t.transactionPrice || 0);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 60px 80px 70px",
      gap: 8,
      padding: "5px 0",
      borderBottom: "1px solid var(--border-dim)",
      fontSize: 10,
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
        {t.name}
      </div>
      <div style={{ color: isBuy ? "var(--positive)" : "var(--negative)", fontWeight: 600 }}>
        {isBuy ? "BUY" : "SELL"}
      </div>
      <div style={{ color: "var(--text-primary)", textAlign: "right" }}>
        {formatShares(Math.abs(t.change))}
      </div>
      <div style={{ color: "var(--text-muted)", textAlign: "right" }}>
        {value > 0 ? formatDollar(value) : "---"}
      </div>
    </div>
  );
}

function SummaryView({ data }: { data: InsiderActivitySummary }) {
  const [expanded, setExpanded] = useState(false);
  const visibleTx = expanded ? data.transactions : data.transactions.slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Signal + Score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SignalBadge signal={data.signal} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
          {data.period} window
        </span>
      </div>

      <ScoreBar score={data.signalScore} />

      {/* Metrics Grid */}
      <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
        <MetricRow
          label="Buy Transactions"
          value={`${data.totalBuys} (${formatDollar(data.buyValue)})`}
          tone={data.totalBuys > 0 ? "positive" : "neutral"}
        />
        <MetricRow
          label="Sell Transactions"
          value={`${data.totalSells} (${formatDollar(data.sellValue)})`}
          tone={data.totalSells > 0 ? "negative" : "neutral"}
        />
        <MetricRow
          label="Net Value"
          value={`${data.netValue >= 0 ? "+" : ""}${formatDollar(data.netValue)}`}
          tone={data.netValue > 0 ? "positive" : data.netValue < 0 ? "negative" : "neutral"}
        />
        <MetricRow
          label="Net Shares"
          value={formatShares(data.netShares)}
          tone={data.netShares > 0 ? "positive" : data.netShares < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Transaction List */}
      {data.transactions.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 60px 80px 70px", gap: 8,
            padding: "0 0 4px 0", fontSize: 9, fontFamily: "var(--font-mono)",
            color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            <span>Insider</span>
            <span>Type</span>
            <span style={{ textAlign: "right" }}>Shares</span>
            <span style={{ textAlign: "right" }}>Value</span>
          </div>

          {visibleTx.map((t, i) => (
            <TransactionRow key={`${t.name}-${t.transactionDate}-${i}`} t={t} />
          ))}

          {data.transactions.length > 8 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                marginTop: 6, padding: "4px 0", width: "100%",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--signal-core)",
              }}
            >
              {expanded ? "Show less" : `Show all ${data.transactions.length} transactions`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  symbol?: string;
};

export function InsiderActivityPanel({ symbol }: Props) {
  const [inputSymbol, setInputSymbol] = useState(symbol ?? "");
  const [activeSymbol, setActiveSymbol] = useState(symbol ?? "");
  const { data, loading, error, refresh } = useInsiderTrading(activeSymbol || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = inputSymbol.trim().toUpperCase();
    if (s) setActiveSymbol(s);
  };

  return (
    <Panel title="Insider Activity" onRefresh={refresh} loading={loading}>
      {/* Search input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          placeholder="AAPL"
          style={{
            flex: 1, padding: "6px 10px",
            background: "var(--bg-panel-raised)", border: "1px solid var(--border-dim)",
            borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12,
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!inputSymbol.trim()}
          style={{
            padding: "6px 14px", background: "var(--signal-core)",
            color: "#000", border: "none", borderRadius: 4,
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
            cursor: inputSymbol.trim() ? "pointer" : "not-allowed",
            opacity: inputSymbol.trim() ? 1 : 0.5,
          }}
        >
          SCAN
        </button>
      </form>

      {error && (
        <div style={{
          padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)",
          border: "1px solid var(--negative)", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)",
        }}>
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{
          padding: "20px 0", textAlign: "center",
          fontFamily: "var(--font-sans)", fontSize: 12,
          color: "var(--text-muted)", lineHeight: 1.6,
        }}>
          Enter a ticker to scan SEC Form 4 insider filings.
          <br />
          <span style={{ fontSize: 10 }}>Tracks insider buys and sells over the past 90 days.</span>
        </div>
      )}

      {data && <SummaryView data={data} />}
    </Panel>
  );
}
