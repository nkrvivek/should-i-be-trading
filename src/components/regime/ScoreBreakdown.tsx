import { Panel } from "../layout/Panel";
import type { MarketScore } from "../../lib/marketScoring";

type Props = {
  score: MarketScore | null;
  loading?: boolean;
  onRefresh?: () => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  Volatility: "VIX",
  Momentum: "MOM",
  Trend: "TRD",
  Breadth: "BRD",
  Macro: "MAC",
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{
      flex: 1,
      height: 8,
      background: "var(--border-dim)",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      <div style={{
        width: `${score}%`,
        height: "100%",
        background: color,
        borderRadius: 4,
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "var(--positive)";
  if (score >= 60) return "var(--signal-core)";
  if (score >= 40) return "var(--warning)";
  return "var(--negative)";
}

export function ScoreBreakdown({ score, loading, onRefresh }: Props) {
  if (!score && !loading) return null;

  return (
    <Panel title="Market Quality Score" onRefresh={onRefresh} loading={loading}>
      {score && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Total score header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--bg-panel-raised)",
            borderRadius: 4,
            border: "1px solid var(--border-dim)",
          }}>
            <div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                Composite Score
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 32,
                fontWeight: 700,
                color: getScoreColor(score.total),
                lineHeight: 1,
              }}>
                {score.total}
                <span style={{ fontSize: 16, color: "var(--text-muted)", marginLeft: 2 }}>/100</span>
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                Execution Window
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 600,
                color: getScoreColor(score.executionWindow),
              }}>
                {score.executionWindow}%
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {score.categories.map((cat) => (
              <div key={cat.name} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                {/* Category label */}
                <div style={{
                  width: 36,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textAlign: "right",
                  flexShrink: 0,
                }}>
                  {CATEGORY_ICONS[cat.name] ?? cat.name.slice(0, 3).toUpperCase()}
                </div>

                {/* Score bar */}
                <ScoreBar score={cat.score} color={getScoreColor(cat.score)} />

                {/* Score value */}
                <div style={{
                  width: 30,
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: getScoreColor(cat.score),
                  textAlign: "right",
                  flexShrink: 0,
                }}>
                  {cat.score}
                </div>

                {/* Weight */}
                <div style={{
                  width: 28,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textAlign: "right",
                  flexShrink: 0,
                }}>
                  {(cat.weight * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 12px",
            background: "var(--bg-panel-raised)",
            borderRadius: 4,
            border: "1px solid var(--border-dim)",
          }}>
            {score.categories.map((cat) => (
              <div key={cat.name} style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{cat.name}:</span>{" "}
                {cat.detail}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            padding: "8px 0",
            borderTop: "1px solid var(--border-dim)",
          }}>
            {score.summary}
          </div>

          {/* Timestamp */}
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "right",
          }}>
            Updated {new Date(score.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </Panel>
  );
}
