/**
 * Hook to compute a per-stock SIBT Score.
 *
 * Fetches data from FMP (profile, ratios, income) and computes
 * a composite 1-10 score with explainable signal breakdowns.
 */

import { useCallback, useRef, useState } from "react";
import {
  getFundamentalSnapshot,
  getIncomeStatement,
  type FmpFundamentalSnapshot,
  type FmpIncomeStatement,
} from "../api/fmpClient";
import { fetchInsiderTransactions } from "../api/freeDataClient";
import { computeStockScore, type StockScore, type StockScoreInput } from "../lib/stockScore";
import { getCachedInsiderData } from "./useInsiderTrading";

interface InsiderSummary {
  buyCount: number;
  sellCount: number;
  netShares: number;
}

export interface StockScoreSeedData {
  snapshot?: FmpFundamentalSnapshot | null;
  incomeStatements?: FmpIncomeStatement[];
  insiderData?: InsiderSummary | null;
}

interface UseStockScoreResult {
  score: StockScore | null;
  loading: boolean;
  error: string | null;
  compute: (symbol: string, seedData?: StockScoreSeedData) => Promise<void>;
}

const scoreCache = new Map<string, { score: StockScore; expires: number }>();
const scoreInflight = new Map<string, Promise<StockScore>>();
const CACHE_TTL = 20 * 60 * 1000;

function normalizeTicker(symbol: string): string {
  return symbol.toUpperCase().trim();
}

function getCachedScoreEntry(symbol: string): { score: StockScore; expires: number } | null {
  const cached = scoreCache.get(symbol);
  return cached && cached.expires > Date.now() ? cached : null;
}

function hasSeedData(seedData?: StockScoreSeedData): boolean {
  return Boolean(
    seedData &&
      (seedData.snapshot !== undefined ||
        seedData.incomeStatements !== undefined ||
        seedData.insiderData !== undefined),
  );
}

function getGrowthSignals(incomeStatements: FmpIncomeStatement[]) {
  let revenueGrowth: number | undefined;
  let netIncomeGrowth: number | undefined;
  let epsGrowth: number | undefined;

  if (incomeStatements.length >= 2) {
    const latest = incomeStatements[0];
    const prior = incomeStatements[1];

    if (prior.revenue > 0) {
      revenueGrowth = ((latest.revenue - prior.revenue) / Math.abs(prior.revenue)) * 100;
    }
    if (prior.netIncome !== 0) {
      netIncomeGrowth = ((latest.netIncome - prior.netIncome) / Math.abs(prior.netIncome)) * 100;
    }
    if (prior.epsDiluted !== 0) {
      epsGrowth = ((latest.epsDiluted - prior.epsDiluted) / Math.abs(prior.epsDiluted)) * 100;
    }
  }

  return { revenueGrowth, netIncomeGrowth, epsGrowth };
}

function buildStockScoreInput(
  snapshot: FmpFundamentalSnapshot,
  incomeStatements: FmpIncomeStatement[],
  insiderData: InsiderSummary | null,
): StockScoreInput {
  const { profile, ratios, metrics, priceTarget } = snapshot;
  const { revenueGrowth, netIncomeGrowth, epsGrowth } = getGrowthSignals(incomeStatements);

  return {
    price: profile?.price,
    change: profile?.change,
    changePercent: profile?.changePercentage,
    marketCap: profile?.marketCap,
    beta: profile?.beta,
    volume: profile?.volume,
    avgVolume: profile?.averageVolume,

    peRatio: ratios?.peRatioTTM,
    pbRatio: ratios?.pbRatioTTM,
    psRatio: ratios?.priceToSalesRatioTTM,
    evEbitda: ratios?.enterpriseValueOverEBITDATTM,
    grossMargin: ratios?.grossProfitMarginTTM,
    operatingMargin: ratios?.operatingProfitMarginTTM,
    netMargin: ratios?.netProfitMarginTTM,
    roe: ratios?.returnOnEquityTTM,
    roa: ratios?.returnOnAssetsTTM,
    currentRatio: ratios?.currentRatioTTM,
    debtEquity: ratios?.debtEquityRatioTTM,
    dividendYield: ratios?.dividendYieldTTM,

    revenuePerShare: metrics?.revenuePerShareTTM,
    fcfPerShare: metrics?.freeCashFlowPerShareTTM,
    roic: metrics?.roicTTM,

    priceTargetConsensus: priceTarget?.targetConsensus,

    revenueGrowth,
    netIncomeGrowth,
    epsGrowth,

    insiderBuyCount: insiderData?.buyCount,
    insiderSellCount: insiderData?.sellCount,
    insiderNetShares: insiderData?.netShares,
  };
}

