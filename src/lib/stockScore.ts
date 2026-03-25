/**
 * Per-Stock SIBT Score — composite 1-10 rating per ticker.
 *
 * Combines multiple signal categories into one explainable score:
 *   - Technical (momentum, trend, RSI)
 *   - Fundamental (valuation, profitability, growth)
 *   - Sentiment (insider buying, analyst consensus)
 *   - Options (IV percentile, put/call skew)
 *
 * Each category scores 0-10, then weighted into a composite.
 * Inspired by Danelfin's AI scoring but using freely available data.
 */

/* ─── Types ─────────────────────────────────────────── */

export interface ScoreCategory {
  name: string;
  score: number;      // 0-10
  weight: number;     // 0-1
  signals: ScoreSignal[];
}

export interface ScoreSignal {
  name: string;
  value: string;      // Display value ("23.5x", "12.3%", "BUY")
  contribution: number; // -5 to +5 (how much it helps/hurts)
  description: string;
}

export interface StockScore {
  symbol: string;
  composite: number;  // 1-10
  rating: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
  categories: ScoreCategory[];
  computedAt: string;
}

/* ─── Input Data ────────────────────────────────────── */

export interface StockScoreInput {
  // From FMP profile
  price?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  beta?: number;
  volume?: number;
  avgVolume?: number;

  // From FMP ratios TTM
  peRatio?: number;
  pbRatio?: number;
  psRatio?: number;
  evEbitda?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  roe?: number;
  roa?: number;
  currentRatio?: number;
  debtEquity?: number;
  dividendYield?: number;

  // From FMP key metrics
  revenuePerShare?: number;
  fcfPerShare?: number;
  roic?: number;

  // From FMP price target
  priceTargetConsensus?: number;

  // From FMP income (YoY growth — compute from 2 years)
  revenueGrowth?: number;      // YoY %
  netIncomeGrowth?: number;    // YoY %
  epsGrowth?: number;          // YoY %

  // Insider activity (from existing insider hooks)
  insiderBuyCount?: number;    // Last 3 months
  insiderSellCount?: number;
  insiderNetShares?: number;   // Net shares (positive = buying)

  // Options data (from Tradier)
  ivPercentile?: number;       // 0-100, current IV vs 52-week range
  putCallRatio?: number;       // Put volume / Call volume
  avgOptionVolume?: number;
}

/* ─── Score Computation ────────────────────────────── */

export function computeStockScore(symbol: string, input: StockScoreInput): StockScore {
  const technical = scoreTechnical(input);
  const fundamental = scoreFundamental(input);
  const sentiment = scoreSentiment(input);
  const options = scoreOptions(input);

  const categories = [technical, fundamental, sentiment, options];

  // Weighted composite
  let totalWeight = 0;
  let weightedSum = 0;
  for (const cat of categories) {
    // Only include categories that have signals (data available)
    if (cat.signals.length > 0) {
      weightedSum += cat.score * cat.weight;
      totalWeight += cat.weight;
    }
  }

  const composite = totalWeight > 0
    ? Math.max(1, Math.min(10, Math.round((weightedSum / totalWeight) * 10) / 10))
    : 5; // No data = neutral

  return {
    symbol: symbol.toUpperCase(),
    composite,
    rating: getRating(composite),
    categories,
    computedAt: new Date().toISOString(),
  };
}

function getRating(score: number): StockScore["rating"] {
  if (score >= 8) return "Strong Buy";
  if (score >= 6.5) return "Buy";
  if (score >= 4) return "Neutral";
  if (score >= 2.5) return "Sell";
  return "Strong Sell";
}

/* ─── Technical Score (30%) ────────────────────────── */

