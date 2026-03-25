/**
 * Fetches and caches fundamental stock metrics for the screener universe.
 * Uses Finnhub /stock/metric endpoint via Supabase edge function.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "../lib/supabase";

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

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", GOOG: "Technology",
  AMZN: "Consumer", META: "Technology", TSLA: "Consumer", AMD: "Technology", NFLX: "Communication",
  AVGO: "Technology", CRM: "Technology", ORCL: "Technology", ADBE: "Technology", INTC: "Technology",
  CSCO: "Technology", QCOM: "Technology", MU: "Technology", SNOW: "Technology", PLTR: "Technology",
  DELL: "Technology", APP: "Technology", SHOP: "Technology", NOW: "Technology", PANW: "Technology",
  JPM: "Financials", BAC: "Financials", GS: "Financials", MS: "Financials", WFC: "Financials",
  C: "Financials", BX: "Financials", KKR: "Financials", SCHW: "Financials", AXP: "Financials",
  V: "Financials", MA: "Financials", COF: "Financials",
  UNH: "Healthcare", JNJ: "Healthcare", LLY: "Healthcare", PFE: "Healthcare", ABBV: "Healthcare",
  MRK: "Healthcare", TMO: "Healthcare", ABT: "Healthcare", BMY: "Healthcare", AMGN: "Healthcare",
  XOM: "Energy", CVX: "Energy", COP: "Energy", SLB: "Energy", EOG: "Energy",
  DIS: "Communication", HD: "Consumer", MCD: "Consumer", NKE: "Consumer", SBUX: "Consumer",
  WMT: "Consumer", COST: "Consumer", TGT: "Consumer", LOW: "Consumer",
  CAT: "Industrials", BA: "Industrials", HON: "Industrials", UPS: "Industrials", RTX: "Industrials",
  NEE: "Utilities", SO: "Utilities", DUK: "Utilities",
  PG: "Consumer Staples", KO: "Consumer Staples", PEP: "Consumer Staples", PM: "Consumer Staples",
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
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const headers = { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey };

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
              currentPrice: m["52WeekHighDate"] ? null : null, // price comes from quote, not metric
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

    cachedMetrics = results;
    cacheTimestamp = Date.now();
    setMetrics(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
    return () => { abortRef.current = true; };
  }, [fetchMetrics]);

  return { metrics, loading, error, progress, refresh: fetchMetrics };
}
