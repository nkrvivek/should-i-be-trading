/**
 * Technical Indicators Library
 *
 * Centralized computation for all technical indicators used in TSO.
 * Pure math functions — no side effects, no API calls.
 *
 * Includes: EMA, MACD, Bollinger Bands, ATR, Stochastic, VWAP,
 *           support/resistance detection, signal generation.
 *
 * RSI and SMA are re-exported from marketScoring.ts for convenience.
 */

import { computeRSI, computeSMA } from "./marketScoring";
export { computeRSI, computeSMA };

/* ─── Types ──────────────────────────────────────────── */

export interface OHLCV {
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  t: number;  // timestamp (seconds)
}

export interface MACDResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export interface BollingerBands {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
}

export interface StochasticResult {
  k: (number | null)[];  // %K (fast)
  d: (number | null)[];  // %D (slow, SMA of %K)
}

export interface TechnicalSignal {
  indicator: string;
  signal: "bullish" | "bearish" | "neutral";
  strength: number; // 0-100
  description: string;
  value: string;
}

export interface TechnicalAnalysis {
  signals: TechnicalSignal[];
  overallSignal: "bullish" | "bearish" | "neutral";
  overallScore: number; // -100 to +100
  summary: string;
}

/* ─── EMA ────────────────────────────────────────────── */

/**
 * Exponential Moving Average.
 * Returns array of EMA values (null for initial period).
 */
export function computeEMA(closes: number[], period: number): (number | null)[] {
  if (closes.length < period) return closes.map(() => null);
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);

  // Seed with SMA for first value
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(ema);

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

/**
 * Get last non-null EMA value.
 */
export function lastEMA(closes: number[], period: number): number | undefined {
  const ema = computeEMA(closes, period);
  for (let i = ema.length - 1; i >= 0; i--) {
    if (ema[i] !== null) return ema[i]!;
  }
  return undefined;
}

/* ─── MACD ───────────────────────────────────────────── */

/**
 * MACD (Moving Average Convergence Divergence).
 * Default: fast=12, slow=26, signal=9.
 */
export function computeMACD(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MACDResult {
  const fastEma = computeEMA(closes, fast);
  const slowEma = computeEMA(closes, slow);

  // MACD line = fast EMA - slow EMA
  const macdLine: (number | null)[] = fastEma.map((f, i) => {
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  // Signal line = EMA of MACD line
  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalEma = computeEMA(macdValues, signalPeriod);

  // Map signal line back to full array
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  let idx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      signalLine[i] = signalEma[idx] ?? null;
      idx++;
    }
  }

  // Histogram = MACD - Signal
  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });

  return { macdLine, signalLine, histogram };
}

/* ─── Bollinger Bands ────────────────────────────────── */

/**
 * Bollinger Bands (default: 20-period SMA, 2 std dev).
 */
export function computeBollingerBands(closes: number[], period = 20, stdDev = 2): BollingerBands {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const bandwidth: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      bandwidth.push(null);
      continue;
    }

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);

    middle.push(mean);
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
    bandwidth.push(mean > 0 ? ((stdDev * sd * 2) / mean) * 100 : 0);
  }

  return { upper, middle, lower, bandwidth };
}

/* ─── ATR (Average True Range) ───────────────────────── */

/**
 * Average True Range — volatility indicator.
 */
export function computeATR(candles: OHLCV[], period = 14): (number | null)[] {
  if (candles.length < 2) return candles.map(() => null);

  const trueRanges: number[] = [];
  trueRanges.push(candles[0].h - candles[0].l); // First candle: just H-L

  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i - 1].c),
      Math.abs(candles[i].l - candles[i - 1].c),
    );
    trueRanges.push(tr);
  }

  const result: (number | null)[] = [];
  for (let i = 0; i < period - 1; i++) result.push(null);

  // Seed with SMA
  let atr = trueRanges.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push(atr);

  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result.push(atr);
  }
  return result;
}

/* ─── Stochastic Oscillator ──────────────────────────── */

/**
 * Stochastic %K and %D.
 */
export function computeStochastic(candles: OHLCV[], kPeriod = 14, dPeriod = 3): StochasticResult {
  const k: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      k.push(null);
      continue;
    }
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map((c) => c.h));
    const lowestLow = Math.min(...slice.map((c) => c.l));
    const range = highestHigh - lowestLow;
    k.push(range > 0 ? ((candles[i].c - lowestLow) / range) * 100 : 50);
  }

  // %D = SMA of %K
  const d: (number | null)[] = [];
  const kValues = k.filter((v): v is number => v !== null);
  for (let i = 0; i < k.length; i++) {
    if (k[i] === null) {
      d.push(null);
      continue;
    }
    const kIdx = kValues.indexOf(k[i]!);
    if (kIdx < dPeriod - 1) {
      d.push(null);
      continue;
    }
    const dSlice = kValues.slice(kIdx - dPeriod + 1, kIdx + 1);
    d.push(dSlice.reduce((s, v) => s + v, 0) / dPeriod);
  }

  return { k, d };
}

