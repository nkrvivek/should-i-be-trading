import {
  computeCompositeTradeScore,
  type CompositeScoreInputs,
  type CompositeTradeScore,
} from "../lib/compositeTradeScore";
import { estimateStockScoreFromMetrics } from "../lib/estimatedStockScore";
import { getSectorEtfForSymbol } from "../lib/sectorMapping";
import { getCachedInsiderData } from "./useInsiderTrading";
import { getCachedMarketActivity } from "./useMarketActivity";
import { getCachedMarketScore } from "./useMarketScore";
import { getCachedRegimeMonitor } from "./useRegimeMonitor";
import { getCachedSocialScore } from "./useSocialSentiment";
import { getCachedStockMetrics } from "./useStockMetrics";
import { getCachedStockScore } from "./useStockScore";

const CACHE_TTL_MS = 5 * 60 * 1000;
const compositeCache = new Map<string, { signature: string; score: CompositeTradeScore; expires: number }>();

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function resolveSectorEtfChange(symbol: string, sectorChanges?: { symbol: string; change: number }[]): number | undefined {
  const sectorEtf = getSectorEtfForSymbol(symbol);
  if (!sectorEtf || !sectorChanges?.length) return undefined;

  return sectorChanges.find((entry) => entry.symbol === sectorEtf)?.change;
}

function resolveShortRatio(symbol: string): number | undefined {
  const shortVolume = getCachedMarketActivity()?.shortVolume;
  if (!shortVolume?.length) return undefined;

  return shortVolume.find((entry) => entry.symbol.toUpperCase() === symbol)?.shortRatio;
}

function buildInputs(symbol: string, overrides: Partial<CompositeScoreInputs> = {}): CompositeScoreInputs {
  const market = getCachedMarketScore();
  const regime = getCachedRegimeMonitor();
  const stockScore = getCachedStockScore(symbol);
  const stockMetrics = getCachedStockMetrics(symbol);
  const estimatedStockScore = stockScore ? null : (stockMetrics && !Array.isArray(stockMetrics)
    ? estimateStockScoreFromMetrics(stockMetrics)
    : null);
  const insider = getCachedInsiderData(symbol);
  const social = getCachedSocialScore(symbol);

  return {
    marketQuality: overrides.marketQuality ?? market?.score.total,
    regimeComposite: overrides.regimeComposite ?? regime?.compositeScore,
    fsiScore: overrides.fsiScore ?? regime?.fsi.score,
    sectorEtfChange: overrides.sectorEtfChange ?? resolveSectorEtfChange(symbol, market?.sectorChanges),
    stockScoreComposite: overrides.stockScoreComposite ?? stockScore?.composite ?? estimatedStockScore?.composite,
    insiderSignalScore: overrides.insiderSignalScore ?? insider?.signalScore,
    earningsScore: overrides.earningsScore,
    socialScore: overrides.socialScore ?? social?.overall,
    shortRatio: overrides.shortRatio ?? resolveShortRatio(symbol),
  };
}

function buildSignature(symbol: string, inputs: CompositeScoreInputs): string {
  return [
    symbol,
    inputs.marketQuality ?? "na",
    inputs.regimeComposite ?? "na",
    inputs.fsiScore ?? "na",
    inputs.sectorEtfChange ?? "na",
    inputs.stockScoreComposite ?? "na",
    inputs.insiderSignalScore ?? "na",
    inputs.earningsScore ?? "na",
    inputs.socialScore ?? "na",
    inputs.shortRatio ?? "na",
  ].join("|");
}

export function getCompositeTradeScore(symbol: string, overrides?: Partial<CompositeScoreInputs>): CompositeTradeScore | null {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) return null;

  const inputs = buildInputs(normalizedSymbol, overrides);
  const signature = buildSignature(normalizedSymbol, inputs);
  const cached = compositeCache.get(normalizedSymbol);

  if (cached && cached.signature === signature && cached.expires > Date.now()) {
    return cached.score;
  }

  const score = computeCompositeTradeScore(normalizedSymbol, inputs);
  compositeCache.set(normalizedSymbol, {
    signature,
    score,
    expires: Date.now() + CACHE_TTL_MS,
  });

  return score;
}

export function batchComputeTradeScores(
  symbols: string[],
  sharedOverrides?: Partial<CompositeScoreInputs>,
): Map<string, CompositeTradeScore> {
  const results = new Map<string, CompositeTradeScore>();

  for (const symbol of symbols) {
    const score = getCompositeTradeScore(symbol, sharedOverrides);
    if (score) {
      results.set(score.symbol, score);
    }
  }

  return results;
}

export function useCompositeTradeScore(
  symbol: string | null,
  overrides?: Partial<CompositeScoreInputs>,
): {
  score: CompositeTradeScore | null;
  loading: boolean;
} {
  return {
    score: symbol ? getCompositeTradeScore(symbol, overrides) : null,
    loading: false,
  };
}
