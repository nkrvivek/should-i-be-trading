/**
 * Greeks display panel — shows per-leg and net position Greeks.
 *
 * Sits below the metrics bar in SimulatorPanel. Shows Delta, Gamma, Theta, Vega
 * both per-leg and as net position totals.
 */

import type { PositionGreeks } from "../../lib/strategy/greeks";
import type { SimulatorLeg } from "../../lib/strategy/payoff";

interface Props {
  greeks: PositionGreeks | null;
  legs: SimulatorLeg[];
  daysToExpiry: number;
}

export function GreeksPanel({ greeks, legs, daysToExpiry }: Props) {
  if (!greeks || legs.length === 0) return null;

  const hasOptions = legs.some((l) => l.type !== "stock");
  if (!hasOptions) return null;

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--bg-panel-raised)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <span style={headerLabel}>Options Greeks</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
          {daysToExpiry} DTE
        </span>
      </div>

      {/* Net Greeks Bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <GreekCell label="Net Delta" value={greeks.net.delta} format="decimal" highlight />
        <GreekCell label="Net Gamma" value={greeks.net.gamma} format="decimal" />
        <GreekCell label="Net Theta" value={greeks.net.theta} format="dollar" negative />
        <GreekCell label="Net Vega" value={greeks.net.vega} format="dollar" />
      </div>

      {/* Per-Leg Breakdown */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>Leg</Th>
            <Th align="right">IV</Th>
            <Th align="right">Delta</Th>
            <Th align="right">Gamma</Th>
            <Th align="right">Theta</Th>
            <Th align="right">Vega</Th>
            <Th align="right">Theo</Th>
          </tr>
        </thead>
        <tbody>
          {greeks.legs.map((lg, i) => {
            const leg = legs[i];
            if (!leg) return null;
            const isOption = leg.type !== "stock";
            const label = `${leg.action === "buy" ? "+" : "-"}${leg.qty} ${leg.type.toUpperCase()} ${isOption ? "$" + leg.strike : ""}`;

            return (
              <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
                <td style={{ padding: "0 8px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  {label}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>
                  {isOption ? `${(lg.perContract.iv * 100).toFixed(1)}%` : "—"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: deltaColor(lg.aggregate.delta) }}>
                  {fmtGreek(lg.aggregate.delta)}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                  {isOption ? fmtGreek(lg.aggregate.gamma) : "—"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: lg.aggregate.theta < 0 ? "var(--negative)" : "var(--positive)" }}>
                  {isOption ? `$${lg.aggregate.theta.toFixed(2)}` : "—"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                  {isOption ? `$${lg.aggregate.vega.toFixed(2)}` : "—"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>
                  {isOption ? `$${lg.perContract.theoreticalPrice.toFixed(2)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Explanation footer */}
      <div style={{ padding: "4px 12px 6px", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
        Theta = daily decay ($). Vega = P&L per 1% IV change. Greeks are Black-Scholes estimates.
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────── */

const headerLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function GreekCell({
  label,
  value,
  format,
  highlight,
  negative,
}: {
  label: string;
  value: number;
  format: "decimal" | "dollar";
  highlight?: boolean;
  negative?: boolean;
}) {
  let color = "var(--text-primary)";
  if (negative && value < 0) color = "var(--negative)";
  else if (negative && value > 0) color = "var(--positive)";
  else if (highlight) color = deltaColor(value);

  const formatted = format === "dollar" ? `$${value.toFixed(2)}` : value.toFixed(2);

  return (
    <div
      style={{
        flex: 1,
        padding: "8px 12px",
        borderRight: "1px solid var(--border-dim)",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color }}>
        {formatted}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}

function deltaColor(d: number): string {
  if (d > 0) return "var(--positive)";
  if (d < 0) return "var(--negative)";
  return "var(--text-muted)";
}

function fmtGreek(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
