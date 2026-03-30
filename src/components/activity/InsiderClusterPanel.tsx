/**
 * Insider buying cluster panel.
 *
 * Shows detected insider clusters with score badges and insider details.
 */

import type { InsiderCluster } from "../../lib/activity/insiderClusters";

interface Props {
  clusters: InsiderCluster[];
  loading?: boolean;
}

function scoreBadgeColor(score: number): string {
  if (score >= 70) return "var(--signal-bullish, #22c55e)";
  if (score >= 40) return "var(--signal-caution, #eab308)";
  return "var(--text-muted)";
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function InsiderClusterPanel({ clusters, loading }: Props) {
  return (
    <div style={{
      background: "var(--surface-primary)",
      border: "1px solid var(--border-primary)",
      borderRadius: 8,
      minHeight: 200,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
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
          Insider Clusters
        </span>
        {clusters.length > 0 && (
          <span style={{
            background: "var(--signal-core)",
            color: "var(--surface-primary, #000)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
          }}>
            {clusters.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "12px 16px" }}>
        {loading && (
          <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center", padding: 24 }}>
            Scanning insider activity...
          </div>
        )}

        {!loading && clusters.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center", padding: 24 }}>
            No insider buying clusters detected in the last 30 days
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clusters.map((cluster) => (
            <div
              key={cluster.symbol}
              style={{
                border: "1px solid var(--border-secondary, rgba(255,255,255,0.06))",
                borderRadius: 6,
                padding: "10px 12px",
              }}
            >
              {/* Cluster header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}>
                  {cluster.symbol}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: scoreBadgeColor(cluster.clusterScore),
                  color: "#000",
                }}>
                  {cluster.clusterScore}
                </span>
              </div>

              {/* Insiders list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {cluster.insiders.map((ins) => (
                  <div
                    key={ins.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {ins.name}{ins.title ? ` (${ins.title})` : ""}
                    </span>
                    <span style={{ color: "var(--signal-bullish, #22c55e)", fontWeight: 600 }}>
                      {formatValue(ins.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer: date range + total */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-muted)",
              }}>
                <span>{cluster.dateRange.start} - {cluster.dateRange.end}</span>
                <span>Total: {formatValue(cluster.totalValue)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
