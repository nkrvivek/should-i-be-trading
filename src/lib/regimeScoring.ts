/**
 * Market Regime & Fragility Monitor — Scoring Engine
 *
 * Three pillars:
 *   REGIME (40%)    — Macro & credit backdrop (SPX/200DMA, HY spread, yield curve, FSI)
 *   FRAGILITY (35%) — Internal market health (breadth, RSP/SPY ratio)
 *   TRIGGER (25%)   — Acute vol & price risk (VIX level, VIX term structure)
 *
 * Financial Stress Indicator (FSI):
 *   FSI = (HYG/TLT) / (MOVE × HY_Spread)
 *   Rising = healthy risk appetite. Falling = deterioration.
 *
 * All data from free FRED + Finnhub APIs. No Radon dependency.
 */

import { scoreVIXFromBrackets, REGIME_VIX_BRACKETS } from "./scoring/vixUtils";

// ── Types ──────────────────────────────────────────────────────────────

export type SignalBadge = "POSITIVE" | "NEUTRAL" | "CAUTION" | "ELEVATED";

export type PillarName = "REGIME" | "FRAGILITY" | "TRIGGER";

export type RegimeSignalResult = {
  id: string;
  category: PillarName;
  badge: SignalBadge;
  metricName: string;
  description: string;
  currentValue: string;
  interpretation: string;
  score: number; // 0-100
};

export type RegimePillar = {
  name: PillarName;
  label: string;
  description: string;
  score: number;
  weight: number;
  signals: RegimeSignalResult[];
};

export type MarketState =
  | "Strong / Risk-On"
  | "Stable / Normal"
  | "Fragile / Hedged"
  | "Stressed / Defensive"
  | "Crisis / Risk-Off";

export type ActionStance =
  | "Aggressive"
  | "Normal"
  | "Hedged"
  | "Defensive"
  | "Cash";

export type FSIResult = {
  value: number | null;
  score: number;
  label: string;
  components: {
    hyg: number | null;
    tlt: number | null;
    move: number | null;
    hySpread: number | null;
  };
};

export type RegimeMonitorResult = {
  compositeScore: number;
  confidenceScore: number;
  marketState: MarketState;
  actionStance: ActionStance;
  pillars: RegimePillar[];
  signals: RegimeSignalResult[];
  fsi: FSIResult;
  warnings: string[];
  timestamp: number;
};

export type RegimeInputs = {
  // FRED data
  spxPrice?: number;
  spxSma200?: number;
  hySpread?: number; // BAMLH0A0HYM2 (%)
  twoYearYield?: number; // DGS2
  tenYearYield?: number; // DGS10
  vix?: number; // VIXCLS
  vixPrev?: number;
  vix3m?: number; // VXVCLS (3-month VIX)
  // Finnhub quotes
  rspPrice?: number; // RSP (equal-weight S&P)
  spyPrice?: number; // SPY
  rspPrev?: number; // previous RSP for ratio trend
  spyPrev?: number; // previous SPY for ratio trend
  hygPrice?: number; // HYG (junk bond ETF)
  tltPrice?: number; // TLT (long-term Treasury)
  moveIndex?: number; // MOVE (bond market VIX)
  // Sector data (reused from market score)
  sectorChanges?: { symbol: string; change: number }[];
};

// ── Badge Mapping ──────────────────────────────────────────────────────

function toBadge(score: number): SignalBadge {
  if (score >= 75) return "POSITIVE";
  if (score >= 50) return "NEUTRAL";
  if (score >= 25) return "CAUTION";
  return "ELEVATED";
}

// ── REGIME Pillar Signals ──────────────────────────────────────────────

function scoreSPX200DMA(spxPrice?: number, sma200?: number): RegimeSignalResult {
  if (!spxPrice || !sma200 || sma200 === 0) {
    return {
      id: "spx_200dma",
      category: "REGIME",
      badge: "NEUTRAL",
      metricName: "SPX vs 200DMA",
      description: "Price vs long-term trend",
      currentValue: "N/A",
      interpretation: "Insufficient data for SPX/200DMA calculation",
      score: 50,
    };
  }

  const pctAbove = ((spxPrice - sma200) / sma200) * 100;
  let score: number;
  let interpretation: string;

  if (pctAbove > 10) {
    score = 92;
    interpretation = `SPX ${pctAbove.toFixed(1)}% above 200DMA; strong long-term uptrend with momentum`;
  } else if (pctAbove > 5) {
    score = 82;
    interpretation = `SPX ${pctAbove.toFixed(1)}% above 200DMA; healthy trend with room for pullback`;
  } else if (pctAbove > 0) {
    score = 68;
    interpretation = `SPX maintaining modest premium above long-term MA but lacking conviction; vulnerable to tactical pullback`;
  } else if (pctAbove > -5) {
    score = 38;
    interpretation = `SPX ${Math.abs(pctAbove).toFixed(1)}% below 200DMA; trend broken, defensive positioning warranted`;
  } else {
    score = 15;
    interpretation = `SPX ${Math.abs(pctAbove).toFixed(1)}% below 200DMA; sustained downtrend, capital preservation mode`;
  }

  return {
    id: "spx_200dma",
    category: "REGIME",
    badge: toBadge(score),
    metricName: "SPX vs 200DMA",
    description: "Price vs long-term trend",
    currentValue: `${pctAbove >= 0 ? "+" : ""}${pctAbove.toFixed(1)}% ${pctAbove >= 0 ? "above" : "below"} 200DMA`,
    interpretation,
    score,
  };
}

