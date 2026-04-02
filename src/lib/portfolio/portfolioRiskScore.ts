/**
 * Portfolio Risk Score — Pure scoring engine.
 * Computes a composite 0-100 risk score across 5 pillars:
 * Concentration, Diversification, Drawdown, Position Sizing, Hedging.
 *
 * No React, no stores, no side effects.
 */

import type { BrokerPosition } from "../brokers/types";
import type { RiskPreferences } from "../../stores/riskPrefsStore";
import { getSectorForSymbol } from "../sectorMapping";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PortfolioRiskScore {
  overall: number; // 0-100 (0 = extreme risk, 100 = very safe)
  grade: "A" | "B" | "C" | "D" | "F";
  pillars: RiskPillar[];
  warnings: string[];
  suggestions: string[];
}

export interface RiskPillar {
  name: string;
  score: number; // 0-100
  weight: number; // fraction, sums to 1
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INVERSE_ETFS = ["SH", "SDS", "SQQQ", "SPXU", "PSQ", "DOG", "VXX", "UVXY"];
const CASH_LIKE = ["SGOV", "SHY", "BIL", "VMFXX", "SPAXX"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / values.length);
}

function getSector(symbol: string): string {
  // Strip option suffixes — take the root ticker
  const root = symbol.replace(/\d.*$/, "").toUpperCase();
  return getSectorForSymbol(root) ?? "Other";
}

/* ------------------------------------------------------------------ */
/*  Pillar scorers                                                     */
/* ------------------------------------------------------------------ */

function scoreConcentration(
  positions: BrokerPosition[],
  totalEquity: number,
): { pillar: RiskPillar; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (positions.length === 0 || totalEquity <= 0) {
    return {
      pillar: { name: "Concentration", score: 100, weight: 0.25, description: "No positions — no concentration risk" },
      warnings,
      suggestions,
    };
  }

  const pcts = positions.map((p) => (Math.abs(p.marketValue) / totalEquity) * 100);
  const maxConcentration = Math.max(...pcts);
  const score = Math.max(0, 100 - (maxConcentration - 5) * 3);

  // Find positions above 20%
  positions.forEach((p) => {
    const pct = (Math.abs(p.marketValue) / totalEquity) * 100;
    if (pct > 20) {
      warnings.push(`Position ${p.symbol} is ${pct.toFixed(1)}% of portfolio — high concentration risk`);
      suggestions.push("Consider reducing largest position to below 15% of portfolio");
    }
  });

  return {
    pillar: {
      name: "Concentration",
      score: Math.min(100, Math.max(0, score)),
      weight: 0.25,
      description: `Largest position: ${maxConcentration.toFixed(1)}% of equity`,
    },
    warnings,
    suggestions,
  };
}

function scoreDiversification(
  positions: BrokerPosition[],
): { pillar: RiskPillar; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (positions.length === 0) {
    return {
      pillar: { name: "Diversification", score: 100, weight: 0.25, description: "No positions — no diversification risk" },
      warnings,
      suggestions,
    };
  }

  const sectors = new Set(positions.map((p) => getSector(p.symbol)));
  const uniqueSectors = sectors.size;
  let score = Math.min(100, uniqueSectors * 15);

  if (uniqueSectors === 1) {
    score = 10;
    warnings.push("Portfolio concentrated in single sector");
  } else if (uniqueSectors < 3) {
    warnings.push(`Low sector diversification (${uniqueSectors} sectors)`);
  }

  // Suggest missing sectors when diversification is low
  if (uniqueSectors < 3) {
    const allSectors = ["Technology", "Financials", "Healthcare", "Energy", "Consumer", "Industrials", "Utilities"];
    const missing = allSectors.filter((s) => !sectors.has(s)).slice(0, 3);
    suggestions.push(`Add positions in ${missing.join(", ")} for better diversification`);
  }

  return {
    pillar: {
      name: "Diversification",
      score: Math.min(100, Math.max(0, score)),
      weight: 0.25,
      description: `${uniqueSectors} sector${uniqueSectors !== 1 ? "s" : ""} represented`,
    },
    warnings,
    suggestions,
  };
}

function scoreDrawdown(
  positions: BrokerPosition[],
  totalEquity: number,
  riskPrefs?: RiskPreferences,
): { pillar: RiskPillar; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (positions.length === 0 || totalEquity <= 0) {
    return {
      pillar: { name: "Drawdown Risk", score: 100, weight: 0.20, description: "No positions — no drawdown risk" },
      warnings,
      suggestions,
    };
  }

  const totalNegativePL = positions
    .filter((p) => p.unrealizedPL < 0)
    .reduce((sum, p) => sum + p.unrealizedPL, 0);

  const drawdownPct = Math.abs(totalNegativePL / totalEquity) * 100;
  const score = drawdownPct < 2 ? 100 : Math.max(0, 100 - drawdownPct * 5);

  if (drawdownPct > 10) {
    warnings.push(`Portfolio drawdown is ${drawdownPct.toFixed(1)}% — consider risk management`);
  }

  if (riskPrefs && drawdownPct > riskPrefs.maxLossPercent) {
    warnings.push(`Current drawdown (${drawdownPct.toFixed(1)}%) exceeds your ${riskPrefs.maxLossPercent}% risk tolerance`);
    suggestions.push(`Current drawdown exceeds your ${riskPrefs.maxLossPercent}% risk tolerance`);
  }

  return {
    pillar: {
      name: "Drawdown Risk",
      score: Math.min(100, Math.max(0, score)),
      weight: 0.20,
      description: `Unrealized loss: ${drawdownPct.toFixed(1)}% of equity`,
    },
    warnings,
    suggestions,
  };
}

