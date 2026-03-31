import { useMemo, useState } from "react";
import type { PortfolioPosition } from "../../api/types";
import { fmtUsdExact, fmtPct } from "../../lib/format";
import { Badge } from "../shared/Badge";

type Props = {
  positions: PortfolioPosition[];
  loading?: boolean;
};

type SortKey = "ticker" | "structure" | "direction" | "entry" | "marketValue" | "pnl" | "pnlPct" | "risk";
type SortDirection = "asc" | "desc";

const DEFAULT_SORT_DIRECTION: Record<SortKey, SortDirection> = {
  ticker: "asc",
  structure: "asc",
  direction: "asc",
  entry: "desc",
  marketValue: "desc",
  pnl: "desc",
  pnlPct: "desc",
  risk: "asc",
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
  const [sortBy, setSortBy] = useState<SortKey>("ticker");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const rows = useMemo(() => {
    const next = positions.map((pos) => {
      const marketValue = pos.market_value ?? 0;
      const pnl = marketValue - pos.entry_cost;
      const pnlPct = pos.entry_cost !== 0 ? pnl / Math.abs(pos.entry_cost) : 0;

      return {
        pos,
        marketValue,
        pnl,
        pnlPct,
      };
    });

    next.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "ticker") comparison = a.pos.ticker.localeCompare(b.pos.ticker);
      else if (sortBy === "structure") comparison = a.pos.structure.localeCompare(b.pos.structure);
      else if (sortBy === "direction") comparison = a.pos.direction.localeCompare(b.pos.direction);
      else if (sortBy === "entry") comparison = a.pos.entry_cost - b.pos.entry_cost;
      else if (sortBy === "marketValue") comparison = a.marketValue - b.marketValue;
      else if (sortBy === "pnl") comparison = a.pnl - b.pnl;
      else if (sortBy === "pnlPct") comparison = a.pnlPct - b.pnlPct;
      else comparison = a.pos.risk_profile.localeCompare(b.pos.risk_profile);

      if (comparison === 0) {
        comparison = a.pos.ticker.localeCompare(b.pos.ticker);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return next;
  }, [positions, sortBy, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortDirection(DEFAULT_SORT_DIRECTION[key]);
  };

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
            <Th sortKey="ticker" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Ticker</Th>
            <Th sortKey="structure" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Structure</Th>
            <Th sortKey="direction" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Dir</Th>
            <Th align="right" sortKey="entry" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Entry</Th>
            <Th align="right" sortKey="marketValue" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Mkt Val</Th>
            <Th align="right" sortKey="pnl" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>P&L</Th>
            <Th align="right" sortKey="pnlPct" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>P&L%</Th>
            <Th sortKey="risk" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Risk</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ pos, marketValue: mv, pnl, pnlPct }) => {
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

function Th({
  children,
  align = "left",
  sortKey,
  sortBy,
  sortDirection,
  onSort,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortKey: SortKey;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortBy === sortKey;

  return (
    <th style={{ padding: 0, textAlign: align, fontWeight: 500, fontSize: 11 }}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
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
          letterSpacing: "0.05em",
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
