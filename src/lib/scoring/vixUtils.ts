/**
 * Shared VIX scoring utilities.
 *
 * Both marketScoring.ts and regimeScoring.ts score VIX levels, but with
 * different thresholds, scales, and output shapes. This module provides a
 * parameterized core so the logic isn't duplicated while each caller
 * retains its own thresholds.
 */

import { clampScore } from "./normalize";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A single threshold bracket: VIX values below `below` receive `score`. */
export interface VIXBracket {
  below: number;  // upper bound (exclusive) for this bracket
  score: number;  // 0-100 score assigned when VIX < below
}

export interface VIXScoringResult {
  score: number;  // 0-100
  label: string;  // human-readable label for this bracket
}

/* ------------------------------------------------------------------ */
/*  Preset threshold tables                                            */
/* ------------------------------------------------------------------ */

/**
 * Market Quality Score thresholds (marketScoring.ts).
 * Lower VIX = higher score. Brackets are checked in order; first match wins.
 */
export const MARKET_VIX_BRACKETS: { below: number; score: number; label: string }[] = [
  { below: 12,  score: 95, label: "extreme calm, watch for complacency" },
  { below: 15,  score: 90, label: "very low volatility, favorable" },
  { below: 18,  score: 80, label: "normal, healthy environment" },
  { below: 22,  score: 65, label: "slightly elevated, manageable" },
  { below: 25,  score: 50, label: "elevated, reduce position sizes" },
  { below: 30,  score: 35, label: "high volatility, caution" },
  { below: 35,  score: 20, label: "very high, defensive posture" },
  { below: Infinity, score: 10, label: "extreme fear, capital preservation" },
];

/**
 * Regime Monitor thresholds (regimeScoring.ts).
 * Similar shape but different breakpoints and scores.
 */
export const REGIME_VIX_BRACKETS: { below: number; score: number; label: string }[] = [
  { below: 13,  score: 92, label: "extreme calm, complacency risk but favorable for positioning" },
  { below: 16,  score: 82, label: "low volatility, healthy risk appetite, standard position sizing" },
  { below: 20,  score: 68, label: "mid-range; elevated relative to early-cycle norms but not yet at distress levels; cyclical uptick evident" },
  { below: 25,  score: 48, label: "elevated uncertainty, reduce position sizes, favor defined-risk structures" },
  { below: 30,  score: 30, label: "high volatility, significant hedging activity, defensive posture warranted" },
  { below: 40,  score: 15, label: "fear territory, capital preservation mode, only trade mean-reversion setups" },
  { below: Infinity, score: 5, label: "extreme fear/panic, potential capitulation event, watch for washout signals" },
];

/* ------------------------------------------------------------------ */
/*  Core scoring function                                              */
/* ------------------------------------------------------------------ */

/**
 * Score a VIX level against a bracket table.
 *
 * Walks the brackets in order and returns the first match (where vix < below).
 * The bracket table MUST be sorted by ascending `below` values and the last
 * entry should use `Infinity` (or a very large number) as the catch-all.
 */
export function scoreVIXFromBrackets(
  vix: number,
  brackets: readonly { below: number; score: number; label: string }[],
): VIXScoringResult {
  for (const b of brackets) {
    if (vix <= b.below) {
      return { score: b.score, label: b.label };
    }
  }
  // Fallback (should not reach if last bracket is Infinity)
  const last = brackets[brackets.length - 1];
  return { score: last.score, label: last.label };
}

/**
 * Apply a VIX trend adjustment (rising/falling VIX penalty/bonus).
 * Used by marketScoring to modify the base VIX score.
 */
export function applyVIXTrendAdjustment(
  baseScore: number,
  vix: number,
  vixPrev: number | undefined,
): { score: number; trendDetail: string | null } {
  if (!vixPrev || vixPrev <= 0) {
    return { score: baseScore, trendDetail: null };
  }

  const vixChg = ((vix - vixPrev) / vixPrev) * 100;
  let adjusted = baseScore;
  let trendDetail: string | null = null;

  if (vixChg > 10) {
    adjusted = clampScore(adjusted - 15);
    trendDetail = `Spiking +${vixChg.toFixed(1)}%`;
  } else if (vixChg > 5) {
    adjusted = clampScore(adjusted - 8);
    trendDetail = `Rising +${vixChg.toFixed(1)}%`;
  } else if (vixChg < -5) {
    adjusted = clampScore(adjusted + 5);
    trendDetail = `Falling ${vixChg.toFixed(1)}%`;
  }

  return { score: adjusted, trendDetail };
}
