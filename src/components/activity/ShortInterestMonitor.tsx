/**
 * Short interest monitor — shows FINRA daily short volume data.
 */

import type { ShortVolumeEntry } from "../../api/marketActivityClient";

interface Props {
  data: ShortVolumeEntry[];
  loading?: boolean;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function ShortInterestMonitor({ data, loading }: Props) {
  const rows = [...data]
    .sort((a, b) => b.shortRatio - a.shortRatio)
    .slice(0, 50);

  return (
    <div style={{
      background: "var(--surface-primary)",
      border: "1px solid var(--border-primary)",
      borderRadius: 8,
      minHeight: 200,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-primary)",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          color: "var(--text-primary)",
          textTransform: "uppercase",
        }}>
          Short Interest (FINRA)
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
        {loading && (
          <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center", padding: 24 }}>
            Loading short volume data...
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center", padding: 24 }}>
            No short volume data available
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                {["Symbol", "Short Vol", "Total Vol", "Short %"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: h === "Symbol" ? "left" : "right",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-primary)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isHigh = row.shortRatio > 0.50;
                return (
                  <tr
                    key={`${row.symbol}-${i}`}
                    style={{
                      borderBottom: "1px solid var(--border-secondary, rgba(255,255,255,0.04))",
                      background: isHigh ? "rgba(239, 68, 68, 0.06)" : "transparent",
                    }}
                  >
                    <td style={{
                      padding: "6px 12px",
                      fontWeight: 600,
                      color: isHigh ? "var(--signal-bearish, #ef4444)" : "var(--text-primary)",
                    }}>
                      {row.symbol}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatVolume(row.shortVolume)}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatVolume(row.totalVolume)}
                    </td>
                    <td style={{
                      padding: "6px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: isHigh ? "var(--signal-bearish, #ef4444)" : "var(--text-primary)",
                    }}>
                      {(row.shortRatio * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
