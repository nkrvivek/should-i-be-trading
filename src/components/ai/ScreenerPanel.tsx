import { useMemo, useState } from "react";
import { chatWithClaude } from "../../api/anthropicClient";
import { AiUsageBadge, useAiUsage } from "./AiUsageBadge";
import { useStockMetrics, type StockMetrics } from "../../hooks/useStockMetrics";
import {
  SCREENER_SYSTEM_PROMPT,
  parseScreenerResponse,
  applyFilters,
  type ScreenerSpec,
} from "../../api/screenerPrompts";

const EXAMPLE_QUERIES = [
  "High dividend, low P/E",
  "Tech stocks with strong growth",
  "Low beta defensive stocks",
  "Undervalued large caps",
  "Energy sector with high margins",
];

function formatMetricValue(key: string, val: unknown): string {
  if (val == null) return "---";
  const n = val as number;
  if (key === "dividendYield") return `${(n * 100).toFixed(2)}%`;
  if (key === "marketCap") {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    return `$${(n / 1e6).toFixed(0)}M`;
  }
  if (key === "revenueGrowthQuarterly" || key === "profitMargin") return `${(n * 100).toFixed(1)}%`;
  if (key === "pe" || key === "forwardPe" || key === "beta") return n.toFixed(2);
  if (key === "eps") return `$${n.toFixed(2)}`;
  return String(n);
}

// Determine which metrics to show based on the filters/sort used
function getRelevantColumns(spec: { filters: { field: string }[]; sort?: { field: string } }): string[] {
  const fields = new Set<string>();
  for (const f of spec.filters) fields.add(f.field);
  if (spec.sort) fields.add(spec.sort.field);
  // Always include some defaults
  fields.add("sector");
  // Remove symbol (always shown) and sector (shown separately)
  fields.delete("symbol");
  // Ensure at least pe and marketCap
  if (fields.size < 3) {
    fields.add("pe");
    fields.add("marketCap");
  }
  return [...fields];
}

const METRIC_LABELS: Record<string, string> = {
  pe: "P/E",
  forwardPe: "Fwd P/E",
  dividendYield: "Div Yield",
  marketCap: "Mkt Cap",
  eps: "EPS",
  revenueGrowthQuarterly: "Rev Growth",
  profitMargin: "Margin",
  beta: "Beta",
  sector: "Sector",
  fiftyTwoWeekHigh: "52w High",
  fiftyTwoWeekLow: "52w Low",
  currentPrice: "Price",
};

type SortDirection = "asc" | "desc";

function getDefaultSortDirection(column: string): SortDirection {
  return column === "symbol" || column === "sector" ? "asc" : "desc";
}

function compareMetricValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return Number(a) - Number(b);
}

