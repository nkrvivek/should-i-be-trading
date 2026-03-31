import { useEffect, useRef, useState } from "react";
import {
  useCompositeTradeScore,
} from "../../hooks/useCompositeTradeScore";
import type {
  CompositeScoreInputs,
  CompositeTradeScore,
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
  size = "sm",
  onClick,
}: {
  verdict: CompositeTradeVerdict;
  score?: number;
  size?: BadgeSize;
  onClick?: () => void;
}) {
  const colors = verdictColors[verdict];
  const dims = sizeStyles[size];

  return (
    <span
      onClick={onClick}
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
        ...dims,
      }}
    >
      {score != null ? `${verdict} ${score}` : verdict}
    </span>
  );
}

function CompositeScoreInfo({ score, size = "sm" }: { score: CompositeTradeScore; size?: BadgeSize }) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const marketComponents = score.components.filter((component) => component.bucket === "market");
  const tickerComponents = score.components.filter((component) => component.bucket === "ticker");
  const questionSize = size === "md" ? 16 : 14;

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="How this score was calculated"
        style={{
          width: questionSize,
          height: questionSize,
          borderRadius: "50%",
          border: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
          color: open ? "var(--signal-core)" : "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: size === "md" ? 11 : 10,
          fontWeight: 700,
          lineHeight: 1,
          padding: 0,
          cursor: "pointer",
        }}
      >
        ?
      </button>

      {open && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 1000,
            width: 360,
            padding: 16,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 6,
            boxShadow: "0 10px 36px rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Composite Trade Score
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
            Weighted 0-100 score. Market block is 40% of the total and ticker block is 60%. Missing inputs default to neutral 50 and reduce confidence.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
            <MetricCard label="Overall" value={`${score.overall}`} tone={score.verdict === "TRADE" ? "var(--positive)" : score.verdict === "AVOID" ? "var(--negative)" : "var(--warning)"} />
            <MetricCard label="Market" value={`${score.marketBase}`} tone="var(--signal-core)" />
            <MetricCard label="Ticker" value={`${score.tickerScore}`} tone="var(--info)" />
          </div>

          <ComponentSection title="Market Inputs" components={marketComponents} />
          <ComponentSection title="Ticker Inputs" components={tickerComponents} />

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              Confidence {Math.round(score.confidence * 100)}%
            </div>
            <a
              href={`/learn?q=${encodeURIComponent("Composite Trade Score")}&term=${encodeURIComponent("Composite Trade Score")}`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--signal-core)",
                textDecoration: "none",
              }}
            >
              Learn more →
            </a>
          </div>
        </div>
      )}
    </span>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 4,
        border: "1px solid var(--border-dim)",
        background: "var(--bg-panel-raised)",
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: tone }}>
        {value}
      </div>
    </div>
  );
}

function ComponentSection({
  title,
  components,
}: {
  title: string;
  components: CompositeTradeScore["components"];
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {components.map((component) => (
          <div
            key={component.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            <span>{component.label}</span>
            <span>{Math.round(component.weight * 100)}%</span>
            <span style={{ color: component.missing ? "var(--warning)" : "var(--text-primary)", fontWeight: 600 }}>
              {component.score}
              {component.missing ? " neutral" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
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

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, opacity: score.confidence < 0.34 ? 0.75 : 1 }}>
      <TradeVerdictBadge
        verdict={score.verdict}
        score={showScore ? roundedScore : undefined}
        size={size}
        onClick={onClick}
      />
      <CompositeScoreInfo score={score} size={size} />
    </span>
  );
}
