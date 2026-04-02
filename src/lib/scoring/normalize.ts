/**
 * Shared normalization and clamping utilities for scoring modules.
 *
 * Used across: CRI (0-100), stockScore (1-10), marketScoring (0-100),
 * regimeScoring (0-100), compositeTradeScore (0-100), portfolioRiskScore (0-100).
 */

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp a score to the 0-100 range. */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/** Clamp and round a score to the 0-100 range. */
export function clampScoreRound(score: number): number {
  return Math.round(clampScore(score));
}

/**
 * Linear interpolation between two output values based on where `value`
 * falls within [inMin, inMax].
 *
 * Example: lerp(15, 10, 20, 0, 100) => 50
 */
export function lerp(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const ratio = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * ratio;
}
