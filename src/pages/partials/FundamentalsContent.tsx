/**
 * Fundamentals content — company profile, financial ratios, income statement,
 * balance sheet, analyst estimates, and price targets from FMP.
 * Used as a sub-tab within ResearchPage.
 */

import { useCallback, useEffect, useState } from "react";
import { Panel } from "../../components/layout/Panel";
import {
  type FmpProfile,
  type FmpRatiosTTM,
  type FmpKeyMetricsTTM,
  type FmpPriceTarget,
  type FmpIncomeStatement,
  type FmpBalanceSheet,
  type FmpAnalystEstimate,
  getFundamentalSnapshot,
  getIncomeStatement,
  getBalanceSheet,
  getAnalystEstimates,
  searchSymbol,
} from "../../api/fmpClient";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useStockScore } from "../../hooks/useStockScore";
import { StockScoreCard } from "../../components/score/StockScoreCard";

/* ─── Types ────────────────────────────────────────── */

interface Snapshot {
  profile: FmpProfile | null;
  ratios: FmpRatiosTTM | null;
  metrics: FmpKeyMetricsTTM | null;
  priceTarget: FmpPriceTarget | null;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchangeShortName: string;
}

/* ─── Formatters ───────────────────────────────────── */

function fmtB(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtRatio(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtEps(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

function colorForValue(value: number | null | undefined, positiveIsGood = true): string {
  if (value == null) return "var(--text-muted)";
  if (positiveIsGood) return value >= 0 ? "var(--positive)" : "var(--negative)";
  return value <= 0 ? "var(--positive)" : "var(--negative)";
}

/* ─── Main Component ───────────────────────────────── */

export default function FundamentalsContent() {
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [income, setIncome] = useState<FmpIncomeStatement[]>([]);
  const [balance, setBalance] = useState<FmpBalanceSheet[]>([]);
  const [estimates, setEstimates] = useState<FmpAnalystEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { score: sibtScore, compute: computeScore } = useStockScore();

  // Debounced search
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchSymbol(query, 6);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadFundamentals = useCallback(async (sym: string) => {
    const ticker = sym.toUpperCase().trim();
    if (!ticker) return;

    setSymbol(ticker);
    setQuery(ticker);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);

    try {
      const [snap, inc, bal, est] = await Promise.all([
        getFundamentalSnapshot(ticker),
        getIncomeStatement(ticker, "annual", 5),
        getBalanceSheet(ticker, "annual", 5),
        getAnalystEstimates(ticker, 4).catch(() => [] as FmpAnalystEstimate[]),
      ]);

      if (!snap.profile) {
        setError(`No data found for "${ticker}". Check the symbol and try again.`);
        setSnapshot(null);
        setIncome([]);
        setBalance([]);
        setEstimates([]);
      } else {
        setSnapshot(snap);
        setIncome(inc);
        setBalance(bal);
        setEstimates(est);
        // Compute SIBT Score in the background
        computeScore(ticker).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fundamentals");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      loadFundamentals(query);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <Panel title="Fundamentals">
        <div style={{ padding: 24, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
          Fundamentals requires Supabase configuration.
          <br />
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable.
        </div>
      </Panel>
    );
  }

  const p = snapshot?.profile;
  const r = snapshot?.ratios;
  const m = snapshot?.metrics;
  const pt = snapshot?.priceTarget;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Company Fundamentals
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Financial ratios, income statements, balance sheets, and analyst estimates powered by FMP.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", maxWidth: 420 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search ticker or company name..."
              style={{
                flex: 1,
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--text-primary)",
                background: "var(--bg-base)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                outline: "none",
              }}
            />
            <button
              onClick={() => loadFundamentals(query)}
              disabled={loading || !query.trim()}
              style={{
                padding: "8px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: loading ? "var(--text-muted)" : "#000",
                background: loading ? "var(--border-dim)" : "var(--signal-core)",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "LOADING..." : "ANALYZE"}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 80,
                background: "var(--bg-panel)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                marginTop: 4,
                zIndex: 100,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onMouseDown={() => loadFundamentals(s.symbol)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--border-dim)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: 60 }}>{s.symbol}</span>
                  <span style={{ color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.exchangeShortName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick picks */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN", "TSLA", "META"].map((t) => (
            <button
              key={t}
              onClick={() => loadFundamentals(t)}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                color: symbol === t ? "#000" : "var(--text-muted)",
                background: symbol === t ? "var(--signal-core)" : "transparent",
                border: `1px solid ${symbol === t ? "var(--signal-core)" : "var(--border-dim)"}`,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(232, 93, 108, 0.1)",
            border: "1px solid var(--negative)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--negative)",
          }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {!snapshot && !loading && !error && (
        <Panel title="Getting Started">
          <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            Enter a ticker symbol above to view company fundamentals.
            <br />
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Includes financial ratios, income statements, balance sheet, analyst estimates, and price targets.
            </span>
          </div>
        </Panel>
      )}

      {/* Loading Skeleton */}
      {loading && !snapshot && (
        <Panel title={`Loading ${symbol}...`}>
          <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            Fetching fundamentals for {symbol}...
          </div>
        </Panel>
      )}

      {/* ─── Results ─── */}
      {p && (
        <>
          {/* Company Overview */}
          <Panel title={`${p.symbol} — ${p.companyName}`} onRefresh={() => loadFundamentals(symbol)} loading={loading}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 8 }}>
              {/* Left: Price & Key Info */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                    {fmtPrice(p.price)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: p.change >= 0 ? "var(--positive)" : "var(--negative)",
                    }}
                  >
                    {p.change >= 0 ? "+" : ""}
                    {p.change?.toFixed(2)} ({p.changePercentage?.toFixed(2)}%)
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <KV label="Market Cap" value={fmtB(p.marketCap)} />
                  <KV label="Volume" value={p.volume?.toLocaleString() ?? "—"} />
                  <KV label="Avg Volume" value={p.averageVolume?.toLocaleString() ?? "—"} />
                  <KV label="Beta" value={fmtRatio(p.beta)} />
                  <KV label="52W Range" value={p.range ?? "—"} />
                  <KV label="Last Dividend" value={fmtPrice(p.lastDividend)} />
                  <KV label="Sector" value={p.sector ?? "—"} />
                  <KV label="Industry" value={p.industry ?? "—"} />
                  <KV label="CEO" value={p.ceo ?? "—"} />
                  <KV label="Employees" value={p.fullTimeEmployees ?? "—"} />
                  <KV label="Exchange" value={p.exchange ?? "—"} />
                  <KV label="IPO Date" value={p.ipoDate ?? "—"} />
                </div>
              </div>

              {/* Right: Description */}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                >
                  {p.description || "No description available."}
                </div>
                {p.website && (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--info)" }}
                  >
                    {p.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </Panel>

          {/* SIBT Score */}
          {sibtScore && sibtScore.symbol === symbol && <StockScoreCard score={sibtScore} />}

          {/* Valuation & Financial Ratios (two-column) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Valuation Ratios */}
            <Panel title="Valuation Ratios (TTM)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 4 }}>
                <KV label="P/E Ratio" value={fmtRatio(r?.peRatioTTM)} />
                <KV label="P/B Ratio" value={fmtRatio(r?.pbRatioTTM)} />
                <KV label="P/S Ratio" value={fmtRatio(r?.priceToSalesRatioTTM)} />
                <KV label="P/FCF Ratio" value={fmtRatio(r?.priceToFreeCashFlowsRatioTTM)} />
                <KV label="EV/EBITDA" value={fmtRatio(r?.enterpriseValueOverEBITDATTM)} />
                <KV label="Dividend Yield" value={fmtPct(r?.dividendYieldTTM)} />
                <KV label="Payout Ratio" value={fmtPct(r?.payoutRatioTTM)} />
                <KV label="FCF/Share" value={fmtPrice(r?.freeCashFlowPerShareTTM)} />
              </div>
            </Panel>

            {/* Profitability & Health */}
            <Panel title="Profitability & Health (TTM)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 4 }}>
                <KV label="Gross Margin" value={fmtPct(r?.grossProfitMarginTTM)} color={colorForValue(r?.grossProfitMarginTTM)} />
                <KV label="Operating Margin" value={fmtPct(r?.operatingProfitMarginTTM)} color={colorForValue(r?.operatingProfitMarginTTM)} />
                <KV label="Net Margin" value={fmtPct(r?.netProfitMarginTTM)} color={colorForValue(r?.netProfitMarginTTM)} />
                <KV label="ROE" value={fmtPct(r?.returnOnEquityTTM)} color={colorForValue(r?.returnOnEquityTTM)} />
                <KV label="ROA" value={fmtPct(r?.returnOnAssetsTTM)} color={colorForValue(r?.returnOnAssetsTTM)} />
                <KV label="Current Ratio" value={fmtRatio(r?.currentRatioTTM)} />
                <KV label="Quick Ratio" value={fmtRatio(r?.quickRatioTTM)} />
                <KV label="D/E Ratio" value={fmtRatio(r?.debtEquityRatioTTM)} />
              </div>
            </Panel>
          </div>

          {/* Key Metrics */}
          {m && (
            <Panel title="Key Metrics (TTM)">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 4 }}>
                <KV label="Revenue/Share" value={fmtPrice(m.revenuePerShareTTM)} />
                <KV label="Net Income/Share" value={fmtPrice(m.netIncomePerShareTTM)} />
                <KV label="OpCF/Share" value={fmtPrice(m.operatingCashFlowPerShareTTM)} />
                <KV label="FCF/Share" value={fmtPrice(m.freeCashFlowPerShareTTM)} />
                <KV label="EV/Sales" value={fmtRatio(m.evToSalesTTM)} />
                <KV label="EV/EBITDA" value={fmtRatio(m.enterpriseValueOverEBITDATTM)} />
                <KV label="ROIC" value={fmtPct(m.roicTTM)} color={colorForValue(m.roicTTM)} />
                <KV label="D/E Ratio" value={fmtRatio(m.debtToEquityTTM)} />
              </div>
            </Panel>
          )}

          {/* Price Target */}
          {pt && (
            <Panel title="Analyst Price Target">
              <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "8px 4px" }}>
                {/* Price target bar */}
                <div style={{ flex: 1 }}>
                  <PriceTargetBar low={pt.targetLow} median={pt.targetMedian} high={pt.targetHigh} consensus={pt.targetConsensus} current={p.price} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
                  <KV label="Consensus" value={fmtPrice(pt.targetConsensus)} />
                  <KV label="Median" value={fmtPrice(pt.targetMedian)} />
                  <KV
                    label="Upside"
                    value={`${(((pt.targetConsensus - p.price) / p.price) * 100).toFixed(1)}%`}
                    color={pt.targetConsensus >= p.price ? "var(--positive)" : "var(--negative)"}
                  />
                </div>
              </div>
            </Panel>
          )}

          {/* Analyst Estimates */}
          {estimates.length > 0 && (
            <Panel title="Forward Estimates">
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <Th>Period</Th>
                    <Th align="right">Rev Est (Avg)</Th>
                    <Th align="right">Rev Low</Th>
                    <Th align="right">Rev High</Th>
                    <Th align="right">EPS Est</Th>
                    <Th align="right">EPS Low</Th>
                    <Th align="right">EPS High</Th>
                    <Th align="right"># Analysts</Th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((e) => (
                    <tr key={e.date} style={{ borderBottom: "1px solid var(--border-dim)", height: 32 }}>
                      <td style={{ padding: "0 8px", fontWeight: 600, color: "var(--text-primary)" }}>{e.date}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtB(e.estimatedRevenueAvg)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{fmtB(e.estimatedRevenueLow)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{fmtB(e.estimatedRevenueHigh)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>{fmtEps(e.estimatedEpsAvg)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{fmtEps(e.estimatedEpsLow)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{fmtEps(e.estimatedEpsHigh)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{e.numberAnalystEstimatedEps ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {/* Income Statement */}
          {income.length > 0 && (
            <Panel title="Income Statement (Annual)">
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <Th>Year</Th>
                      <Th align="right">Revenue</Th>
                      <Th align="right">Gross Profit</Th>
                      <Th align="right">Op Income</Th>
                      <Th align="right">Net Income</Th>
                      <Th align="right">EPS</Th>
                      <Th align="right">EBITDA</Th>
                      <Th align="right">R&D</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((row) => (
                      <tr key={row.date} style={{ borderBottom: "1px solid var(--border-dim)", height: 32 }}>
                        <td style={{ padding: "0 8px", fontWeight: 600, color: "var(--text-primary)" }}>{row.calendarYear}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtB(row.revenue)}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtB(row.grossProfit)}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: colorForValue(row.operatingIncome) }}>{fmtB(row.operatingIncome)}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: colorForValue(row.netIncome) }}>{fmtB(row.netIncome)}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", fontWeight: 600, color: colorForValue(row.epsDiluted) }}>{fmtEps(row.epsDiluted)}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtB(row.ebitda)}</td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{fmtB(row.researchAndDevelopmentExpenses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {/* Balance Sheet */}
          {balance.length > 0 && (
            <Panel title="Balance Sheet (Annual)">
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <Th>Year</Th>
                      <Th align="right">Total Assets</Th>
                      <Th align="right">Total Liabilities</Th>
                      <Th align="right">Equity</Th>
                      <Th align="right">Cash</Th>
                      <Th align="right">Total Debt</Th>
                      <Th align="right">Net Debt</Th>
                      <Th align="right">Current Ratio</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.map((row) => {
                      const currentRatio = row.totalCurrentLiabilities ? (row.totalCurrentAssets / row.totalCurrentLiabilities) : null;
                      return (
                        <tr key={row.date} style={{ borderBottom: "1px solid var(--border-dim)", height: 32 }}>
                          <td style={{ padding: "0 8px", fontWeight: 600, color: "var(--text-primary)" }}>{row.calendarYear}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtB(row.totalAssets)}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtB(row.totalLiabilities)}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: colorForValue(row.totalStockholdersEquity) }}>{fmtB(row.totalStockholdersEquity)}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: "var(--positive)" }}>{fmtB(row.cashAndCashEquivalents)}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{fmtB(row.totalDebt)}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: colorForValue(row.netDebt, false) }}>{fmtB(row.netDebt)}</td>
                          <td style={{ padding: "0 8px", textAlign: "right", color: currentRatio != null && currentRatio >= 1 ? "var(--positive)" : "var(--negative)" }}>
                            {currentRatio != null ? currentRatio.toFixed(2) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {/* Disclaimer */}
          <div
            style={{
              padding: "8px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-muted)",
              fontStyle: "italic",
              borderTop: "1px solid var(--border-dim)",
            }}
          >
            Financial data from Financial Modeling Prep (FMP). Ratios are trailing twelve months.
            Data may be delayed. Not investment advice — always verify with official SEC filings.
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────── */

function KV({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: color ?? "var(--text-primary)" }}>{value}</span>
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

/** Visual price target range bar */
function PriceTargetBar({
  low,
  high,
  median,
  consensus,
  current,
}: {
  low: number;
  high: number;
  median: number;
  consensus: number;
  current: number;
}) {
  const min = Math.min(low, current) * 0.95;
  const max = Math.max(high, current) * 1.05;
  const range = max - min;
  const pct = (v: number) => ((v - min) / range) * 100;

  return (
    <div style={{ position: "relative", height: 48, margin: "8px 0" }}>
      {/* Background track */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: `${pct(low)}%`,
          right: `${100 - pct(high)}%`,
          height: 6,
          background: "var(--border-dim)",
          borderRadius: 3,
        }}
      />

      {/* Low label */}
      <div style={{ position: "absolute", left: `${pct(low)}%`, top: 0, transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
        {fmtPrice(low)}
      </div>

      {/* High label */}
      <div style={{ position: "absolute", left: `${pct(high)}%`, top: 0, transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
        {fmtPrice(high)}
      </div>

      {/* Consensus marker */}
      <div
        style={{
          position: "absolute",
          left: `${pct(consensus)}%`,
          top: 14,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "var(--signal-core)",
          transform: "translateX(-50%)",
          border: "2px solid var(--bg-panel)",
        }}
      />
      <div style={{ position: "absolute", left: `${pct(consensus)}%`, top: 30, transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--signal-core)" }}>
        TARGET
      </div>

      {/* Median marker */}
      {Math.abs(median - consensus) > (range * 0.02) && (
        <div
          style={{
            position: "absolute",
            left: `${pct(median)}%`,
            top: 16,
            width: 2,
            height: 10,
            background: "var(--info)",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {/* Current price marker */}
      <div
        style={{
          position: "absolute",
          left: `${pct(current)}%`,
          top: 12,
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "8px solid var(--text-primary)",
          transform: "translateX(-50%)",
        }}
      />
      <div style={{ position: "absolute", left: `${pct(current)}%`, top: 30, transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>
        NOW
      </div>
    </div>
  );
}
