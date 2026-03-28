/**
 * PortfolioRiskWidget — Compact dashboard card showing the portfolio risk score.
 * Renders on Dashboard and Trading pages.
 */

import { useMemo } from "react";
import { useBrokerStore } from "../../stores/brokerStore";
import { useRiskPrefsStore } from "../../stores/riskPrefsStore";
import { computePortfolioRiskScore } from "../../lib/portfolio/portfolioRiskScore";

const GRADE_COLORS: Record<string, string> = {
  A: "#05AD98",
  B: "#0FCFB5",
  C: "#F5A623",
  D: "#E88B3E",
  F: "#dc2626",
};

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel, #0f1519)",
  border: "1px solid var(--border-dim, #1e293b)",
  borderRadius: 4,
  padding: 16,
  fontFamily: "'IBM Plex Mono', monospace",
};

const headerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-secondary, #64748b)",
  marginBottom: 12,
};

export function PortfolioRiskWidget() {
  const allPositions = useBrokerStore((s) => s.allPositions);
  const allAccounts = useBrokerStore((s) => s.allAccounts);
  const riskTolerance = useRiskPrefsStore((s) => s.riskTolerance);
  const maxLossPercent = useRiskPrefsStore((s) => s.maxLossPercent);
  const targetProfitPercent = useRiskPrefsStore((s) => s.targetProfitPercent);

  const positions = allPositions();
  const accounts = allAccounts();
  const totalEquity = accounts.reduce((sum, a) => sum + a.equity, 0);

  const riskPrefs = useMemo(
    () => ({ riskTolerance, maxLossPercent, targetProfitPercent }),
    [riskTolerance, maxLossPercent, targetProfitPercent],
  );

  const score = useMemo(
    () => computePortfolioRiskScore(positions, totalEquity, riskPrefs),
    [positions, totalEquity, riskPrefs],
  );

  const gradeColor = GRADE_COLORS[score.grade] ?? "#94a3b8";

  // No broker connected
  if (accounts.length === 0 && positions.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>Portfolio Risk Score</div>
        <div style={{ fontSize: 12, color: "var(--text-muted, #475569)", lineHeight: 1.5 }}>
          Connect a broker or import positions to see your portfolio risk score.
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>Portfolio Risk Score</div>

      {/* Grade + Score row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: gradeColor,
            lineHeight: 1,
            width: 48,
            textAlign: "center",
          }}
        >
          {score.grade}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary, #e2e8f0)" }}>
            {score.overall}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)" }}>/100</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted, #475569)", marginTop: 2 }}>
            {score.overall >= 75 ? "Low risk" : score.overall >= 50 ? "Moderate risk" : "Elevated risk"}
          </div>
        </div>
      </div>

      {/* Pillar bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {score.pillars.map((pillar) => (
          <div key={pillar.name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-secondary, #64748b)", marginBottom: 2 }}>
              <span>{pillar.name}</span>
              <span>{pillar.score}</span>
            </div>
            <div style={{ height: 4, background: "var(--border-dim, #1e293b)", borderRadius: 2 }}>
              <div
                style={{
                  height: "100%",
                  width: `${pillar.score}%`,
                  borderRadius: 2,
                  background: pillar.score >= 75 ? "#05AD98" : pillar.score >= 50 ? "#F5A623" : "#dc2626",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {score.warnings.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {score.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 10, color: "#E85D6C", lineHeight: 1.4, marginBottom: 2 }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {score.suggestions.length > 0 && (
        <div>
          {score.suggestions.map((s, i) => (
            <div key={i} style={{ fontSize: 10, color: "var(--text-muted, #475569)", lineHeight: 1.4, marginBottom: 2 }}>
              - {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