function scoreTechnical(input: StockScoreInput): ScoreCategory {
  const signals: ScoreSignal[] = [];
  let points = 0;
  let maxPoints = 0;

  // Price momentum (change%)
  if (input.changePercent != null) {
    maxPoints += 3;
    const cp = input.changePercent;
    let contrib = 0;
    if (cp > 2) contrib = 3;
    else if (cp > 0.5) contrib = 2;
    else if (cp > 0) contrib = 1;
    else if (cp > -0.5) contrib = 0;
    else if (cp > -2) contrib = -1;
    else contrib = -2;
    points += contrib;
    signals.push({
      name: "Day Change",
      value: `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%`,
      contribution: contrib,
      description: cp >= 0 ? "Positive momentum today" : "Negative momentum today",
    });
  }

  // Volume vs average
  if (input.volume != null && input.avgVolume != null && input.avgVolume > 0) {
    maxPoints += 2;
    const volRatio = input.volume / input.avgVolume;
    let contrib = 0;
    if (volRatio > 1.5) contrib = 2;
    else if (volRatio > 1.0) contrib = 1;
    else if (volRatio > 0.5) contrib = 0;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "Rel. Volume",
      value: `${volRatio.toFixed(1)}x avg`,
      contribution: contrib,
      description: volRatio > 1 ? "Above-average volume (conviction)" : "Below-average volume",
    });
  }

  // Beta (moderate is better for most)
  if (input.beta != null) {
    maxPoints += 1;
    const b = input.beta;
    let contrib = 0;
    if (b >= 0.8 && b <= 1.5) contrib = 1;
    else if (b > 2 || b < 0.3) contrib = -1;
    points += contrib;
    signals.push({
      name: "Beta",
      value: b.toFixed(2),
      contribution: contrib,
      description: b > 1.5 ? "High volatility stock" : b < 0.5 ? "Low volatility / defensive" : "Moderate volatility",
    });
  }

  // 52-week position (if we have price and no high/low, skip)
  // Price target upside
  if (input.price != null && input.priceTargetConsensus != null && input.priceTargetConsensus > 0) {
    maxPoints += 3;
    const upside = ((input.priceTargetConsensus - input.price) / input.price) * 100;
    let contrib = 0;
    if (upside > 20) contrib = 3;
    else if (upside > 10) contrib = 2;
    else if (upside > 0) contrib = 1;
    else if (upside > -10) contrib = 0;
    else contrib = -2;
    points += contrib;
    signals.push({
      name: "Analyst Target",
      value: `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}% upside`,
      contribution: contrib,
      description: `Consensus target $${input.priceTargetConsensus.toFixed(2)}`,
    });
  }

  const score = maxPoints > 0 ? normalize(points, -maxPoints, maxPoints) : 5;

  return { name: "Technical", score, weight: 0.3, signals };
}

/* ─── Fundamental Score (35%) ──────────────────────── */

function scoreFundamental(input: StockScoreInput): ScoreCategory {
  const signals: ScoreSignal[] = [];
  let points = 0;
  let maxPoints = 0;

  // P/E Ratio
  if (input.peRatio != null) {
    maxPoints += 2;
    const pe = input.peRatio;
    let contrib = 0;
    if (pe > 0 && pe < 15) contrib = 2;
    else if (pe >= 15 && pe < 25) contrib = 1;
    else if (pe >= 25 && pe < 40) contrib = 0;
    else if (pe >= 40 || pe < 0) contrib = -1;
    points += contrib;
    signals.push({
      name: "P/E Ratio",
      value: pe > 0 ? `${pe.toFixed(1)}x` : "N/A",
      contribution: contrib,
      description: pe < 15 ? "Attractively valued" : pe > 40 ? "Premium valuation" : "Fair valuation",
    });
  }

  // Profitability: Net Margin
  if (input.netMargin != null) {
    maxPoints += 2;
    const nm = input.netMargin * 100; // convert to %
    let contrib = 0;
    if (nm > 20) contrib = 2;
    else if (nm > 10) contrib = 1;
    else if (nm > 0) contrib = 0;
    else contrib = -2;
    points += contrib;
    signals.push({
      name: "Net Margin",
      value: `${nm.toFixed(1)}%`,
      contribution: contrib,
      description: nm > 15 ? "Strong profitability" : nm > 0 ? "Profitable" : "Unprofitable",
    });
  }

  // ROE
  if (input.roe != null) {
    maxPoints += 2;
    const roe = input.roe * 100;
    let contrib = 0;
    if (roe > 20) contrib = 2;
    else if (roe > 12) contrib = 1;
    else if (roe > 0) contrib = 0;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "ROE",
      value: `${roe.toFixed(1)}%`,
      contribution: contrib,
      description: roe > 15 ? "Excellent capital efficiency" : roe > 0 ? "Positive returns on equity" : "Negative ROE",
    });
  }

  // Revenue Growth
  if (input.revenueGrowth != null) {
    maxPoints += 2;
    const rg = input.revenueGrowth;
    let contrib = 0;
    if (rg > 20) contrib = 2;
    else if (rg > 10) contrib = 1;
    else if (rg > 0) contrib = 0;
    else if (rg > -10) contrib = -1;
    else contrib = -2;
    points += contrib;
    signals.push({
      name: "Rev Growth",
      value: `${rg >= 0 ? "+" : ""}${rg.toFixed(1)}% YoY`,
      contribution: contrib,
      description: rg > 10 ? "Strong revenue growth" : rg > 0 ? "Growing" : "Revenue declining",
    });
  }

  // EPS Growth
  if (input.epsGrowth != null) {
    maxPoints += 2;
    const eg = input.epsGrowth;
    let contrib = 0;
    if (eg > 25) contrib = 2;
    else if (eg > 10) contrib = 1;
    else if (eg > 0) contrib = 0;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "EPS Growth",
      value: `${eg >= 0 ? "+" : ""}${eg.toFixed(1)}% YoY`,
      contribution: contrib,
      description: eg > 15 ? "Accelerating earnings" : eg > 0 ? "Earnings growing" : "Earnings declining",
    });
  }

  // Debt/Equity
  if (input.debtEquity != null) {
    maxPoints += 1;
    const de = input.debtEquity;
    let contrib = 0;
    if (de < 0.5) contrib = 1;
    else if (de < 1.5) contrib = 0;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "Debt/Equity",
      value: `${de.toFixed(2)}x`,
      contribution: contrib,
      description: de < 0.5 ? "Conservative leverage" : de > 2 ? "High leverage" : "Moderate leverage",
    });
  }

  // Current Ratio
  if (input.currentRatio != null) {
    maxPoints += 1;
    const cr = input.currentRatio;
    let contrib = 0;
    if (cr > 2) contrib = 1;
    else if (cr > 1) contrib = 0;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "Current Ratio",
      value: `${cr.toFixed(2)}`,
      contribution: contrib,
      description: cr > 1.5 ? "Strong liquidity" : cr > 1 ? "Adequate liquidity" : "Liquidity concern",
    });
  }

  const score = maxPoints > 0 ? normalize(points, -maxPoints, maxPoints) : 5;

  return { name: "Fundamental", score, weight: 0.35, signals };
}

