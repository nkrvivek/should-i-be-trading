import type { PortfolioPosition } from "../../api/types";
import { fmtUsdExact, fmtPct } from "../../lib/format";
import { Badge } from "../shared/Badge";

type Props = {
  positions: PortfolioPosition[];
  loading?: boolean;
};

function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="skeleton-pulse" style={{ width: 48, height: 14, borderRadius: 3, background: "var(--border-dim)" }} />
          <div className="skeleton-pulse" style={{ width: 90, height: 14, borderRadius: 3, background: "var(--border-dim)", animationDelay: `${i * 80}ms` }} />
          <div className="skeleton-pulse" style={{ flex: 1, height: 14, borderRadius: 3, background: "var(--border-dim)", animationDelay: `${i * 80 + 40}ms` }} />
        </div>
      ))}
    </div>
  );
}

export function PositionsPanel({ positions, loading }: Props) {
  if (loading && positions.length === 0) {
    return <SkeletonRows />;
  }

  if (positions.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
        No open positions
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>Ticker</Th>
            <Th>Structure</Th>
            <Th>Dir</Th>
            <Th align="right">Entry</Th>
            <Th align="right">Mkt Val</Th>
            <Th align="right">P&L</Th>
            <Th align="right">P&L%</Th>
            <Th>Risk</Th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const mv = pos.market_value ?? 0;
            const pnl = mv - pos.entry_cost;
            const pnlPct = pos.entry_cost !== 0 ? pnl / Math.abs(pos.entry_cost) : 0;
            const tone = pnl > 0 ? "var(--positive)" : pnl < 0 ? "var(--negative)" : "var(--neutral)";
            return (
              <tr key={pos.id} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
                <td style={{ padding: "0 8px", fontWeight: 500 }}>{pos.ticker}</td>
                <td style={{ padding: "0 8px", color: "var(--text-secondary)", fontSize: 12 }}>{pos.structure}</td>
                <td style={{ padding: "0 8px", color: pos.direction === "LONG" ? "var(--positive)" : "var(--negative)" }}>
                  {pos.direction}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right" }}>{fmtUsdExact(pos.entry_cost)}</td>
                <td style={{ padding: "0 8px", textAlign: "right" }}>{fmtUsdExact(mv)}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>{fmtUsdExact(pnl)}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>{fmtPct(pnlPct)}</td>
                <td style={{ padding: "0 8px" }}>
                  <Badge
                    label={pos.risk_profile}
                    variant={pos.risk_profile === "defined" ? "positive" : pos.risk_profile === "undefined" ? "negative" : "warning"}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}