async function loadStockScore(symbol: string, seedData: StockScoreSeedData = {}): Promise<StockScore> {
  const cached = !hasSeedData(seedData) ? getCachedScoreEntry(symbol) : null;
  if (cached) {
    return cached.score;
  }

  const existing = scoreInflight.get(symbol);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const [snapshot, incomeStatements, insiderData] = await Promise.all([
      seedData.snapshot !== undefined
        ? Promise.resolve(seedData.snapshot)
        : getFundamentalSnapshot(symbol),
      seedData.incomeStatements !== undefined
        ? Promise.resolve(seedData.incomeStatements)
        : getIncomeStatement(symbol, "annual", 2).catch(() => [] as FmpIncomeStatement[]),
      seedData.insiderData !== undefined
        ? Promise.resolve(seedData.insiderData)
        : fetchInsiderData(symbol).catch(() => null),
    ]);

    if (!snapshot?.profile) {
      throw new Error(`No data found for ${symbol}`);
    }

    const result = computeStockScore(symbol, buildStockScoreInput(snapshot, incomeStatements, insiderData));
    scoreCache.set(symbol, { score: result, expires: Date.now() + CACHE_TTL });

    if (scoreCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of scoreCache) {
        if (v.expires < now) scoreCache.delete(k);
      }
    }

    return result;
  })();

  scoreInflight.set(symbol, request);

  return request.finally(() => {
    if (scoreInflight.get(symbol) === request) {
      scoreInflight.delete(symbol);
    }
  });
}

export function getCachedStockScore(symbol: string): StockScore | null {
  const ticker = normalizeTicker(symbol);
  if (!ticker) return null;

  return getCachedScoreEntry(ticker)?.score ?? null;
}

export function useStockScore(): UseStockScoreResult {
  const [score, setScore] = useState<StockScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const compute = useCallback(async (symbol: string, seedData: StockScoreSeedData = {}) => {
    const ticker = normalizeTicker(symbol);
    if (!ticker) return;

    const requestId = ++requestIdRef.current;

    if (!hasSeedData(seedData)) {
      const cached = getCachedScoreEntry(ticker);
      if (cached) {
        setError(null);
        setLoading(false);
        setScore(cached.score);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loadStockScore(ticker, seedData);
      if (requestId !== requestIdRef.current) return;
      setScore(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to compute score");
      setScore(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return { score, loading, error, compute };
}

async function fetchInsiderData(symbol: string): Promise<InsiderSummary | null> {
  const cached = getCachedInsiderData(symbol);
  if (cached) {
    return {
      buyCount: cached.totalBuys,
      sellCount: cached.totalSells,
      netShares: cached.netShares,
    };
  }

  const txns = await fetchInsiderTransactions(symbol).catch(() => []);
  if (!txns.length) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  let buyCount = 0;
  let sellCount = 0;
  let netShares = 0;

  for (const tx of txns) {
    if (!tx.transactionDate || tx.transactionDate < cutoffStr) continue;
    const shares = tx.share ?? 0;
    const transactionCode = (tx.transactionCode || tx.transactionType || "").toUpperCase();

    if (transactionCode === "P" || transactionCode === "A") {
      buyCount++;
      netShares += Math.abs(shares);
    } else if (transactionCode === "S" || transactionCode === "D" || transactionCode === "F") {
      sellCount++;
      netShares -= Math.abs(shares);
    }
  }

  return { buyCount, sellCount, netShares };
}