/* ─── VWAP ───────────────────────────────────────────── */

/**
 * Volume Weighted Average Price (intraday).
 */
export function computeVWAP(candles: OHLCV[]): (number | null)[] {
  if (candles.length === 0) return [];

  let cumVolume = 0;
  let cumTPV = 0; // typical price * volume

  return candles.map((c) => {
    const tp = (c.h + c.l + c.c) / 3;
    cumVolume += c.v;
    cumTPV += tp * c.v;
    return cumVolume > 0 ? cumTPV / cumVolume : null;
  });
}

/* ─── Support / Resistance Detection ─────────────────── */

export interface SRLevel {
  price: number;
  type: "support" | "resistance";
  strength: number; // 1-5 (touch count)
  lastTouched: number; // timestamp
}

/**
 * Detect support/resistance levels from price pivots.
 * Uses local min/max detection with a tolerance band.
 */
export function detectSupportResistance(candles: OHLCV[], tolerance = 0.015): SRLevel[] {
  if (candles.length < 10) return [];

  const pivots: { price: number; type: "high" | "low"; t: number }[] = [];

  // Find local highs and lows (5-bar lookback/forward)
  const lookback = 5;
  for (let i = lookback; i < candles.length - lookback; i++) {
    const isHigh = candles.slice(i - lookback, i).every((c) => c.h <= candles[i].h) &&
                   candles.slice(i + 1, i + lookback + 1).every((c) => c.h <= candles[i].h);
    const isLow = candles.slice(i - lookback, i).every((c) => c.l >= candles[i].l) &&
                  candles.slice(i + 1, i + lookback + 1).every((c) => c.l >= candles[i].l);

    if (isHigh) pivots.push({ price: candles[i].h, type: "high", t: candles[i].t });
    if (isLow) pivots.push({ price: candles[i].l, type: "low", t: candles[i].t });
  }

  // Cluster pivots within tolerance
  const levels: SRLevel[] = [];
  const used = new Set<number>();

  for (let i = 0; i < pivots.length; i++) {
    if (used.has(i)) continue;
    const cluster = [pivots[i]];
    used.add(i);

    for (let j = i + 1; j < pivots.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(pivots[j].price - pivots[i].price) / pivots[i].price <= tolerance) {
        cluster.push(pivots[j]);
        used.add(j);
      }
    }

    if (cluster.length >= 2) {
      const avgPrice = cluster.reduce((s, p) => s + p.price, 0) / cluster.length;
      const lastPrice = candles[candles.length - 1].c;
      const type = avgPrice > lastPrice ? "resistance" : "support";
      levels.push({
        price: Math.round(avgPrice * 100) / 100,
        type,
        strength: Math.min(5, cluster.length),
        lastTouched: Math.max(...cluster.map((p) => p.t)),
      });
    }
  }

  // Sort by proximity to current price
  const currentPrice = candles[candles.length - 1].c;
  levels.sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice));
  return levels.slice(0, 8); // Top 8 levels
}

/* ─── Signal Generation ──────────────────────────────── */

/**
 * Generate composite technical signals from candle data.
 */