/* ─── Sentiment Score (20%) ────────────────────────── */

function scoreSentiment(input: StockScoreInput): ScoreCategory {
  const signals: ScoreSignal[] = [];
  let points = 0;
  let maxPoints = 0;

  // Insider activity
  if (input.insiderBuyCount != null || input.insiderSellCount != null) {
    maxPoints += 3;
    const buys = input.insiderBuyCount ?? 0;
    const sells = input.insiderSellCount ?? 0;
    const net = buys - sells;
    let contrib = 0;
    if (buys >= 3 && net > 0) contrib = 3;
    else if (buys >= 1 && net > 0) contrib = 2;
    else if (net === 0) contrib = 0;
    else if (sells >= 3) contrib = -2;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "Insider Activity",
      value: `${buys}B / ${sells}S (90d)`,
      contribution: contrib,
      description: net > 0
        ? `Net insider buying (${buys} buys) — bullish signal`
        : net < 0
        ? `Net insider selling (${sells} sells) — caution`
        : "No significant insider activity",
    });
  }

  // Insider net shares
  if (input.insiderNetShares != null) {
    maxPoints += 2;
    const ns = input.insiderNetShares;
    let contrib = 0;
    if (ns > 100000) contrib = 2;
    else if (ns > 0) contrib = 1;
    else if (ns > -50000) contrib = 0;
    else contrib = -1;
    points += contrib;
    signals.push({
      name: "Insider Net Shares",
      value: ns >= 0 ? `+${fmtShares(ns)}` : fmtShares(ns),
      contribution: contrib,
      description: ns > 0 ? "Insiders accumulating shares" : "Insiders reducing positions",
    });
  }

  const score = maxPoints > 0 ? normalize(points, -maxPoints, maxPoints) : 5;

  return { name: "Sentiment", score, weight: 0.2, signals };
}

/* ─── Options Score (15%) ──────────────────────────── */

function scoreOptions(input: StockScoreInput): ScoreCategory {
  const signals: ScoreSignal[] = [];
  let points = 0;
  let maxPoints = 0;

  // IV Percentile
  if (input.ivPercentile != null) {
    maxPoints += 2;
    const iv = input.ivPercentile;
    let contrib = 0;
    // Low IV = cheap options = potential for movement
    // High IV = expensive options = market expecting big move
    if (iv < 20) contrib = 1; // Cheap — good for buyers
    else if (iv < 50) contrib = 0;
    else if (iv < 80) contrib = -1; // Elevated
    else contrib = -2; // Very high — caution
    points += contrib;
    signals.push({
      name: "IV Percentile",
      value: `${iv.toFixed(0)}%`,
      contribution: contrib,
      description: iv < 30 ? "Low IV — options cheap" : iv > 70 ? "High IV — market expects big move" : "Normal IV environment",
    });
  }

  // Put/Call Ratio
  if (input.putCallRatio != null) {
    maxPoints += 2;
    const pcr = input.putCallRatio;
    let contrib = 0;
    // Contrarian: high put/call = bearish sentiment = potential bottom
    if (pcr > 1.2) contrib = 2;       // Very bearish sentiment — contrarian bullish
    else if (pcr > 0.8) contrib = 1;  // Slightly bearish — healthy
    else if (pcr > 0.5) contrib = 0;  // Neutral
    else contrib = -1;                 // Very bullish sentiment — contrarian caution
    points += contrib;
    signals.push({
      name: "Put/Call Ratio",
      value: pcr.toFixed(2),
      contribution: contrib,
      description: pcr > 1 ? "Bearish options sentiment (contrarian bullish)" : pcr < 0.5 ? "Very bullish sentiment (contrarian caution)" : "Balanced options flow",
    });
  }

  const score = maxPoints > 0 ? normalize(points, -maxPoints, maxPoints) : 5;

  return { name: "Options", score, weight: 0.15, signals };
}

/* ─── Helpers ───────────────────────────────────────── */

/** Normalize a score from [min, max] range to [1, 10] */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 5;
  const normalized = ((value - min) / (max - min)) * 9 + 1;
  return Math.round(Math.max(1, Math.min(10, normalized)) * 10) / 10;
}

function fmtShares(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  return `${sign}${abs}`;
}
