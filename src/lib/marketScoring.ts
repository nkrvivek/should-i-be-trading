/**
 * Standalone Market Scoring Engine
 * Computes Market Quality Score (0-100) using free Finnhub/FRED data.
 * No Radon dependency required.
 *
 * Categories:
 *   Volatility (25%) — VIX level, VIX percentile
 *   Momentum (25%)   — Sector spread, SPY trend
 *   Trend (20%)      — SPY vs MAs, RSI
 *   Breadth (20%)    — Sector participation (% positive sectors)
 *   Macro (10%)      — 10Y yield trend, DXY
 */

import {
  scoreVIXFromBrackets,
  applyVIXTrendAdjustment,
  MARKET_VIX_BRACKETS,
} from "./scoring/vixUtils";

export type CategoryScore = {
  name: string;
  score: number; // 0-100
  weight: number;
  detail: string;
};

export type MarketScore = {
  total: number; // 0-100
  signal: "YES" | "CAUTION" | "NO";
  categories: CategoryScore[];
  summary: string;
  executionWindow: number; // 0-100
  timestamp: number;
};

export type MarketInputs = {
  vix?: number;
  vixPrev?: number; // previous close for trend
  spyPrice?: number;
  spySma20?: number;
  spySma50?: number;
  spySma200?: number;
  spyRsi14?: number;
  spyChange?: number; // daily % change
  sectorChanges?: { symbol: string; change: number }[];
  tenYearYield?: number;
  tenYearYieldPrev?: number;
  dxy?: number;
  dxyPrev?: number;
  marketOpen?: boolean;
};

/**
 * Compute VIX-based volatility score (0-100).
 * Lower VIX = higher score (better for trading).
 */
function scoreVolatility(vix: number, vixPrev?: number): CategoryScore {
  const base = scoreVIXFromBrackets(vix, MARKET_VIX_BRACKETS);
  let detail = `VIX ${vix.toFixed(1)} — ${base.label}`;

  const { score, trendDetail } = applyVIXTrendAdjustment(base.score, vix, vixPrev);
  if (trendDetail) {
    detail += ` | ${trendDetail}`;
  }

  return { name: "Volatility", score, weight: 0.25, detail };
}

/**
 * Compute trend score based on SPY vs moving averages + RSI.
 */
