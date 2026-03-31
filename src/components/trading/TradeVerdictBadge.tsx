import {
  useCompositeTradeScore,
} from "../../hooks/useCompositeTradeScore";
import type {
  CompositeScoreInputs,
  CompositeTradeVerdict,
} from "../../lib/compositeTradeScore";

const verdictColors: Record<CompositeTradeVerdict, { bg: string; color: string }> = {
  TRADE: { bg: "rgba(5, 173, 152, 0.15)", color: "var(--positive)" },
  CAUTION: { bg: "rgba(245, 166, 35, 0.15)", color: "var(--warning)" },
  AVOID: { bg: "rgba(232, 93, 108, 0.15)", color: "var(--negative)" },
};

const sizeStyles = {
  sm: { height: 18, fontSize: 11, padding: "0 6px" },
  md: { height: 22, fontSize: 13, padding: "0 10px" },
} as const;

type BadgeSize = keyof typeof sizeStyles;

export function TradeVerdictBadge({
  verdict,
  score,
  confidence,
  size = "sm",
  onClick,
  title,
}: {
  verdict: CompositeTradeVerdict;
  score?: number;
  confidence?: number;
  size?: BadgeSize;
  onClick?: () => void;
  title?: string;
}) {
  const colors = verdictColors[verdict];
  const dims = sizeStyles[size];

  return (
    <span
      onClick={onClick}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        background: colors.bg,
        color: colors.color,
        cursor: onClick ? "pointer" : "default",
        opacity: confidence != null && confidence < 0.34 ? 0.75 : 1,
        ...dims,
      }}
    >
      {score != null ? `${verdict} ${score}` : verdict}
    </span>
  );
}

export function TradeVerdictBadgeWithScore({
  symbol,
  size = "sm",
  showScore = true,
  inputs,
  onClick,
}: {
  symbol: string | null;
  size?: BadgeSize;
  showScore?: boolean;
  inputs?: Partial<CompositeScoreInputs>;
  onClick?: () => void;
}) {
  const { score } = useCompositeTradeScore(symbol, inputs);

  if (!score) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
          background: "var(--bg-panel-raised)",
          color: "var(--text-muted)",
          ...sizeStyles[size],
        }}
      >
        ---
      </span>
    );
  }

  const roundedScore = Math.round(score.overall);
  const confidencePct = Math.round(score.confidence * 100);
  const tooltip = `${score.symbol}: ${roundedScore}/100 ${score.verdict} • confidence ${confidencePct}%`;

  return (
    <TradeVerdictBadge
      verdict={score.verdict}
      score={showScore ? roundedScore : undefined}
      confidence={score.confidence}
      size={size}
      onClick={onClick}
      title={tooltip}
    />
  );
}
