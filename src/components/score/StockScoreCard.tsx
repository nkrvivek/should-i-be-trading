/**
 * StockScoreCard — branded display for the proprietary SIBT Score.
 *
 * The SIBT Score is a proprietary composite rating (1-10) that synthesizes
 * technical, fundamental, sentiment, and options signals into a single
 * actionable number — institutional-grade analysis, simplified.
 */

import { useState } from "react";
import type { StockScore, ScoreCategory, ScoreSignal } from "../../lib/stockScore";

interface Props {
  score: StockScore;
}

export function StockScoreCard({ score }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const signalCount = score.categories.reduce((sum, c) => sum + c.signals.length, 0);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: `1px solid ${scoreColor(score.composite)}33`,
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Branded header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 16px",
          background: `linear-gradient(90deg, ${scoreColor(score.composite)}18, transparent)`,
          borderBottom: `1px solid ${scoreColor(score.composite)}22`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--signal-core)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            SIBT Score
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--signal-core)",
              background: "rgba(5, 173, 152, 0.12)",
              padding: "1px 6px",
              borderRadius: 3,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            PROPRIETARY
          </span>
        </div>
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            padding: 0,
          }}
        >
          {showMethodology ? "HIDE" : "METHODOLOGY"}
        </button>
      </div>

      {/* Methodology tooltip */}
      {showMethodology && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(5, 173, 152, 0.05)",
            borderBottom: "1px solid var(--border-dim)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--text-muted)",
          }}
        >
          <strong style={{ color: "var(--text-secondary)" }}>How SIBT Score works:</strong>{" "}
          The SIBT Score synthesizes {signalCount}+ real-time signals across four weighted categories
          — Technical (30%), Fundamental (35%), Sentiment (20%), and Options (15%) — into a single
          composite 1-10 rating. Each signal is benchmarked against market-wide norms. Scores above 7
          indicate strong confluence of bullish factors; below 4 signals caution. Click any category
          below to drill into individual signal contributions.
        </div>
      )}

      {/* Main score display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 16px",
          background: "var(--bg-panel-raised)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        {/* Score Ring */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `conic-gradient(${scoreColor(score.composite)} ${score.composite * 10}%, var(--border-dim) 0)`,
            flexShrink: 0,
            boxShadow: `0 0 16px ${scoreColor(score.composite)}22`,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "var(--bg-panel)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 24,
                fontWeight: 700,
                color: scoreColor(score.composite),
                lineHeight: 1,
              }}
            >
              {score.composite.toFixed(1)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>
              / 10
            </span>
          </div>
        </div>

        {/* Symbol + Rating + Verdict */}
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            {score.symbol}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: scoreColor(score.composite),
              marginTop: 4,
            }}
          >
            {score.rating}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {signalCount} signals analyzed
          </div>
        </div>

        {/* Mini category bars */}
        <div style={{ flex: 1, display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {score.categories.map((cat) => (
            <MiniBar key={cat.name} category={cat} />
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        {score.categories.map((cat) => {
          const isExpanded = expandedCat === cat.name;
          const hasSignals = cat.signals.length > 0;

          return (
            <div key={cat.name}>
              <button
                onClick={() => hasSignals && setExpandedCat(isExpanded ? null : cat.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border-dim)",
                  cursor: hasSignals ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                {/* Category name */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    minWidth: 100,
                  }}
                >
                  {cat.name}
                </span>

                {/* Weight badge */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--text-muted)",
                    background: "var(--bg-panel-raised)",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {(cat.weight * 100).toFixed(0)}%
                </span>

                {/* Score bar */}
                <div style={{ flex: 1, height: 8, background: "var(--bg-base)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${cat.score * 10}%`,
                      height: "100%",
                      background: scoreColor(cat.score),
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Score value */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: scoreColor(cat.score),
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {cat.score.toFixed(1)}
                </span>

                {/* Expand arrow */}
                {hasSignals && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                )}
              </button>

              {/* Expanded signals */}
              {isExpanded && hasSignals && (
                <div style={{ padding: "4px 16px 8px 32px", background: "rgba(255,255,255,0.01)" }}>
                  {cat.signals.map((signal, i) => (
                    <SignalRow key={i} signal={signal} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Branded footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 16px 6px",
          borderTop: "1px solid var(--border-dim)",
        }}
      >
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
          {signalCount} signals | Updated {new Date(score.computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", opacity: 0.6 }}>
          sibt.ai
        </span>
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────── */

function MiniBar({ category }: { category: ScoreCategory }) {
  return (
    <div style={{ minWidth: 60, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>
        {category.name}
      </div>
      <div style={{ height: 4, background: "var(--bg-base)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: `${category.score * 10}%`,
            height: "100%",
            background: scoreColor(category.score),
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: scoreColor(category.score), marginTop: 1 }}>
        {category.score.toFixed(1)}
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: ScoreSignal }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "3px 0",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      {/* Contribution indicator */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 20,
          height: 16,
          borderRadius: 3,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          color: "#000",
          background: signal.contribution > 0 ? "var(--positive)" : signal.contribution < 0 ? "var(--negative)" : "var(--text-muted)",
        }}
      >
        {signal.contribution > 0 ? `+${signal.contribution}` : signal.contribution}
      </span>

      {/* Signal name */}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 110 }}>
        {signal.name}
      </span>

      {/* Value */}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", minWidth: 80 }}>
        {signal.value}
      </span>

      {/* Description */}
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
        {signal.description}
      </span>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 7) return "var(--positive)";
  if (score >= 5) return "var(--signal-core)";
  if (score >= 3) return "var(--warning)";
  return "var(--negative)";
}