function scoreHYSpread(hySpread?: number): RegimeSignalResult {
  if (hySpread === undefined || hySpread === null) {
    return {
      id: "hy_spread",
      category: "REGIME",
      badge: "NEUTRAL",
      metricName: "HY Credit Spread",
      description: "High yield OAS — credit stress",
      currentValue: "N/A",
      interpretation: "HY spread data unavailable",
      score: 50,
    };
  }

  let score: number;
  let interpretation: string;
  const bps = Math.round(hySpread * 100);

  if (hySpread < 3.0) {
    score = 90;
    interpretation = `Credit spreads at ${bps} bps; benign credit conditions reflecting strong risk appetite and low default expectations`;
  } else if (hySpread < 3.5) {
    score = 75;
    interpretation = `Credit spreads at ${bps} bps; normal range, no stress signals`;
  } else if (hySpread < 4.5) {
    score = 55;
    interpretation = `Credit spreads widening toward caution zone; reflects underlying concern about refinancing and growth deceleration`;
  } else if (hySpread < 5.5) {
    score = 35;
    interpretation = `Credit spreads at ${bps} bps; elevated stress, markets pricing meaningful default risk increase`;
  } else if (hySpread < 7.0) {
    score = 20;
    interpretation = `Credit spreads at ${bps} bps; significant stress, credit markets signaling recession risk`;
  } else {
    score = 8;
    interpretation = `Credit spreads at ${bps} bps; crisis-level widening, severe credit distress`;
  }

  return {
    id: "hy_spread",
    category: "REGIME",
    badge: toBadge(score),
    metricName: "HY Credit Spread",
    description: "High yield OAS — credit stress",
    currentValue: `${bps} bps`,
    interpretation,
    score,
  };
}

function scoreYieldCurve(twoYear?: number, tenYear?: number): RegimeSignalResult {
  if (twoYear === undefined || tenYear === undefined) {
    return {
      id: "yield_curve",
      category: "REGIME",
      badge: "NEUTRAL",
      metricName: "2s/10s Yield Curve",
      description: "Treasury curve shape",
      currentValue: "N/A",
      interpretation: "Yield curve data unavailable",
      score: 50,
    };
  }

  const spread = (tenYear - twoYear) * 100; // in bps
  let score: number;
  let interpretation: string;

  if (spread > 100) {
    score = 85;
    interpretation = `Curve steepening at +${spread.toFixed(0)} bps; healthy growth expectations, supportive for duration and risk assets`;
  } else if (spread > 50) {
    score = 75;
    interpretation = `Curve positive at +${spread.toFixed(0)} bps; normal term premium, constructive macro backdrop`;
  } else if (spread > 0) {
    score = 62;
    interpretation = `Curve steepening modestly but still compressed; terminal rate expectations softening, supportive for duration`;
  } else if (spread > -50) {
    score = 35;
    interpretation = `Curve inverted at ${spread.toFixed(0)} bps; recession signal active, historically precedes economic contraction by 6-18 months`;
  } else {
    score = 12;
    interpretation = `Deeply inverted at ${spread.toFixed(0)} bps; severe recession signal, extreme monetary tightening pressure`;
  }

  return {
    id: "yield_curve",
    category: "REGIME",
    badge: toBadge(score),
    metricName: "2s/10s Yield Curve",
    description: "Treasury curve shape",
    currentValue: `${spread >= 0 ? "+" : ""}${spread.toFixed(0)} bps`,
    interpretation,
    score,
  };
}

// ── Financial Stress Indicator ─────────────────────────────────────────

