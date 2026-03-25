/**
 * CFTC Commitments of Traders Dashboard.
 *
 * Visual dashboard showing institutional futures positioning
 * across equity indices, rates, commodities, volatility, and currencies.
 * Includes COT Index (percentile), posture, weekly change, and mini sparklines.
 */

import { useState, useMemo } from "react";
import { Panel } from "../layout/Panel";
import { useCotData } from "../../hooks/useCotData";
import {
  computeCotIndex,
  postureColor,
  categoryLabel,
  type CotContract,
} from "../../api/cftcClient";

type CategoryFilter = "all" | "index" | "rates" | "commodity" | "volatility" | "currency";

export function CotDashboard() {
  const { data, loading, error, refresh } = useCotData(12);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const contracts = useMemo(() => {
    if (!data) return [];
    return filter === "all"
      ? data.contracts
      : data.contracts.filter((c) => c.category === filter);
  }, [data, filter]);

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.contracts.map((c) => c.category))];
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Commitments of Traders (COT)
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Institutional futures positioning from CFTC weekly reports. Tracks speculative (hedge funds) vs commercial (hedgers) positions.
              {data && ` Last report: ${data.lastReport}`}
            </p>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            Weekly data
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <FilterChip label="ALL" active={filter === "all"} onClick={() => setFilter("all")} />
        {categories.map((cat) => (
          <FilterChip
            key={cat}
            label={categoryLabel(cat).toUpperCase()}
            active={filter === cat}
            onClick={() => setFilter(cat as CategoryFilter)}
            count={data?.contracts.filter((c) => c.category === cat).length}
          />
        ))}
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
          {error}
        </div>
      )}

      {/* Main Table */}
      <Panel title="Positioning Overview" onRefresh={refresh} loading={loading}>
        {contracts.length === 0 && !loading ? (
          <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            {data ? "No contracts match the filter." : "Loading COT data..."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <Th>Contract</Th>
                <Th>Category</Th>
                <Th align="center">Posture</Th>
                <Th align="right">Net Spec</Th>
                <Th align="right">% of OI</Th>
                <Th align="right">Weekly Chg</Th>
                <Th align="center">COT Index</Th>
                <Th align="center">Trend</Th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const cotIndex = computeCotIndex(c.history);
                const isExpanded = expanded === c.code;

                return (
                  <TableRows
                    key={c.code}
                    contract={c}
                    cotIndex={cotIndex}
                    isExpanded={isExpanded}
                    onToggle={() => setExpanded(isExpanded ? null : c.code)}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Educational footer */}
      <div
        style={{
          padding: "10px 12px",
          background: "rgba(5, 173, 152, 0.05)",
          border: "1px solid rgba(5, 173, 152, 0.2)",
          borderRadius: 4,
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--signal-core)", marginBottom: 4 }}>
          HOW TO READ COT DATA
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong>Speculators</strong> (hedge funds) tend to be trend followers — extreme positioning often signals reversals.{" "}
          <strong>Commercials</strong> (producers/hedgers) are usually contrarian — they buy low and sell high.{" "}
          <strong>COT Index</strong> (0-100) shows current net speculative position relative to its range — below 20 = extreme short (contrarian bullish), above 80 = extreme long (contrarian bearish).{" "}
          Data is released Fridays, reflecting positions as of Tuesday.
        </div>
      </div>

      <div style={{ padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border-dim)" }}>
        Data from CFTC (public domain). COT reports are weekly with a 3-day delay. Positioning may have changed since the report date. Not investment advice.
      </div>
    </div>
  );
}

/* ─── Table Row + Expanded Detail ──────────────────── */

function TableRows({
  contract: c,
  cotIndex,
  isExpanded,
  onToggle,
}: {
  contract: CotContract;
  cotIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: "1px solid var(--border-dim)", height: 36, cursor: "pointer" }}
      >
        <td style={{ padding: "0 8px", fontWeight: 600, color: "var(--text-primary)" }}>
          {c.name}
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </td>
        <td style={{ padding: "0 8px" }}>
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, border: "1px solid var(--border-dim)", color: "var(--text-muted)" }}>
            {categoryLabel(c.category)}
          </span>
        </td>
        <td style={{ padding: "0 8px", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              color: postureColor(c.latest.posture),
              border: `1px solid ${postureColor(c.latest.posture)}`,
            }}
          >
            {c.latest.posture}
          </span>
        </td>
        <td style={{ padding: "0 8px", textAlign: "right", color: c.latest.netSpeculative >= 0 ? "var(--positive)" : "var(--negative)" }}>
          {fmtContracts(c.latest.netSpeculative)}
        </td>
        <td style={{ padding: "0 8px", textAlign: "right", fontWeight: 600, color: c.latest.netPctOI >= 0 ? "var(--positive)" : "var(--negative)" }}>
          {c.latest.netPctOI.toFixed(1)}%
        </td>
        <td style={{ padding: "0 8px", textAlign: "right", color: c.latest.weeklyChange >= 0 ? "var(--positive)" : "var(--negative)" }}>
          {c.latest.weeklyChange >= 0 ? "+" : ""}{fmtContracts(c.latest.weeklyChange)}
        </td>
        <td style={{ padding: "0 8px", textAlign: "center" }}>
          <CotIndexBar value={cotIndex} />
        </td>
        <td style={{ padding: "0 8px", textAlign: "center" }}>
          <MiniSparkline history={c.history.map((h) => h.netSpeculative)} />
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <td colSpan={8} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.01)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KV label="Open Interest" value={c.latest.openInterest.toLocaleString()} />
              <KV label="Spec Long" value={c.latest.specLong.toLocaleString()} />
              <KV label="Spec Short" value={c.latest.specShort.toLocaleString()} />
              <KV label="Spec Net" value={fmtContracts(c.latest.netSpeculative)} color={c.latest.netSpeculative >= 0 ? "var(--positive)" : "var(--negative)"} />
              <KV label="Comm Long" value={c.latest.commLong.toLocaleString()} />
              <KV label="Comm Short" value={c.latest.commShort.toLocaleString()} />
              <KV label="Comm Net" value={fmtContracts(c.latest.netCommercial)} color={c.latest.netCommercial >= 0 ? "var(--positive)" : "var(--negative)"} />
              <KV label="Report Date" value={c.latest.date} />
            </div>

            {/* History table */}
            {c.history.length > 1 && (
              <div style={{ marginTop: 8, maxHeight: 180, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <Th>Date</Th>
                      <Th align="right">Net Spec</Th>
                      <Th align="right">Net Comm</Th>
                      <Th align="right">Open Interest</Th>
                      <Th align="right">Weekly Chg</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...c.history].reverse().map((h) => (
                      <tr key={h.date} style={{ borderBottom: "1px solid var(--border-dim)", height: 24 }}>
                        <td style={{ padding: "0 6px", color: "var(--text-muted)" }}>{h.date}</td>
                        <td style={{ padding: "0 6px", textAlign: "right", color: h.netSpeculative >= 0 ? "var(--positive)" : "var(--negative)" }}>
                          {fmtContracts(h.netSpeculative)}
                        </td>
                        <td style={{ padding: "0 6px", textAlign: "right", color: h.netCommercial >= 0 ? "var(--positive)" : "var(--negative)" }}>
                          {fmtContracts(h.netCommercial)}
                        </td>
                        <td style={{ padding: "0 6px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {h.openInterest.toLocaleString()}
                        </td>
                        <td style={{ padding: "0 6px", textAlign: "right", color: h.specChange >= 0 ? "var(--positive)" : "var(--negative)" }}>
                          {h.specChange >= 0 ? "+" : ""}{fmtContracts(h.specChange)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Sub-components ───────────────────────────────── */

function CotIndexBar({ value }: { value: number }) {
  const color = value > 80 ? "var(--negative)" : value < 20 ? "var(--positive)" : "var(--signal-core)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
      <div style={{ width: 40, height: 6, background: "var(--bg-base)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 24 }}>{value}</span>
    </div>
  );
}

function MiniSparkline({ history }: { history: number[] }) {
  if (history.length < 2) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  const width = 60;
  const height = 18;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const latest = history[history.length - 1];
  const color = latest >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <svg width={width} height={height} style={{ display: "block", margin: "0 auto" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KV({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}

function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 999,
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
        color: active ? "#000" : "var(--text-muted)",
        background: active ? "var(--signal-core)" : "transparent",
        border: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
        cursor: "pointer",
      }}
    >
      {label}
      {count != null && <span style={{ opacity: 0.7 }}>({count})</span>}
    </button>
  );
}

function fmtContracts(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs}`;
}
