/** Signal interpretation thresholds — ported from Radon's CLAUDE.md */

export type SignalStrength = "BULLISH" | "LEAN_BULL" | "NEUTRAL" | "LEAN_BEAR" | "BEARISH";

export function interpretPcRatio(ratio: number): SignalStrength {
  if (ratio > 2.0) return "BEARISH";
  if (ratio > 1.2) return "LEAN_BEAR";
  if (ratio > 0.8) return "NEUTRAL";
  if (ratio > 0.5) return "LEAN_BULL";
  return "BULLISH";
}

export function interpretFlowSide(buyRatio: number | null): SignalStrength {
  if (buyRatio == null) return "NEUTRAL";
  if (buyRatio > 0.65) return "BULLISH";
  if (buyRatio > 0.55) return "LEAN_BULL";
  if (buyRatio > 0.45) return "NEUTRAL";
  if (buyRatio > 0.35) return "LEAN_BEAR";
  return "BEARISH";
}

export type DiscoveryTier = "STRONG" | "MONITOR" | "WEAK" | "NONE";

export function interpretDiscoveryScore(score: number): DiscoveryTier {
  if (score >= 60) return "STRONG";
  if (score >= 40) return "MONITOR";
  if (score >= 20) return "WEAK";
  return "NONE";
}

export type SeasonalitySignal = "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";

export function interpretSeasonality(winRate: number): SeasonalitySignal {
  if (winRate > 60) return "FAVORABLE";
  if (winRate >= 50) return "NEUTRAL";
  return "UNFAVORABLE";
}
