/**
 * Hook to compute a per-stock SIBT Score.
 *
 * Fetches data from FMP (profile, ratios, income) and computes
 * a composite 1-10 score with explainable signal breakdowns.
 */

import { useCallback, useState } from "react";
import {
  getFundamentalSnapshot,
  getIncomeStatement,
} from "../api/fmpClient";
import { computeStockScore, type StockScore, type StockScoreInput } from "../lib/stockScore";

interface UseStockScoreResult {
  score: StockScore | null;
  loading: boolean;
  error: string | null;
  compute: (symbol: string) => Promise<void>;
}

// Simple cache to avoid re-fetching
const scoreCache = new Map<string, { score: StockScore; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useStockScore(): UseStockScoreResult {
  const [score, setScore] = useState<StockScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async (symbol: string) => {
    const ticker = symbol.toUpperCase().trim();
    if (!ticker) return;

    // Check cache
    const cached = scoreCache.get(ticker);
    if (cached && cached.expires > Date.now()) {
      setScore(cached.score);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [snapshot, incomeStatements] = await Promise.all([
        getFundamentalSnapshot(ticker),
        getIncomeStatement(ticker, "annual", 2).catch(() => []),
      ]);

      const { profile, ratios, metrics, priceTarget } = snapshot;

      if (!profile) {
        setError(`No data found for ${ticker}`);
        setScore(null);
        return;
      }

      // Compute YoY growth from income statements
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

      const input: StockScoreInput = {
        price: profile.price,
        change: profile.change,
        changePercent: profile.changePercentage,
        marketCap: profile.marketCap,
        beta: profile.beta,
        volume: profile.volume,
        avgVolume: profile.averageVolume,

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
      };

      const result = computeStockScore(ticker, input);
      setScore(result);

      // Cache it
      scoreCache.set(ticker, { score: result, expires: Date.now() + CACHE_TTL });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute score");
      setScore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { score, loading, error, compute };
}