function scorePositionSizing(
  positions: BrokerPosition[],
  totalEquity: number,
): { pillar: RiskPillar; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (positions.length <= 1 || totalEquity <= 0) {
    return {
      pillar: { name: "Position Sizing", score: positions.length === 0 ? 100 : 80, weight: 0.15, description: positions.length === 0 ? "No positions" : "Single position — sizing N/A" },
      warnings,
      suggestions,
    };
  }

  const pcts = positions.map((p) => (Math.abs(p.marketValue) / totalEquity) * 100);
  const sd = stdDev(pcts);
  const score = Math.max(0, 100 - sd * 5);
  const avgPct = pcts.reduce((s, v) => s + v, 0) / pcts.length;

  // Check for outliers (> 3x average)
  positions.forEach((p) => {
    const pct = (Math.abs(p.marketValue) / totalEquity) * 100;
    if (pct > avgPct * 3) {
      warnings.push(`${p.symbol} is ${(pct / avgPct).toFixed(1)}x the average position size`);
    }
  });

  return {
    pillar: {
      name: "Position Sizing",
      score: Math.min(100, Math.max(0, score)),
      weight: 0.15,
      description: `Size std dev: ${sd.toFixed(1)}%`,
    },
    warnings,
    suggestions,
  };
}

function scoreHedging(
  positions: BrokerPosition[],
): { pillar: RiskPillar; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (positions.length === 0) {
    return {
      pillar: { name: "Hedging", score: 100, weight: 0.15, description: "No positions — no hedging needed" },
      warnings,
      suggestions,
    };
  }

  let score = 0;

  // Detect put options by looking for 'P' after digits in the option symbol.
  // OCC format: AAPL  250718P00200000 — 'P' after date digits.
  // Compact format: SPY230P400 — 'P' after partial date digits.
  // Avoid false positives from ticker characters (AAPL, JPM) by requiring
  // at least 2 preceding digits before the P.
  const hasPuts = positions.some(
    (p) => p.assetType === "option" && /\d{2,}P/i.test(p.symbol),
  );
  const hasInverseETFs = positions.some((p) =>
    INVERSE_ETFS.includes(p.symbol.toUpperCase()),
  );
  const hasCashLike = positions.some((p) =>
    CASH_LIKE.includes(p.symbol.toUpperCase()),
  );

  if (hasPuts) score += 40;
  if (hasInverseETFs) score += 30;
  if (hasCashLike) score += 30;

  if (score === 0) {
    score = 20;
    warnings.push("No portfolio hedges or protective positions detected");
    suggestions.push("Consider protective puts or inverse ETFs for downside protection");
  }

  return {
    pillar: {
      name: "Hedging",
      score: Math.min(100, score),
      weight: 0.15,
      description: score <= 20
        ? "No hedges detected"
        : [hasPuts && "Puts", hasInverseETFs && "Inverse ETFs", hasCashLike && "Cash-like"].filter(Boolean).join(" + "),
    },
    warnings,
    suggestions,
  };
}

/* ------------------------------------------------------------------ */
/*  Main scorer                                                        */
/* ------------------------------------------------------------------ */

export function computePortfolioRiskScore(
  positions: BrokerPosition[],
  totalEquity: number,
  riskPrefs?: RiskPreferences,
): PortfolioRiskScore {
  // Empty portfolio — nothing to risk
  if (positions.length === 0) {
    return {
      overall: 100,
      grade: "A",
      pillars: [
        { name: "Concentration", score: 100, weight: 0.25, description: "No positions" },
        { name: "Diversification", score: 100, weight: 0.25, description: "No positions" },
        { name: "Drawdown Risk", score: 100, weight: 0.20, description: "No positions" },
        { name: "Position Sizing", score: 100, weight: 0.15, description: "No positions" },
        { name: "Hedging", score: 100, weight: 0.15, description: "No positions" },
      ],
      warnings: [],
      suggestions: [],
    };
  }

  const results = [
    scoreConcentration(positions, totalEquity),
    scoreDiversification(positions),
    scoreDrawdown(positions, totalEquity, riskPrefs),
    scorePositionSizing(positions, totalEquity),
    scoreHedging(positions),
  ];

  const pillars = results.map((r) => r.pillar);
  const warnings = [...new Set(results.flatMap((r) => r.warnings))];
  const suggestions = [...new Set(results.flatMap((r) => r.suggestions))];

  const overall = Math.round(
    pillars.reduce((sum, p) => sum + p.score * p.weight, 0),
  );

  // Add overall suggestion if score is low
  if (overall < 50) {
    suggestions.push("Portfolio risk is elevated — review position sizing and hedging");
  }

  return {
    overall,
    grade: gradeFromScore(overall),
    pillars,
    warnings,
    suggestions,
  };
}
