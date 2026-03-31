/**
 * Fetches and caches fundamental stock metrics for the screener universe.
 * Uses Finnhub /stock/metric endpoint via Supabase edge function.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "../api/edgeHeaders";
import { SECTOR_MAP } from "../lib/sectorMapping";

export type StockMetrics = {
  symbol: string;
  sector: string;
  pe: number | null;
  forwardPe: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  eps: number | null;
  revenueGrowthQuarterly: number | null;
  profitMargin: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currentPrice: number | null;
};

const ALL_TICKERS = Object.keys(SECTOR_MAP);
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

let cachedMetrics: StockMetrics[] | null = null;
let cacheTimestamp = 0;

export function useStockMetrics() {
  const [metrics, setMetrics] = useState<StockMetrics[]>(cachedMetrics ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: ALL_TICKERS.length });
  const abortRef = useRef(false);

  const fetchMetrics = useCallback(async () => {
    // Return cache if fresh
    if (cachedMetrics && Date.now() - cacheTimestamp < CACHE_TTL) {
      setMetrics(cachedMetrics);
      setProgress({ done: ALL_TICKERS.length, total: ALL_TICKERS.length });
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase not configured");
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const headers = await getEdgeHeaders();

    setLoading(true);
    setError(null);
    abortRef.current = false;

    const results: StockMetrics[] = [];

    // Batch 3 at a time with delays to respect rate limits
    for (let i = 0; i < ALL_TICKERS.length; i += 3) {
      if (abortRef.current) break;

      const batch = ALL_TICKERS.slice(i, i + 3);
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const res = await fetch(
              `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/metric&symbol=${symbol}&metric=all`,
              { headers },
            );
            if (!res.ok) return;

            const data = await res.json();
            const m = data.metric ?? {};

            results.push({
              symbol,
              sector: SECTOR_MAP[symbol] ?? "Other",
              pe: m.peBasicExclExtraTTM ?? m.peTTM ?? null,
              forwardPe: m.peExclExtraAnnual ?? null,
              dividendYield: m.dividendYieldIndicatedAnnual != null ? m.dividendYieldIndicatedAnnual / 100 : null,
              marketCap: m.marketCapitalization != null ? m.marketCapitalization * 1e6 : null,
              eps: m.epsBasicExclExtraItemsTTM ?? m.epsTTM ?? null,
              revenueGrowthQuarterly: m.revenueGrowthQuarterlyYoy != null ? m.revenueGrowthQuarterlyYoy / 100 : null,
              profitMargin: m.netProfitMarginTTM != null ? m.netProfitMarginTTM / 100 : null,
              beta: m.beta ?? null,
              fiftyTwoWeekHigh: m["52WeekHigh"] ?? null,
              fiftyTwoWeekLow: m["52WeekLow"] ?? null,
              currentPrice: null, // populated below via quote endpoint
            });
          } catch {
            // Skip failed symbols
          }
        }),
      );

      setProgress({ done: Math.min(i + 3, ALL_TICKERS.length), total: ALL_TICKERS.length });

      // Update incrementally
      setMetrics([...results]);

      // Rate limit delay between batches
      if (i + 3 < ALL_TICKERS.length) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Batch-fetch current prices via Finnhub quote (already cached at 1min TTL in edge function)
    try {
      for (let i = 0; i < results.length; i += 5) {
        if (abortRef.current) break;
        const batch = results.slice(i, i + 5);
        await Promise.all(
          batch.map(async (stock) => {
            try {
              const qRes = await fetch(
                `${supabaseUrl}/functions/v1/finnhub?endpoint=quote&symbol=${stock.symbol}`,
                { headers },
              );
              if (!qRes.ok) return;
              const qData = await qRes.json();
              if (qData?.c) stock.currentPrice = qData.c; // Finnhub quote: c = current price
            } catch { /* skip price fetch failures */ }
          }),
        );
        if (i + 5 < results.length) await new Promise((r) => setTimeout(r, 500));
      }
    } catch { /* price fetch pass failed, prices remain null — non-critical */ }

    cachedMetrics = results;
    cacheTimestamp = Date.now();
    setMetrics(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics(); // eslint-disable-line react-hooks/set-state-in-effect
    return () => { abortRef.current = true; };
  }, [fetchMetrics]);

  return { metrics, loading, error, progress, refresh: fetchMetrics };
}