export function ScreenerPanel() {
  const { metrics, loading: metricsLoading, progress } = useStockMetrics();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StockMetrics[] | null>(null);
  const aiUsage = useAiUsage();
  const limitReached = !aiUsage.isOwnKey && aiUsage.used >= aiUsage.limit;
  const [columns, setColumns] = useState<string[]>([]);
  const [filterDescription, setFilterDescription] = useState("");
  const [sortColumn, setSortColumn] = useState("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const applyDefaultSort = (spec: ScreenerSpec) => {
    const nextSortColumn = spec.sort?.field ?? "symbol";
    const nextSortDirection = spec.sort?.direction ?? getDefaultSortDirection(nextSortColumn);
    setSortColumn(nextSortColumn);
    setSortDirection(nextSortDirection);
  };

  const handleScreen = async (q: string) => {
    const input = q.trim();
    if (!input || loading) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await chatWithClaude(
        [{ role: "user", content: input }],
        SCREENER_SYSTEM_PROMPT,
      );

      const spec = parseScreenerResponse(response.content);
      if (!spec) {
        setError("Could not parse screening criteria. Try rephrasing your query.");
        return;
      }

      const filtered = applyFilters(
        metrics as unknown as Record<string, unknown>[],
        spec,
      ) as unknown as StockMetrics[];

      setResults(filtered);
      setColumns(getRelevantColumns(spec));
      setFilterDescription(
        spec.filters.map((f) => `${METRIC_LABELS[f.field] ?? f.field} ${f.operator} ${f.value}`).join(", "),
      );
      applyDefaultSort(spec);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Screening failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScreen(query);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(getDefaultSortDirection(column));
  };

  const sortedResults = useMemo(() => {
    if (!results) return null;

    const next = [...results];
    next.sort((a, b) => {
      let comparison = 0;

      if (sortColumn === "symbol") comparison = a.symbol.localeCompare(b.symbol);
      else if (sortColumn === "sector") comparison = a.sector.localeCompare(b.sector);
      else comparison = compareMetricValues(a[sortColumn as keyof StockMetrics], b[sortColumn as keyof StockMetrics]);

      if (comparison === 0) {
        comparison = a.symbol.localeCompare(b.symbol);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return next;
  }, [results, sortColumn, sortDirection]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      {/* Data loading indicator */}
      {metricsLoading && (
        <div style={{
          padding: "6px 12px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-muted)",
          background: "var(--bg-panel-raised)",
          borderRadius: 4,
        }}>
          Loading stock data... {progress.done}/{progress.total} symbols
        </div>
      )}

      {/* Example chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {EXAMPLE_QUERIES.map((eq) => (
          <button
            key={eq}
            onClick={() => { setQuery(eq); handleScreen(eq); }}
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--signal-core)",
              background: "transparent",
              border: "1px solid var(--signal-core)",
              cursor: "pointer",
              opacity: 0.7,
            }}
          >
            {eq}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            Analyzing your query with Claude...
          </div>
        )}

        {error && (
          <div style={{ padding: 8, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
            {error}
          </div>
        )}

        {results && results.length === 0 && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            No stocks matched your criteria. Try broadening your filters.
          </div>
        )}

        {sortedResults && sortedResults.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "4px 0", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              <span>{sortedResults.length} results — {filterDescription}</span>
              <span>Click column labels to sort</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <SortableHeader column="symbol" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>
                    Symbol
                  </SortableHeader>
                  {columns.map((col) => (
                    <SortableHeader
                      key={col}
                      column={col}
                      align={col === "sector" ? "left" : "right"}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      {METRIC_LABELS[col] ?? col}
                    </SortableHeader>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr key={r.symbol} style={{ borderBottom: "1px solid var(--border-dim)", height: 32 }}>
                    <td style={{ padding: "0 8px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {r.symbol}
                    </td>
                    {columns.map((col) => (
                      <td key={col} style={{
                        padding: "0 8px",
                        textAlign: col === "sector" ? "left" : "right",
                        color: "var(--text-secondary)",
                      }}>
                        {col === "sector" ? r.sector : formatMetricValue(col, r[col as keyof StockMetrics])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!results && !loading && !error && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            Describe the stocks you're looking for in natural language.
            {metrics.length > 0 && ` Screening across ${metrics.length} major stocks.`}
          </div>
        )}
      </div>

      {/* Input + usage */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(e); } }}
            placeholder={limitReached ? "AI limit reached — add key in Settings" : "e.g. stocks with P/E under 15 and dividend yield above 3%"}
            disabled={loading || limitReached}
            style={{
              flex: 1,
              padding: "6px 12px",
              background: "var(--bg-panel-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !query.trim() || metricsLoading || limitReached}
            style={{
              padding: "6px 16px",
              background: "var(--accent-bg)",
              border: "none",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--accent-text)",
              cursor: loading ? "default" : "pointer",
              opacity: loading || !query.trim() || metricsLoading ? 0.5 : 1,
            }}
          >
            SCREEN
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <AiUsageBadge />
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  children,
  column,
  align = "left",
  sortColumn,
  sortDirection,
  onSort,
}: {
  children: React.ReactNode;
  column: string;
  align?: "left" | "right";
  sortColumn: string;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
}) {
  const active = sortColumn === column;

  return (
    <th style={{ padding: 0, textAlign: align, fontWeight: 500, fontSize: 11 }}>
      <button
        type="button"
        onClick={() => onSort(column)}
        style={{
          width: "100%",
          padding: "4px 8px",
          display: "flex",
          justifyContent: align === "right" ? "flex-end" : "flex-start",
          alignItems: "center",
          gap: 4,
          border: "none",
          background: "transparent",
          font: "inherit",
          color: active ? "var(--text-primary)" : "var(--text-muted)",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        <span>{children}</span>
        <span style={{ color: active ? "var(--signal-core)" : "var(--text-muted)" }}>
          {active ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