function computeFSI(inputs: RegimeInputs): FSIResult {
  const { hygPrice, tltPrice, moveIndex, hySpread } = inputs;

  const components = {
    hyg: hygPrice ?? null,
    tlt: tltPrice ?? null,
    move: moveIndex ?? null,
    hySpread: hySpread ?? null,
  };

  // Need all 4 components
  if (!hygPrice || !tltPrice || !hySpread || hySpread === 0) {
    // Partial FSI: if we have HYG/TLT but not MOVE, use VIX as proxy
    if (hygPrice && tltPrice && hySpread && inputs.vix) {
      const ratio = hygPrice / tltPrice;
      const denominator = inputs.vix * hySpread;
      const fsiValue = denominator > 0 ? (ratio / denominator) * 1000 : null;

      if (fsiValue !== null) {
        const score = normalizeFSI(fsiValue);
        return {
          value: fsiValue,
          score,
          label: fsiLabel(score),
          components: { ...components, move: inputs.vix },
        };
      }
    }
    return { value: null, score: 50, label: "Insufficient Data", components };
  }

  const ratio = hygPrice / tltPrice;
  const denominator = (moveIndex ?? inputs.vix ?? 20) * hySpread;
  const fsiValue = denominator > 0 ? (ratio / denominator) * 1000 : 0;

  const score = normalizeFSI(fsiValue);
  return {
    value: fsiValue,
    score,
    label: fsiLabel(score),
    components: { ...components, move: moveIndex ?? inputs.vix ?? null },
  };
}

/**
 * Normalize raw FSI to 0-100 score.
 * Higher FSI = healthier risk appetite = higher score.
 * Historical range roughly 0.5-3.0 (varies by market).
 */
