import { useMemo } from "react";
import { useBrokerStore } from "../../stores/brokerStore";
import { useManualPortfolioStore } from "../../lib/portfolio/manualPortfolioStore";
import { analyzePositions } from "../../lib/portfolio/strategyAnalyzer";
import type { PositionAnalysis, StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";
import type { SimulatorLeg } from "../../lib/strategy/payoff";

interface Props {
  onSimulate: (symbol: string, price: number, legs: SimulatorLeg[]) => void;
}

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 6,
  marginBottom: 16,
  overflow: "hidden",
};

const headerBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  background: "var(--bg-panel-raised)",
  borderBottom: "1px solid var(--border-dim)",
};

const headerTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
};

const countBadgeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 999,
  background: "var(--accent-bg)",
  color: "var(--accent-text)",
};

const positionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  borderBottom: "1px solid var(--border-dim)",
};

const warningStyle: React.CSSProperties = {
  padding: "6px 16px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--warning)",
  background: "rgba(234, 179, 8, 0.08)",
  borderBottom: "1px solid var(--border-dim)",
};

const suggestionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: "1px solid var(--border-dim)",
};

const riskBadgeColors: Record<string, { bg: string; color: string }> = {
  conservative: { bg: "rgba(5, 173, 152, 0.15)", color: "var(--positive)" },
  moderate: { bg: "rgba(234, 179, 8, 0.15)", color: "var(--warning)" },
  aggressive: { bg: "rgba(232, 93, 108, 0.15)", color: "var(--negative)" },
};

const metricBadgeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid var(--border-dim)",
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
};

const simulateBtnStyle: React.CSSProperties = {
  padding: "5px 14px",
  background: "var(--accent-bg)",
  border: "none",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--accent-text)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

function RiskBadge({ level }: { level: StrategySuggestion["riskLevel"] }) {
  const colors = riskBadgeColors[level];
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: colors.bg,
        color: colors.color,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}

function SuggestionRow({
  suggestion,
  onSimulate,
}: {
  suggestion: StrategySuggestion;
  onSimulate: () => void;
}) {
  return (
    <div style={suggestionRowStyle}>
      <RiskBadge level={suggestion.riskLevel} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 2,
          }}
        >
          {suggestion.strategyName}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {suggestion.description}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ ...metricBadgeStyle, color: "var(--positive)" }}>
          Max +{suggestion.estimatedMaxProfit}
        </span>
        <span style={{ ...metricBadgeStyle, color: "var(--negative)" }}>
          Max -{suggestion.estimatedMaxLoss}
        </span>
        <span style={{ ...metricBadgeStyle, color: "var(--info, var(--text-secondary))" }}>
          {suggestion.maxLossCoverage}
        </span>
      </div>
      <button style={simulateBtnStyle} onClick={onSimulate}>
        Simulate
      </button>
    </div>
  );
}

function PositionCard({
  analysis,
  onSimulate,
}: {
  analysis: PositionAnalysis;
  onSimulate: Props["onSimulate"];
}) {
  const { symbol, position, suggestions, warnings } = analysis;
  const sideColor = position.side === "long" ? "var(--positive)" : "var(--negative)";

  return (
    <div style={{ borderBottom: "2px solid var(--border-dim)" }}>
      <div style={positionHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {symbol}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {position.qty} shares{" "}
            <span style={{ color: sideColor, fontWeight: 600 }}>
              {position.side.toUpperCase()}
            </span>{" "}
            @ ${position.avgEntryPrice.toFixed(2)}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Current: ${position.currentPrice.toFixed(2)}
        </span>
      </div>

      {warnings.map((w, i) => (
        <div key={i} style={warningStyle}>
          {w}
        </div>
      ))}

      {suggestions.map((s, i) => (
        <SuggestionRow
          key={i}
          suggestion={s}
          onSimulate={() => onSimulate(symbol, position.currentPrice, s.legs)}
        />
      ))}
    </div>
  );
}

export default function StrategyAnalysisPanel({ onSimulate }: Props) {
  const brokerPositions = useBrokerStore((s) => s.positions);
  const manualPositions = useManualPortfolioStore((s) => s.positions);

  const allPositions = useMemo(
    () => [...brokerPositions, ...manualPositions],
    [brokerPositions, manualPositions],
  );

  const analyses = useMemo(
    () => analyzePositions(allPositions),
    [allPositions],
  );

  const totalSuggestions = analyses.reduce(
    (sum, a) => sum + a.suggestions.length,
    0,
  );

  if (allPositions.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={headerBarStyle}>
          <span style={headerTextStyle}>Strategy Analysis</span>
        </div>
        <div
          style={{
            padding: 32,
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Connect a broker or import positions via CSV to see strategy
          suggestions.
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerBarStyle}>
        <span style={headerTextStyle}>Strategy Analysis</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={countBadgeStyle}>
            {allPositions.length} position{allPositions.length !== 1 ? "s" : ""}
          </span>
          <span style={countBadgeStyle}>
            {totalSuggestions} suggestion{totalSuggestions !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          No actionable strategy suggestions for current positions.
        </div>
      ) : (
        analyses.map((a, i) => (
          <PositionCard key={`${a.symbol}-${i}`} analysis={a} onSimulate={onSimulate} />
        ))
      )}
    </div>
  );
}
