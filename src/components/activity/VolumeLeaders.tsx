/**
 * Volume leaders table with mini-tabs: MOST ACTIVE | GAINERS | LOSERS
 */

import { useState } from "react";
import type { ActiveStock } from "../../api/marketActivityClient";

interface Props {
  actives: ActiveStock[];
  gainers: ActiveStock[];
  losers: ActiveStock[];
}

type SubTab = "actives" | "gainers" | "losers";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "actives", label: "MOST ACTIVE" },
  { id: "gainers", label: "GAINERS" },
  { id: "losers", label: "LOSERS" },
];

function formatVolume(v: number | undefined): string {
  if (!v) return "--";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function VolumeLeaders({ actives, gainers, losers }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("actives");

  const dataMap: Record<SubTab, ActiveStock[]> = { actives, gainers, losers };
  const rows = (dataMap[activeSubTab] || []).slice(0, 20);

  return (
    <div style={{
      background: "var(--surface-primary)",
      border: "1px solid var(--border-primary)",
      borderRadius: 8,
    }}>
      {/* Mini tab bar */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--border-primary)",
      }}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: activeSubTab === tab.id ? "var(--surface-secondary)" : "transparent",
              color: activeSubTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              border: "none",
              borderBottom: activeSubTab === tab.id ? "2px solid var(--signal-core)" : "2px solid transparent",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
              {["Symbol", "Name", "Price", "Change", "Change %", "Volume"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    textAlign: h === "Symbol" || h === "Name" ? "left" : "right",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                  No data available
                </td>
              </tr>
            )}
            {rows.map((stock, i) => {
              const isPositive = stock.changesPercentage >= 0;
              const changeColor = isPositive ? "var(--signal-bullish, #22c55e)" : "var(--signal-bearish, #ef4444)";
              return (
                <tr
                  key={`${stock.symbol}-${i}`}
                  style={{
                    borderBottom: "1px solid var(--border-secondary, rgba(255,255,255,0.04))",
                  }}
                >
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {stock.symbol}
                  </td>
                  <td style={{
                    padding: "8px 12px",
                    color: "var(--text-secondary)",
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {stock.name}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-primary)" }}>
                    ${stock.price?.toFixed(2) ?? "--"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: changeColor }}>
                    {isPositive ? "+" : ""}{stock.change?.toFixed(2) ?? "--"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: changeColor, fontWeight: 600 }}>
                    {isPositive ? "+" : ""}{stock.changesPercentage?.toFixed(2) ?? "--"}%
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                    {formatVolume(stock.volume)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
