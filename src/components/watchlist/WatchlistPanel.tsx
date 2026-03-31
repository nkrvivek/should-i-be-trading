import { useMemo, useState } from "react";
import type { PriceData } from "../../api/types";
import { formatPrice, formatVolume, calcChangePercent } from "../../lib/format";
import { TickerWithCompanyName } from "../shared/TickerWithCompanyName";
import { TradeVerdictBadgeWithScore } from "../trading/TradeVerdictBadge";

type Props = {
  prices: Record<string, PriceData>;
  symbols: string[];
};

type SortKey = "symbol" | "last" | "change" | "changePct" | "bid" | "ask" | "volume";
type SortDirection = "asc" | "desc";

const DEFAULT_SORT_DIRECTION: Record<SortKey, SortDirection> = {
  symbol: "asc",
  last: "desc",
  change: "desc",
  changePct: "desc",
  bid: "desc",
  ask: "desc",
  volume: "desc",
};

export function WatchlistPanel({ prices, symbols }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const rows = useMemo(() => {
    const next = symbols.map((sym) => {
      const p = prices[sym];
      const chg = p ? (p.last != null && p.close != null ? p.last - p.close : null) : null;
      const chgPct = p ? calcChangePercent(p.last, p.close) : null;
      return {
        symbol: sym,
        price: p,
        change: chg,
        changePct: chgPct,
      };
    });

    next.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "symbol") comparison = a.symbol.localeCompare(b.symbol);
      else if (sortBy === "last") comparison = compareNullableNumber(a.price?.last, b.price?.last);
      else if (sortBy === "change") comparison = compareNullableNumber(a.change, b.change);
      else if (sortBy === "changePct") comparison = compareNullableNumber(a.changePct, b.changePct);
      else if (sortBy === "bid") comparison = compareNullableNumber(a.price?.bid, b.price?.bid);
      else if (sortBy === "ask") comparison = compareNullableNumber(a.price?.ask, b.price?.ask);
      else comparison = compareNullableNumber(a.price?.volume, b.price?.volume);

      if (comparison === 0) {
        comparison = a.symbol.localeCompare(b.symbol);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return next;
  }, [prices, sortBy, sortDirection, symbols]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortDirection(DEFAULT_SORT_DIRECTION[key]);
  };

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th sortKey="symbol" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Symbol</Th>
            <Th align="right" sortKey="last" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Last</Th>
            <Th align="right" sortKey="change" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Chg</Th>
            <Th align="right" sortKey="changePct" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Chg%</Th>
            <Th align="right" sortKey="bid" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Bid</Th>
            <Th align="right" sortKey="ask" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Ask</Th>
            <Th align="right" sortKey="volume" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Vol</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ symbol, price: p, change: chg, changePct: chgPct }) => {
            const tone = chg != null ? (chg > 0 ? "var(--positive)" : chg < 0 ? "var(--negative)" : "var(--neutral)") : "var(--text-muted)";

            return (
              <tr key={symbol} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
                <td style={{ padding: "0 8px", fontWeight: 500, color: "var(--text-primary)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <TickerWithCompanyName symbol={symbol} style={{ color: "var(--text-primary)" }} />
                    <TradeVerdictBadgeWithScore symbol={symbol} showScore={false} />
                  </div>
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>{p ? formatPrice(p.last) : "---"}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>
                  {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}` : "---"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>
                  {chgPct != null ? `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%` : "---"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{p ? formatPrice(p.bid) : "---"}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{p ? formatPrice(p.ask) : "---"}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{p ? formatVolume(p.volume) : "---"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
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
    <th
      style={{
        padding: 0,
        textAlign: align,
        fontWeight: 500,
        fontSize: 11,
      }}
    >
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