export function generateTechnicalSignals(candles: OHLCV[]): TechnicalAnalysis {
  if (candles.length < 30) {
    return {
      signals: [],
      overallSignal: "neutral",
      overallScore: 0,
      summary: "Insufficient data for technical analysis.",
    };
  }

  const closes = candles.map((c) => c.c);
  const currentPrice = closes[closes.length - 1];
  const signals: TechnicalSignal[] = [];

  // ── RSI ──
  const rsi = computeRSI(closes, 14);
  if (rsi > 70) {
    signals.push({
      indicator: "RSI (14)",
      signal: "bearish",
      strength: Math.min(100, (rsi - 70) * 3.3),
      description: "Overbought — momentum may be exhausting",
      value: rsi.toFixed(1),
    });
  } else if (rsi < 30) {
    signals.push({
      indicator: "RSI (14)",
      signal: "bullish",
      strength: Math.min(100, (30 - rsi) * 3.3),
      description: "Oversold — potential bounce zone",
      value: rsi.toFixed(1),
    });
  } else {
    signals.push({
      indicator: "RSI (14)",
      signal: "neutral",
      strength: 30,
      description: rsi > 50 ? "Slightly bullish momentum" : "Slightly bearish momentum",
      value: rsi.toFixed(1),
    });
  }

  // ── Moving Averages ──
  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);
  const sma200 = closes.length >= 200 ? computeSMA(closes, 200) : undefined;
  const ema12 = lastEMA(closes, 12);
  const ema26 = lastEMA(closes, 26);

  // EMA crossover signal
  if (ema12 !== undefined && ema26 !== undefined) {
    const emaBullish = ema12 > ema26;
    const spread = ((ema12 - ema26) / ema26) * 100;
    signals.push({
      indicator: "EMA 12/26",
      signal: emaBullish ? "bullish" : "bearish",
      strength: Math.min(100, Math.abs(spread) * 15),
      description: emaBullish
        ? `Short-term EMA above long-term (spread ${spread.toFixed(2)}%)`
        : `Short-term EMA below long-term (spread ${spread.toFixed(2)}%)`,
      value: `${ema12.toFixed(2)} / ${ema26.toFixed(2)}`,
    });
  }

  if (sma20 !== undefined) {
    const pctAbove = ((currentPrice - sma20) / sma20) * 100;
    signals.push({
      indicator: "SMA 20",
      signal: currentPrice > sma20 ? "bullish" : "bearish",
      strength: Math.min(100, Math.abs(pctAbove) * 10),
      description: currentPrice > sma20
        ? `Price ${pctAbove.toFixed(1)}% above 20-day MA`
        : `Price ${Math.abs(pctAbove).toFixed(1)}% below 20-day MA`,
      value: sma20.toFixed(2),
    });
  }

  if (sma50 !== undefined) {
    const pctAbove = ((currentPrice - sma50) / sma50) * 100;
    signals.push({
      indicator: "SMA 50",
      signal: currentPrice > sma50 ? "bullish" : "bearish",
      strength: Math.min(100, Math.abs(pctAbove) * 8),
      description: currentPrice > sma50
        ? `Price ${pctAbove.toFixed(1)}% above 50-day MA`
        : `Price ${Math.abs(pctAbove).toFixed(1)}% below 50-day MA`,
      value: sma50.toFixed(2),
    });
  }

  if (sma200 !== undefined) {
    const pctAbove = ((currentPrice - sma200) / sma200) * 100;
    signals.push({
      indicator: "SMA 200",
      signal: currentPrice > sma200 ? "bullish" : "bearish",
      strength: Math.min(100, Math.abs(pctAbove) * 5),
      description: currentPrice > sma200
        ? `Long-term uptrend (${pctAbove.toFixed(1)}% above 200d MA)`
        : `Long-term downtrend (${Math.abs(pctAbove).toFixed(1)}% below 200d MA)`,
      value: sma200.toFixed(2),
    });
  }

  // ── MACD ──
  const macd = computeMACD(closes);
  const lastMacd = macd.macdLine.filter((v): v is number => v !== null);
  const lastSignal = macd.signalLine.filter((v): v is number => v !== null);
  const lastHist = macd.histogram.filter((v): v is number => v !== null);

  if (lastMacd.length > 1 && lastSignal.length > 1) {
    const macdVal = lastMacd[lastMacd.length - 1];
    const signalVal = lastSignal[lastSignal.length - 1];
    const histVal = lastHist[lastHist.length - 1];
    const prevHist = lastHist.length > 1 ? lastHist[lastHist.length - 2] : 0;
    const isBullish = macdVal > signalVal;
    const crossover = histVal > 0 && prevHist <= 0;
    const crossunder = histVal < 0 && prevHist >= 0;

    signals.push({
      indicator: "MACD",
      signal: isBullish ? "bullish" : "bearish",
      strength: crossover || crossunder ? 80 : 50,
      description: crossover
        ? "Bullish crossover — momentum shifting up"
        : crossunder
          ? "Bearish crossunder — momentum shifting down"
          : isBullish
            ? "MACD above signal line"
            : "MACD below signal line",
      value: `${macdVal.toFixed(2)} / ${signalVal.toFixed(2)}`,
    });
  }

  // ── Bollinger Bands ──
  const bb = computeBollingerBands(closes, 20, 2);
  const lastUpper = bb.upper[bb.upper.length - 1];
  const lastLower = bb.lower[bb.lower.length - 1];
  const lastBW = bb.bandwidth[bb.bandwidth.length - 1];

  if (lastUpper !== null && lastLower !== null) {
    const bbPosition = (currentPrice - lastLower) / (lastUpper - lastLower);
    signals.push({
      indicator: "Bollinger Bands",
      signal: bbPosition > 0.9 ? "bearish" : bbPosition < 0.1 ? "bullish" : "neutral",
      strength: bbPosition > 0.9 || bbPosition < 0.1 ? 70 : 30,
      description: bbPosition > 0.9
        ? "Near upper band — potential pullback"
        : bbPosition < 0.1
          ? "Near lower band — potential bounce"
          : `Mid-band position (${(bbPosition * 100).toFixed(0)}%)`,
      value: `BW: ${lastBW?.toFixed(1)}%`,
    });
  }

  // ── Stochastic ──
  const stoch = computeStochastic(candles);
  const lastK = stoch.k.filter((v): v is number => v !== null);
  const lastD = stoch.d.filter((v): v is number => v !== null);

  if (lastK.length > 0 && lastD.length > 0) {
    const kVal = lastK[lastK.length - 1];
    const dVal = lastD[lastD.length - 1];
    signals.push({
      indicator: "Stochastic",
      signal: kVal > 80 ? "bearish" : kVal < 20 ? "bullish" : "neutral",
      strength: kVal > 80 || kVal < 20 ? 60 : 30,
      description: kVal > 80
        ? "Overbought territory"
        : kVal < 20
          ? "Oversold territory"
          : "Neutral range",
      value: `%K: ${kVal.toFixed(0)} / %D: ${dVal.toFixed(0)}`,
    });
  }

  // ── ATR ──
  const atr = computeATR(candles);
  const lastATR = atr.filter((v): v is number => v !== null);
  if (lastATR.length > 0) {
    const atrVal = lastATR[lastATR.length - 1];
    const atrPct = (atrVal / currentPrice) * 100;
    signals.push({
      indicator: "ATR (14)",
      signal: "neutral",
      strength: 0,
      description: atrPct > 3 ? "High volatility — wider stops needed" : atrPct < 1 ? "Low volatility — tight consolidation" : "Normal volatility range",
      value: `$${atrVal.toFixed(2)} (${atrPct.toFixed(1)}%)`,
    });
  }

  // ── Golden/Death Cross ──
  if (sma50 !== undefined && sma200 !== undefined) {
    // Check recent crossover by comparing current and ~5 bars ago
    const sma50_prev = closes.length >= 55 ? computeSMA(closes.slice(0, -5), 50) : undefined;
    const sma200_prev = closes.length >= 205 ? computeSMA(closes.slice(0, -5), 200) : undefined;

    if (sma50_prev && sma200_prev) {
      if (sma50 > sma200 && sma50_prev <= sma200_prev) {
        signals.push({
          indicator: "Golden Cross",
          signal: "bullish",
          strength: 85,
          description: "50-day MA crossed above 200-day MA — major bullish signal",
          value: `50d: ${sma50.toFixed(2)} > 200d: ${sma200.toFixed(2)}`,
        });
      } else if (sma50 < sma200 && sma50_prev >= sma200_prev) {
        signals.push({
          indicator: "Death Cross",
          signal: "bearish",
          strength: 85,
          description: "50-day MA crossed below 200-day MA — major bearish signal",
          value: `50d: ${sma50.toFixed(2)} < 200d: ${sma200.toFixed(2)}`,
        });
      }
    }
  }

  // ── Compute Overall ──
  let bullishCount = 0;
  let bearishCount = 0;
  let totalWeight = 0;
  let weightedScore = 0;

  for (const sig of signals) {
    if (sig.signal === "bullish") {
      bullishCount++;
      weightedScore += sig.strength;
      totalWeight += sig.strength;
    } else if (sig.signal === "bearish") {
      bearishCount++;
      weightedScore -= sig.strength;
      totalWeight += sig.strength;
    }
  }

  const overallScore = totalWeight > 0
    ? Math.round((weightedScore / totalWeight) * 100)
    : 0;

  const overallSignal: "bullish" | "bearish" | "neutral" =
    overallScore > 25 ? "bullish" : overallScore < -25 ? "bearish" : "neutral";

  // Summary
  const parts: string[] = [];
  if (overallSignal === "bullish") parts.push(`${bullishCount} bullish signals dominate`);
  else if (overallSignal === "bearish") parts.push(`${bearishCount} bearish signals dominate`);
  else parts.push("Mixed signals — no clear direction");

  if (rsi > 70) parts.push("RSI overbought");
  else if (rsi < 30) parts.push("RSI oversold");

  if (sma200 && currentPrice > sma200) parts.push("above 200d MA");
  else if (sma200) parts.push("below 200d MA");

  return {
    signals,
    overallSignal,
    overallScore,
    summary: parts.join(". ") + ".",
  };
}
