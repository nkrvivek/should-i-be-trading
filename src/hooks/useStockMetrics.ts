/**
 * Fetches and caches fundamental stock metrics for the screener universe.
 * Uses Finnhub /stock/metric endpoint via Supabase edge function.
 */

import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { finnhubFetch } from "../api/dataFetchers";
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
const CACHE_KEY = "sibt_stock_metrics_cache";

let cachedMetrics: StockMetrics[] | null = null;
let cacheTimestamp = 0;
let inflightMetricsPromise: Promise<StockMetrics[]> | null = null;
let sharedProgress = { done: 0, total: ALL_TICKERS.length };
const progressListeners = new Set<(progress: { done: number; total: number }) => void>();

function readCachedMetrics(): { data: StockMetrics[]; ts: number } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data?: StockMetrics[]; ts?: number; universeSize?: number };
    if (!Array.isArray(parsed?.data) || typeof parsed.ts !== "number") return null;
    if (parsed.universeSize !== ALL_TICKERS.length) return null;
    if (Date.now() - parsed.ts >= CACHE_TTL) return null;

    return { data: parsed.data, ts: parsed.ts };
  } catch {
    return null;
  }
}

function writeCachedMetrics(data: StockMetrics[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      ts: Date.now(),
      universeSize: ALL_TICKERS.length,
    }));
  } catch {
    // ignore cache errors
  }
}

function emitProgress(progress: { done: number; total: number }) {
  sharedProgress = progress;
  for (const listener of progressListeners) {
    listener(progress);
  }
}

function getFreshCachedMetrics(): StockMetrics[] | null {
  if (cachedMetrics && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedMetrics;
  }

  const localCache = readCachedMetrics();
  if (!localCache) return null;

  cachedMetrics = localCache.data;
  cacheTimestamp = localCache.ts;
  return localCache.data;
}

async function fetchMetricsFresh(): Promise<StockMetrics[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  const results: StockMetrics[] = [];
  emitProgress({ done: 0, total: ALL_TICKERS.length });

  // Batch 8 at a time with short pauses so 250-symbol universe remains usable.
  for (let i = 0; i < ALL_TICKERS.length; i += 8) {
    const batch = ALL_TICKERS.slice(i, i + 8);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const data = await finnhubFetch<{ metric?: Record<string, number | null> }>("stock/metric", {
            symbol,
            metric: "all",
          });
          const metric = data.metric ?? {};

          return {
            symbol,
            sector: SECTOR_MAP[symbol] ?? "Other",
            pe: metric.peBasicExclExtraTTM ?? metric.peTTM ?? null,
            forwardPe: metric.peExclExtraAnnual ?? null,
            dividendYield: metric.dividendYieldIndicatedAnnual != null ? metric.dividendYieldIndicatedAnnual / 100 : null,
            marketCap: metric.marketCapitalization != null ? metric.marketCapitalization * 1e6 : null,
            eps: metric.epsBasicExclExtraItemsTTM ?? metric.epsTTM ?? null,
            revenueGrowthQuarterly: metric.revenueGrowthQuarterlyYoy != null ? metric.revenueGrowthQuarterlyYoy / 100 : null,
            profitMargin: metric.netProfitMarginTTM != null ? metric.netProfitMarginTTM / 100 : null,
            beta: metric.beta ?? null,
            fiftyTwoWeekHigh: metric["52WeekHigh"] ?? null,
            fiftyTwoWeekLow: metric["52WeekLow"] ?? null,
            currentPrice: null,
          } satisfies StockMetrics;
        } catch {
          return null;
        }
      }),
    );

    for (const entry of batchResults) {
      if (entry) results.push(entry);
    }

    emitProgress({ done: Math.min(i + 8, ALL_TICKERS.length), total: ALL_TICKERS.length });

    if (i + 8 < ALL_TICKERS.length) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  // Batch-fetch current prices via Finnhub quote (already cached at 1min TTL in edge function)
  for (let i = 0; i < results.length; i += 10) {
    const batch = results.slice(i, i + 10);
    const prices = await Promise.all(
      batch.map(async (stock) => {
        try {
          const quote = await finnhubFetch<{ c?: number | null }>("quote", { symbol: stock.symbol });
          return { symbol: stock.symbol, currentPrice: quote?.c ?? null };
        } catch {
          return { symbol: stock.symbol, currentPrice: null };
        }
      }),
    );

    const priceMap = new Map(prices.map((price) => [price.symbol, price.currentPrice]));
    for (const stock of batch) {
      stock.currentPrice = priceMap.get(stock.symbol) ?? null;
    }

    if (i + 10 < results.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  cachedMetrics = results;
  cacheTimestamp = Date.now();
  writeCachedMetrics(results);
  emitProgress({ done: ALL_TICKERS.length, total: ALL_TICKERS.length });

  return results;
}

async function loadMetrics(force = false): Promise<StockMetrics[]> {
  if (!force) {
    const cached = getFreshCachedMetrics();
    if (cached) {
      emitProgress({ done: ALL_TICKERS.length, total: ALL_TICKERS.length });
      return cached;
    }
  }

  if (inflightMetricsPromise) {
    return inflightMetricsPromise;
  }

  inflightMetricsPromise = fetchMetricsFresh().finally(() => {
    inflightMetricsPromise = null;
  });

  return inflightMetricsPromise;
}

export function getCachedStockMetrics(symbol?: string): StockMetrics[] | StockMetrics | null {
  const data = getFreshCachedMetrics();
  if (!data) return null;

  if (!symbol) return data;

  return data.find((entry) => entry.symbol === symbol.trim().toUpperCase()) ?? null;
}

export function useStockMetrics() {
  const [metrics, setMetrics] = useState<StockMetrics[]>(() => {
    const cached = getFreshCachedMetrics();
    if (cached) {
      return cached;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(sharedProgress);

  const fetchMetrics = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadMetrics(force);
      setMetrics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    progressListeners.add(setProgress);
    return () => {
      progressListeners.delete(setProgress);
    };
  }, []);

  useEffect(() => {
    if (metrics.length > 0) {
      setProgress({ done: ALL_TICKERS.length, total: ALL_TICKERS.length });
      return;
    }

    void fetchMetrics();
  }, [fetchMetrics, metrics.length]);

  return { metrics, loading, error, progress, refresh: fetchMetrics };
}
