import { getSectorEtfForSymbol } from "./sectorMapping";

export interface CompositeScoreInputs {
  marketQuality?: number;
  regimeComposite?: number;
  fsiScore?: number;
  sectorEtfChange?: number;
  stockScoreComposite?: number;
  insiderSignalScore?: number;
  earningsScore?: number;
  socialScore?: number;
  shortRatio?: number;
}

export type CompositeTradeVerdict = "TRADE" | "CAUTION" | "AVOID";

export type CompositeTradeComponentId =
  | "marketQuality"
  | "regimeScore"
  | "stressIndicator"
  | "sectorMomentum"
  | "stockScore"
  | "insiderSignal"
  | "earningsScore"
  | "socialSentiment"
  | "shortInterest";

export interface CompositeTradeComponent {
  id: CompositeTradeComponentId;
  label: string;
  bucket: "market" | "ticker";
  weight: number;
  score: number;
  missing: boolean;
}

export interface CompositeTradeScore {
  symbol: string;
  overall: number;
  verdict: CompositeTradeVerdict;
  confidence: number;
  marketBase: number;
  tickerScore: number;
  sectorEtf: string | null;
  components: CompositeTradeComponent[];
  computedAt: string;
}

const NEUTRAL_SCORE = 50;
const MARKET_WEIGHT_TOTAL = 0.4;
const TICKER_WEIGHT_TOTAL = 0.6;

export const WEIGHTS = {
  marketQuality: 0.15,
  regimeScore: 0.15,
  stressIndicator: 0.05,
  sectorMomentum: 0.05,
  stockScore: 0.25,
  insiderSignal: 0.15,
  earningsScore: 0.1,
  socialSentiment: 0.05,
  shortInterest: 0.05,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  const ratio = (value - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * ratio;
}

function normalizeZeroToHundred(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function normalizeStockScore(composite: number): number {
  const normalized = ((clamp(composite, 1, 10) - 1) / 9) * 100;
  return Math.round(normalized);
}

export function normalizeInsiderScore(signalScore: number): number {
  return Math.round(clamp((signalScore + 100) / 2, 0, 100));
}

export function normalizeSectorMomentum(etfChangePct: number): number {
  if (etfChangePct >= 2) return 95;
  if (etfChangePct >= 1) return Math.round(lerp(etfChangePct, 1, 2, 75, 95));
  if (etfChangePct >= 0) return Math.round(lerp(etfChangePct, 0, 1, 60, 75));
  if (etfChangePct >= -1) return Math.round(lerp(etfChangePct, -1, 0, 40, 60));
  if (etfChangePct >= -2) return Math.round(lerp(etfChangePct, -2, -1, 25, 40));
  return 10;
}

export function normalizeShortInterest(shortRatio: number): number {
  return Math.round((1 - clamp(shortRatio, 0, 1)) * 100);
}

function deriveVerdict(score: number): CompositeTradeVerdict {
  if (score >= 65) return "TRADE";
  if (score >= 40) return "CAUTION";
  return "AVOID";
}

function buildComponent(
  id: CompositeTradeComponentId,
  label: string,
  bucket: "market" | "ticker",
  weight: number,
  value: number | undefined,
  normalize: (input: number) => number,
): CompositeTradeComponent {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return { id, label, bucket, weight, score: NEUTRAL_SCORE, missing: true };
  }

  return {
    id,
    label,
    bucket,
    weight,
    score: normalize(value),
    missing: false,
  };
}

export function computeCompositeTradeScore(symbol: string, inputs: CompositeScoreInputs): CompositeTradeScore {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const components: CompositeTradeComponent[] = [
    buildComponent("marketQuality", "Market Quality", "market", WEIGHTS.marketQuality, inputs.marketQuality, normalizeZeroToHundred),
    buildComponent("regimeScore", "Regime Composite", "market", WEIGHTS.regimeScore, inputs.regimeComposite, normalizeZeroToHundred),
    buildComponent("stressIndicator", "Financial Stress", "market", WEIGHTS.stressIndicator, inputs.fsiScore, normalizeZeroToHundred),
    buildComponent("sectorMomentum", "Sector Momentum", "market", WEIGHTS.sectorMomentum, inputs.sectorEtfChange, normalizeSectorMomentum),
    buildComponent("stockScore", "Stock Score", "ticker", WEIGHTS.stockScore, inputs.stockScoreComposite, normalizeStockScore),
    buildComponent("insiderSignal", "Insider Signal", "ticker", WEIGHTS.insiderSignal, inputs.insiderSignalScore, normalizeInsiderScore),
    buildComponent("earningsScore", "Earnings Score", "ticker", WEIGHTS.earningsScore, inputs.earningsScore, normalizeZeroToHundred),
    buildComponent("socialSentiment", "Social Sentiment", "ticker", WEIGHTS.socialSentiment, inputs.socialScore, normalizeZeroToHundred),
    buildComponent("shortInterest", "Short Interest", "ticker", WEIGHTS.shortInterest, inputs.shortRatio, normalizeShortInterest),
  ];

  const weightedSum = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const marketWeighted = components
    .filter((component) => component.bucket === "market")
    .reduce((sum, component) => sum + component.score * component.weight, 0);
  const tickerWeighted = components
    .filter((component) => component.bucket === "ticker")
    .reduce((sum, component) => sum + component.score * component.weight, 0);
  const missingCount = components.filter((component) => component.missing).length;

  const overall = Math.round(weightedSum);
  const marketBase = Math.round(marketWeighted / MARKET_WEIGHT_TOTAL);
  const tickerScore = Math.round(tickerWeighted / TICKER_WEIGHT_TOTAL);
  const confidence = Math.round((((components.length - missingCount) / components.length) * 100)) / 100;

  return {
    symbol: normalizedSymbol,
    overall,
    verdict: deriveVerdict(overall),
    confidence,
    marketBase,
    tickerScore,
    sectorEtf: getSectorEtfForSymbol(normalizedSymbol),
    components,
    computedAt: new Date().toISOString(),
  };
}
