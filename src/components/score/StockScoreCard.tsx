/**
 * StockScoreCard — visual display for the per-stock SIBT Score.
 *
 * Shows the composite 1-10 score as a large gauge, category breakdowns
 * as mini bars, and expandable signal details for each category.
 */

import { useState } from "react";
import type { StockScore, ScoreCategory, ScoreSignal } from "../../lib/stockScore";

interface Props {
  score: StockScore;
}

export function StockScoreCard({ score }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Header with composite score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 16px",
          background: "var(--bg-panel-raised)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        {/* Score Badge */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `conic-gradient(${scoreColor(score.composite)} ${score.composite * 10}%, var(--border-dim) 0)`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
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
                fontSize: 22,
                fontWeight: 700,
                color: scoreColor(score.composite),
                lineHeight: 1,
              }}
            >
              {score.composite.toFixed(1)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)", marginTop: 1 }}>/ 10</span>
          </div>
        </div>

        {/* Symbol + Rating */}
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            {score.symbol}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              color: scoreColor(score.composite),
              marginTop: 2,
            }}
          >
            {score.rating}
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
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
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

      {/* Footer */}
      <div style={{ padding: "4px 16px 6px", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
        Score computed from {score.categories.reduce((sum, c) => sum + c.signals.length, 0)} signals.
        Data may be delayed. Not investment advice.
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