function normalizeFSI(raw: number): number {
  // Map ~0.3 (crisis) to 0, ~2.5 (euphoria) to 100
  const clamped = Math.max(0.3, Math.min(2.5, raw));
  const score = ((clamped - 0.3) / (2.5 - 0.3)) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function fsiLabel(score: number): string {
  if (score >= 75) return "Healthy";
  if (score >= 50) return "Cautious";
  if (score >= 25) return "Stressed";
  return "Critical";
}

function scoreFSI(inputs: RegimeInputs): RegimeSignalResult {
  const fsi = computeFSI(inputs);
  return {
    id: "fsi",
    category: "REGIME",
    badge: toBadge(fsi.score),
    metricName: "Financial Stress Index",
    description: "(HYG/TLT) / (Vol x HY Spread)",
    currentValue: fsi.value !== null ? fsi.value.toFixed(2) : "N/A",
    interpretation: fsi.value !== null
      ? `FSI at ${fsi.value.toFixed(2)} (${fsi.label}). ${fsi.score >= 50 ? "Risk appetite healthy, credit conditions supportive." : "Deteriorating conditions — bond vol elevated, credit spreads widening, risk appetite declining."}`
      : "Insufficient data to compute Financial Stress Indicator",
    score: fsi.score,
  };
}

// ── FRAGILITY Pillar Signals ───────────────────────────────────────────

function scoreBreadth50DMA(sectorChanges?: { symbol: string; change: number }[]): RegimeSignalResult {
  if (!sectorChanges || sectorChanges.length === 0) {
    return {
      id: "breadth_50dma",
      category: "FRAGILITY",
      badge: "NEUTRAL",
      metricName: "% Above 50DMA",
      description: "Breadth of participation",
      currentValue: "N/A",
      interpretation: "Sector data unavailable for breadth calculation",
      score: 50,
    };
  }

  const positive = sectorChanges.filter((s) => s.change > 0).length;
  const total = sectorChanges.length;
  const pctPositive = Math.round((positive / total) * 100);

  let score: number;
  let interpretation: string;

  if (pctPositive >= 80) {
    score = 88;
    interpretation = `${pctPositive}% of sectors advancing; broad-based rally with strong participation across market`;
  } else if (pctPositive >= 60) {
    score = 68;
    interpretation = `${pctPositive}% of sectors positive; reasonable breadth but selective strength, watch for narrowing`;
  } else if (pctPositive >= 40) {
    score = 42;
    interpretation = `Breadth deteriorating; lower than ideal for bull-market conviction, suggesting selective strength in large-cap names only`;
  } else {
    score = 18;
    interpretation = `Only ${pctPositive}% of sectors positive; severely narrow market, high fragility risk`;
  }

  return {
    id: "breadth_50dma",
    category: "FRAGILITY",
    badge: toBadge(score),
    metricName: "% Above 50DMA",
    description: "Breadth of participation",
    currentValue: `${pctPositive}%`,
    interpretation,
    score,
  };
}

function scoreRSPSPY(inputs: RegimeInputs): RegimeSignalResult {
  const { rspPrice, spyPrice, rspPrev, spyPrev } = inputs;

  if (!rspPrice || !spyPrice || spyPrice === 0) {
    return {
      id: "rsp_spy",
      category: "FRAGILITY",
      badge: "NEUTRAL",
      metricName: "RSP/SPY Ratio",
      description: "Equal vs cap-weight leadership",
      currentValue: "N/A",
      interpretation: "RSP/SPY data unavailable",
      score: 50,
    };
  }

  const ratio = rspPrice / spyPrice;
  let score = 50;
  let interpretation: string;

  // Trend: compare current ratio to previous
  if (rspPrev && spyPrev && spyPrev > 0) {
    const prevRatio = rspPrev / spyPrev;
    const ratioChange = ((ratio - prevRatio) / prevRatio) * 100;

    if (ratioChange > 0.3) {
      score = 72;
      interpretation = `RSP outperforming SPY; equal-weight gaining, broad participation improving. Ratio rising ${ratioChange.toFixed(2)}%`;
    } else if (ratioChange > -0.3) {
      score = 55;
      interpretation = `RSP/SPY ratio stable; no significant divergence between equal and cap-weight indices`;
    } else if (ratioChange > -1.0) {
      score = 35;
      interpretation = `Small-cap underperformance relative to large-cap suggests crowding in mega-cap. Ratio falling ${Math.abs(ratioChange).toFixed(2)}%`;
    } else {
      score = 18;
      interpretation = `RSP underperforming SPY by ${Math.abs(ratioChange).toFixed(1)}% — strong fragility signal indicating narrow rally concentrated in mega-cap tech/AI cohort`;
    }
  } else {
    interpretation = `RSP/SPY ratio at ${ratio.toFixed(4)}; insufficient historical data for trend analysis`;
  }

  return {
    id: "rsp_spy",
    category: "FRAGILITY",
    badge: toBadge(score),
    metricName: "RSP/SPY Ratio",
    description: "Equal vs cap-weight leadership",
    currentValue: `${ratio.toFixed(4)}`,
    interpretation,
    score,
  };
}

// ── TRIGGER Pillar Signals ─────────────────────────────────────────────

function scoreVIXLevel(vix?: number): RegimeSignalResult {
  if (vix === undefined) {
    return {
      id: "vix_level",
      category: "TRIGGER",
      badge: "NEUTRAL",
      metricName: "VIX",
      description: "Implied volatility",
      currentValue: "N/A",
      interpretation: "VIX data unavailable",
      score: 50,
    };
  }

  const result = scoreVIXFromBrackets(vix, REGIME_VIX_BRACKETS);
  const interpretation = `VIX at ${vix.toFixed(1)}; ${result.label}`;

  return {
    id: "vix_level",
    category: "TRIGGER",
    badge: toBadge(result.score),
    metricName: "VIX",
    description: "Implied volatility",
    currentValue: `${vix.toFixed(1)}`,
    interpretation,
    score: result.score,
  };
}

function scoreVIXTermStructure(vix?: number, vix3m?: number): RegimeSignalResult {
  if (vix === undefined || vix3m === undefined || vix3m === 0) {
    return {
      id: "vix_term",
      category: "TRIGGER",
      badge: "NEUTRAL",
      metricName: "VIX Term Structure",
      description: "Spot vs 3-month VIX",
      currentValue: "N/A",
      interpretation: "VIX term structure data unavailable",
      score: 50,
    };
  }

  const ratio = vix / vix3m;
  const isBackwardation = ratio > 1.0;
  const pctDiff = ((vix - vix3m) / vix3m) * 100;

  let score: number;
  let interpretation: string;

  if (ratio < 0.85) {
    score = 88;
    interpretation = `VIX in steep contango (${pctDiff.toFixed(1)}%); market expects volatility to rise but not imminently. Normal, healthy structure`;
  } else if (ratio < 0.95) {
    score = 72;
    interpretation = `VIX in mild contango (${pctDiff.toFixed(1)}%); normal term structure, no immediate stress signals`;
  } else if (ratio < 1.05) {
    score = 48;
    interpretation = `VIX term structure flat (${pctDiff.toFixed(1)}%); transitional state, market uncertainty about near-term direction`;
  } else if (ratio < 1.15) {
    score = 28;
    interpretation = `VIX in backwardation (${pctDiff.toFixed(1)}%); near-term fear exceeds longer-term expectations, acute stress signal`;
  } else {
    score = 10;
    interpretation = `VIX in severe backwardation (${pctDiff.toFixed(1)}%); panic conditions, near-term vol massively elevated vs term`;
  }

  return {
    id: "vix_term",
    category: "TRIGGER",
    badge: toBadge(score),
    metricName: "VIX Term Structure",
    description: "Spot vs 3-month VIX",
    currentValue: isBackwardation ? `Backwardation (${pctDiff.toFixed(1)}%)` : `Contango (${Math.abs(pctDiff).toFixed(1)}%)`,
    interpretation,
    score,
  };
}

// ── Composite Scoring ──────────────────────────────────────────────────

function deriveMarketState(composite: number): MarketState {
  if (composite >= 80) return "Strong / Risk-On";
  if (composite >= 60) return "Stable / Normal";
  if (composite >= 40) return "Fragile / Hedged";
  if (composite >= 20) return "Stressed / Defensive";
  return "Crisis / Risk-Off";
}

function deriveActionStance(composite: number): ActionStance {
  if (composite >= 80) return "Aggressive";
  if (composite >= 60) return "Normal";
  if (composite >= 40) return "Hedged";
  if (composite >= 20) return "Defensive";
  return "Cash";
}

function generateWarnings(signals: RegimeSignalResult[], fsi: FSIResult): string[] {
  const warnings: string[] = [];

  for (const s of signals) {
    if (s.badge === "ELEVATED") {
      if (s.id === "vix_level") warnings.push("VIX in elevated territory — acute volatility risk");
      else if (s.id === "vix_term") warnings.push("VIX term structure in backwardation — near-term stress");
      else if (s.id === "hy_spread") warnings.push("Credit spreads widening significantly — credit stress");
      else if (s.id === "rsp_spy") warnings.push("Small-cap underperformance relative to large-cap suggests crowding in mega-cap");
      else if (s.id === "breadth_50dma") warnings.push("Elevated equity breadth weakness signals deteriorating market health");
      else if (s.id === "yield_curve") warnings.push("Yield curve deeply inverted — recession signal");
    }
  }

  if (fsi.score < 25) {
    warnings.push("Financial Stress Indicator at critical levels — risk appetite collapsing");
  }

  return warnings;
}

// ── Main Entry Point ───────────────────────────────────────────────────

export function computeRegimeMonitor(inputs: RegimeInputs): RegimeMonitorResult {
  // Compute all signals
  const spx200 = scoreSPX200DMA(inputs.spxPrice, inputs.spxSma200);
  const hySpr = scoreHYSpread(inputs.hySpread);
  const yieldCurve = scoreYieldCurve(inputs.twoYearYield, inputs.tenYearYield);
  const fsiSignal = scoreFSI(inputs);
  const breadth = scoreBreadth50DMA(inputs.sectorChanges);
  const rspSpy = scoreRSPSPY(inputs);
  const vixLevel = scoreVIXLevel(inputs.vix);
  const vixTerm = scoreVIXTermStructure(inputs.vix, inputs.vix3m);

  // Build pillars
  const regimeSignals = [spx200, hySpr, yieldCurve, fsiSignal];
  const fragilitySignals = [breadth, rspSpy];
  const triggerSignals = [vixLevel, vixTerm];

  const avgScore = (sigs: RegimeSignalResult[]) =>
    sigs.length > 0 ? Math.round(sigs.reduce((s, x) => s + x.score, 0) / sigs.length) : 50;

  const pillars: RegimePillar[] = [
    {
      name: "REGIME",
      label: "Regime",
      description: "Macro & credit backdrop",
      score: avgScore(regimeSignals),
      weight: 0.40,
      signals: regimeSignals,
    },
    {
      name: "FRAGILITY",
      label: "Fragility",
      description: "Internal market health",
      score: avgScore(fragilitySignals),
      weight: 0.35,
      signals: fragilitySignals,
    },
    {
      name: "TRIGGER",
      label: "Trigger",
      description: "Acute vol & price risk",
      score: avgScore(triggerSignals),
      weight: 0.25,
      signals: triggerSignals,
    },
  ];

  // Composite
  const compositeScore = Math.round(
    pillars.reduce((sum, p) => sum + p.score * p.weight, 0)
  );

  // Confidence: based on data completeness
  const allSignals = [...regimeSignals, ...fragilitySignals, ...triggerSignals];
  const validSignals = allSignals.filter((s) => s.currentValue !== "N/A").length;
  const confidenceScore = Math.round((validSignals / allSignals.length) * 100);

  const fsi = computeFSI(inputs);
  const warnings = generateWarnings(allSignals, fsi);

  return {
    compositeScore,
    confidenceScore,
    marketState: deriveMarketState(compositeScore),
    actionStance: deriveActionStance(compositeScore),
    pillars,
    signals: allSignals,
    fsi,
    warnings,
    timestamp: Date.now(),
  };
}
