import { useMemo, useState } from "react";
import { Panel } from "../../components/layout/Panel";
import { TradeVerdictBadgeWithScore } from "../../components/trading/TradeVerdictBadge";
import { getCompositeTradeScore } from "../../hooks/useCompositeTradeScore";
import { useMarketScore } from "../../hooks/useMarketScore";
import { useRegimeMonitor } from "../../hooks/useRegimeMonitor";
import { useStockMetrics } from "../../hooks/useStockMetrics";
import { estimateStockScoreFromMetrics } from "../../lib/estimatedStockScore";

type SortKey = "overall" | "stockScore" | "confidence" | "marketBase" | "tickerScore" | "symbol";

function formatPrice(value: number | null): string {
  if (value == null) return "---";
  return `$${value.toFixed(2)}`;
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function CompositeContent() {
  const { metrics, loading, progress } = useStockMetrics();
  const { score: marketScore, loading: marketLoading } = useMarketScore();
  const { regime, loading: regimeLoading } = useRegimeMonitor();
  const cacheRevision = `${marketScore?.timestamp ?? 0}-${regime?.timestamp ?? 0}`;
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("overall");
  const [tradeOnly, setTradeOnly] = useState(false);

  const rows = useMemo(() => {
    void cacheRevision;

    return metrics
      .map((metric) => {
        const estimatedStockScore = estimateStockScoreFromMetrics(metric);
        const composite = getCompositeTradeScore(metric.symbol, {
          stockScoreComposite: estimatedStockScore.composite,
        });

        if (!composite) return null;

        return {
          metric,
          composite,
          estimatedStockScore,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [cacheRevision, metrics]);

  const sectors = useMemo(
    () => ["ALL", ...new Set(metrics.map((metric) => metric.sector).filter(Boolean))].sort(),
    [metrics],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();

    const next = rows.filter((row) => {
      if (tradeOnly && row.composite.verdict !== "TRADE") return false;
      if (sector !== "ALL" && row.metric.sector !== sector) return false;
      if (!normalizedQuery) return true;

      return row.metric.symbol.includes(normalizedQuery) || row.metric.sector.toUpperCase().includes(normalizedQuery);
    });

    next.sort((a, b) => {
      if (sortBy === "symbol") return a.metric.symbol.localeCompare(b.metric.symbol);
      if (sortBy === "stockScore") return b.estimatedStockScore.composite - a.estimatedStockScore.composite;
      if (sortBy === "confidence") return b.composite.confidence - a.composite.confidence;
      if (sortBy === "marketBase") return b.composite.marketBase - a.composite.marketBase;
      if (sortBy === "tickerScore") return b.composite.tickerScore - a.composite.tickerScore;
      return b.composite.overall - a.composite.overall;
    });

    return next;
  }, [query, rows, sector, sortBy, tradeOnly]);

  const verdictCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.composite.verdict] += 1;
        return acc;
      },
      { TRADE: 0, CAUTION: 0, AVOID: 0 },
    );
  }, [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Composite Trade Screener
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0", maxWidth: 760, lineHeight: 1.55 }}>
              Ranked universe view for the tracked stock set. Market quality, regime, FSI, and sector momentum are combined with a stock-quality estimate from the cached fundamentals universe. Missing insider, earnings, social, and short-interest inputs stay neutral and lower confidence until those signals are cached elsewhere in the app.
            </p>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
            Universe: {metrics.length} symbols
            <br />
            {loading
              ? `Loading fundamentals ${progress.done}/${progress.total}`
              : marketLoading || regimeLoading
                ? "Refreshing market inputs..."
                : "Composite list ready"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryCard label="Universe" value={`${rows.length}`} tone="var(--text-primary)" />
        <SummaryCard label="Trade" value={`${verdictCounts.TRADE}`} tone="var(--positive)" />
        <SummaryCard label="Caution" value={`${verdictCounts.CAUTION}`} tone="var(--warning)" />
        <SummaryCard label="Avoid" value={`${verdictCounts.AVOID}`} tone="var(--negative)" />
      </div>

      <Panel title="Composite Rankings">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value.toUpperCase())}
            placeholder="Filter symbol or sector"
            style={inputStyle}
          />
          <select value={sector} onChange={(event) => setSector(event.target.value)} style={selectStyle}>
            {sectors.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)} style={selectStyle}>
            <option value="overall">Sort: Overall</option>
            <option value="stockScore">Sort: Stock Score</option>
            <option value="marketBase">Sort: Market Base</option>
            <option value="tickerScore">Sort: Ticker Score</option>
            <option value="confidence">Sort: Confidence</option>
            <option value="symbol">Sort: Symbol</option>
          </select>
          <button
            type="button"
            onClick={() => setTradeOnly((current) => !current)}
            style={{
              ...selectStyle,
              cursor: "pointer",
              color: tradeOnly ? "var(--positive)" : "var(--text-secondary)",
              borderColor: tradeOnly ? "var(--positive)" : "var(--border-dim)",
            }}
          >
            {tradeOnly ? "Showing TRADE only" : "Show TRADE only"}
          </button>
        </div>

        {loading && metrics.length === 0 ? (
          <div style={{ padding: 24, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            Loading fundamentals universe... {progress.done}/{progress.total}
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <Th>Symbol</Th>
                  <Th>Sector</Th>
                  <Th align="right">Price</Th>
                  <Th>Verdict</Th>
                  <Th align="right">Overall</Th>
                  <Th align="right">Stock</Th>
                  <Th align="right">Market</Th>
                  <Th align="right">Ticker</Th>
                  <Th align="right">Conf.</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.metric.symbol} style={{ borderBottom: "1px solid var(--border-dim)", height: 34 }}>
                    <td style={{ padding: "0 8px", fontWeight: 700, color: "var(--text-primary)" }}>{row.metric.symbol}</td>
                    <td style={{ padding: "0 8px", color: "var(--text-secondary)" }}>{row.metric.sector}</td>
                    <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatPrice(row.metric.currentPrice)}
                    </td>
                    <td style={{ padding: "0 8px" }}>
                      <TradeVerdictBadgeWithScore
                        symbol={row.metric.symbol}
                        showScore={false}
                        inputs={{ stockScoreComposite: row.estimatedStockScore.composite }}
                      />
                    </td>
                    <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-primary)", fontWeight: 600 }}>
                      {row.composite.overall}
                    </td>
                    <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {row.estimatedStockScore.composite.toFixed(1)}
                    </td>
                    <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {row.composite.marketBase}
                    </td>
                    <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {row.composite.tickerScore}
                    </td>
                    <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatPct(row.composite.confidence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                No symbols match the current filters.
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: tone }}>
        {value}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        padding: "4px 8px",
        textAlign: align,
        fontWeight: 500,
        fontSize: 11,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}

const inputStyle: React.CSSProperties = {
  minWidth: 220,
  padding: "6px 10px",
  background: "var(--bg-panel-raised)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "var(--bg-panel-raised)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-secondary)",
};