function scoreTrend(inputs: MarketInputs): CategoryScore {
  let score = 50;
  const parts: string[] = [];

  const { spyPrice, spySma20, spySma50, spySma200, spyRsi14 } = inputs;

  if (spyPrice && spySma200) {
    if (spyPrice > spySma200) {
      score += 15;
      parts.push("Above 200d MA");
    } else {
      score -= 20;
      parts.push("Below 200d MA");
    }
  }

  if (spyPrice && spySma50) {
    if (spyPrice > spySma50) {
      score += 10;
      parts.push("Above 50d MA");
    } else {
      score -= 10;
      parts.push("Below 50d MA");
    }
  }

  if (spyPrice && spySma20) {
    if (spyPrice > spySma20) {
      score += 8;
      parts.push("Above 20d MA");
    } else {
      score -= 8;
      parts.push("Below 20d MA");
    }
  }

  // MA alignment bonus (golden cross / death cross)
  if (spySma20 && spySma50 && spySma200) {
    if (spySma20 > spySma50 && spySma50 > spySma200) {
      score += 10;
      parts.push("MAs aligned bullish");
    } else if (spySma20 < spySma50 && spySma50 < spySma200) {
      score -= 10;
      parts.push("MAs aligned bearish");
    }
  }

  // RSI
  if (spyRsi14) {
    if (spyRsi14 > 70) {
      score -= 5;
      parts.push(`RSI overbought (${spyRsi14.toFixed(0)})`);
    } else if (spyRsi14 < 30) {
      score -= 10;
      parts.push(`RSI oversold (${spyRsi14.toFixed(0)})`);
    } else if (spyRsi14 >= 50 && spyRsi14 <= 65) {
      score += 5;
      parts.push(`RSI healthy (${spyRsi14.toFixed(0)})`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const detail = parts.length > 0 ? parts.join(" | ") : "Insufficient trend data";
  return { name: "Trend", score, weight: 0.20, detail };
}

/**
 * Compute breadth score from sector participation.
 */
function scoreBreadth(sectorChanges?: { symbol: string; change: number }[]): CategoryScore {
  if (!sectorChanges || sectorChanges.length === 0) {
    return { name: "Breadth", score: 50, weight: 0.20, detail: "No sector data available" };
  }

  const positive = sectorChanges.filter((s) => s.change > 0).length;
  const total = sectorChanges.length;
  const pctPositive = (positive / total) * 100;

  let score: number;
  if (pctPositive >= 90) {
    score = 95;
  } else if (pctPositive >= 72) {
    score = 80;
  } else if (pctPositive >= 55) {
    score = 65;
  } else if (pctPositive >= 36) {
    score = 45;
  } else if (pctPositive >= 18) {
    score = 25;
  } else {
    score = 10;
  }

  // Spread between best and worst sector
  const changes = sectorChanges.map((s) => s.change);
  const best = Math.max(...changes);
  const worst = Math.min(...changes);
  const spread = best - worst;

  let detail = `${positive}/${total} sectors positive (${pctPositive.toFixed(0)}%)`;
  if (spread > 3) {
    score = Math.max(0, score - 5);
    detail += ` | Wide spread (${spread.toFixed(1)}%)`;
  }

  return { name: "Breadth", score, weight: 0.20, detail };
}

/**
 * Compute momentum score from sector leaders/laggards + SPY daily change.
 */
function scoreMomentum(inputs: MarketInputs): CategoryScore {
  let score = 50;
  const parts: string[] = [];

  // SPY daily change
  if (inputs.spyChange !== undefined) {
    if (inputs.spyChange > 1) {
      score += 20;
      parts.push(`SPY +${inputs.spyChange.toFixed(2)}% strong`);
    } else if (inputs.spyChange > 0.3) {
      score += 10;
      parts.push(`SPY +${inputs.spyChange.toFixed(2)}%`);
    } else if (inputs.spyChange > -0.3) {
      parts.push(`SPY flat (${inputs.spyChange.toFixed(2)}%)`);
    } else if (inputs.spyChange > -1) {
      score -= 10;
      parts.push(`SPY ${inputs.spyChange.toFixed(2)}%`);
    } else {
      score -= 20;
      parts.push(`SPY ${inputs.spyChange.toFixed(2)}% weak`);
    }
  }

  // Sector leadership spread
  if (inputs.sectorChanges && inputs.sectorChanges.length > 0) {
    const sorted = [...inputs.sectorChanges].sort((a, b) => b.change - a.change);
    const top3Avg = sorted.slice(0, 3).reduce((s, x) => s + x.change, 0) / 3;
    const bot3Avg = sorted.slice(-3).reduce((s, x) => s + x.change, 0) / 3;
    const relStrength = top3Avg - bot3Avg;

    if (relStrength > 2) {
      score += 10;
      parts.push(`Sector spread: ${relStrength.toFixed(1)}%`);
    } else if (relStrength < 0.5) {
      score -= 5;
      parts.push("No clear sector leadership");
    }

    // Name leaders
    parts.push(`Leaders: ${sorted.slice(0, 2).map((s) => s.symbol).join(", ")}`);
  }

  score = Math.max(0, Math.min(100, score));
  const detail = parts.length > 0 ? parts.join(" | ") : "Insufficient momentum data";
  return { name: "Momentum", score, weight: 0.25, detail };
}

/**
 * Compute macro/liquidity score from 10Y yield and DXY.
 */
function scoreMacro(inputs: MarketInputs): CategoryScore {
  let score = 60; // neutral baseline
  const parts: string[] = [];

  // 10Y yield trend
  if (inputs.tenYearYield !== undefined) {
    if (inputs.tenYearYield > 5) {
      score -= 15;
      parts.push(`10Y yield ${inputs.tenYearYield.toFixed(2)}% — restrictive`);
    } else if (inputs.tenYearYield > 4.5) {
      score -= 8;
      parts.push(`10Y yield ${inputs.tenYearYield.toFixed(2)}% — elevated`);
    } else if (inputs.tenYearYield < 3.5) {
      score += 10;
      parts.push(`10Y yield ${inputs.tenYearYield.toFixed(2)}% — accommodative`);
    } else {
      parts.push(`10Y yield ${inputs.tenYearYield.toFixed(2)}%`);
    }

    if (inputs.tenYearYieldPrev) {
      const yieldChg = inputs.tenYearYield - inputs.tenYearYieldPrev;
      if (yieldChg > 0.05) {
        score -= 5;
        parts.push(`Rising +${(yieldChg * 100).toFixed(0)}bps`);
      } else if (yieldChg < -0.05) {
        score += 5;
        parts.push(`Falling ${(yieldChg * 100).toFixed(0)}bps`);
      }
    }
  }

  // DXY trend
  if (inputs.dxy !== undefined && inputs.dxyPrev !== undefined) {
    const dxyChg = ((inputs.dxy - inputs.dxyPrev) / inputs.dxyPrev) * 100;
    if (dxyChg > 0.5) {
      score -= 5;
      parts.push(`DXY strengthening (+${dxyChg.toFixed(1)}%)`);
    } else if (dxyChg < -0.5) {
      score += 5;
      parts.push(`DXY weakening (${dxyChg.toFixed(1)}%)`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const detail = parts.length > 0 ? parts.join(" | ") : "No macro data";
  return { name: "Macro", score, weight: 0.10, detail };
}

/**
 * Compute execution window score (are setups working?).
 * Based on SPY behavior: breakout follow-through, pullback recovery.
 */
function computeExecutionWindow(inputs: MarketInputs): number {
  let score = 50;

  // SPY above short-term MA = breakouts likely holding
  if (inputs.spyPrice && inputs.spySma20) {
    if (inputs.spyPrice > inputs.spySma20 * 1.01) score += 15;
    else if (inputs.spyPrice < inputs.spySma20 * 0.99) score -= 15;
  }

  // Positive daily momentum
  if (inputs.spyChange !== undefined) {
    if (inputs.spyChange > 0.5) score += 10;
    else if (inputs.spyChange < -0.5) score -= 10;
  }

  // Good breadth = setups more likely to work
  if (inputs.sectorChanges) {
    const positive = inputs.sectorChanges.filter((s) => s.change > 0).length;
    if (positive >= 8) score += 10;
    else if (positive <= 3) score -= 10;
  }

  // Low VIX = setups hold better
  if (inputs.vix) {
    if (inputs.vix < 18) score += 10;
    else if (inputs.vix > 25) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate plain-English summary.
 */
function generateSummary(total: number, categories: CategoryScore[], inputs: MarketInputs): string {
  const parts: string[] = [];

  // Regime characterization
  if (inputs.vix) {
    if (inputs.vix > 30) parts.push("High-volatility, risk-off environment");
    else if (inputs.vix > 22) parts.push("Elevated volatility environment");
    else if (inputs.vix < 15) parts.push("Low-volatility, risk-on environment");
    else parts.push("Normal volatility environment");
  }

  // Trend
  const trendScore = categories.find((c) => c.name === "Trend")?.score ?? 50;
  if (trendScore >= 75) parts.push("with strong uptrend structure");
  else if (trendScore >= 55) parts.push("with intact trend");
  else if (trendScore <= 30) parts.push("with deteriorating trend structure");
  else parts.push("with mixed trend signals");

  // Breadth
  const breadthScore = categories.find((c) => c.name === "Breadth")?.score ?? 50;
  if (breadthScore >= 75) parts.push("and broad participation");
  else if (breadthScore <= 30) parts.push("and narrow/deteriorating breadth");

  // Sector leadership
  if (inputs.sectorChanges && inputs.sectorChanges.length > 0) {
    const sorted = [...inputs.sectorChanges].sort((a, b) => b.change - a.change);
    const leaders = sorted.slice(0, 2).map((s) => s.symbol);
    parts.push(`Sector leadership: ${leaders.join(", ")}.`);
  }

  // Recommendation
  if (total >= 80) {
    parts.push("Favor aggressive swing entries with standard sizing.");
  } else if (total >= 60) {
    parts.push("Select high-conviction setups only, reduce size.");
  } else {
    parts.push("Preserve capital, avoid new positions.");
  }

  return parts.join(" ");
}

/**
 * Main scoring function. Computes Market Quality Score from all inputs.
 */
export function computeMarketScore(inputs: MarketInputs): MarketScore {
  const categories: CategoryScore[] = [];

  // Compute each category
  if (inputs.vix !== undefined) {
    categories.push(scoreVolatility(inputs.vix, inputs.vixPrev));
  } else {
    categories.push({ name: "Volatility", score: 50, weight: 0.25, detail: "VIX data unavailable" });
  }

  categories.push(scoreMomentum(inputs));
  categories.push(scoreTrend(inputs));
  categories.push(scoreBreadth(inputs.sectorChanges));
  categories.push(scoreMacro(inputs));

  // Weighted total
  const total = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0)
  );

  // Decision
  let signal: "YES" | "CAUTION" | "NO";
  if (!inputs.marketOpen) {
    signal = "NO";
  } else if (total >= 80) {
    signal = "YES";
  } else if (total >= 60) {
    signal = "CAUTION";
  } else {
    signal = "NO";
  }

  const executionWindow = computeExecutionWindow(inputs);
  const summary = generateSummary(total, categories, inputs);

  return {
    total,
    signal,
    categories,
    summary,
    executionWindow,
    timestamp: Date.now(),
  };
}

/**
 * Compute RSI from candle close prices.
 */
export function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Compute simple moving average from close prices.
 */
export function computeSMA(closes: number[], period: number): number | undefined {
  if (closes.length < period) return undefined;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((s, v) => s + v, 0) / period;
}
