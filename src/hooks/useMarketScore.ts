import { useState, useEffect, useCallback, useRef } from "react";
import { computeMarketScore, computeRSI, computeSMA, type MarketScore, type MarketInputs } from "../lib/marketScoring";
import { getCredential } from "../lib/credentials";
import { useMarketHours } from "./useMarketHours";
import { finnhubFetch, fredFetchSeries, fredFetchLatest } from "../api/dataFetchers";

const CACHE_KEY = "sibt_market_score";
const CACHE_TTL = 60_000; // 1 min during market hours
const CLOSED_CACHE_TTL = 15 * 60_000; // 15 min when closed

type FinnhubQuote = { c: number; dp: number; pc: number; o: number; h: number; l: number };

export function useMarketScore() {
  const [score, setScore] = useState<MarketScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useMarketHours();
  const fetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchScore = useCallback(async () => {
    if (fetchingRef.current) return;

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const apiKey = getCredential("finnhub") ?? undefined;
      const sectors = ["XLK", "XLF", "XLV", "XLY", "XLP", "XLE", "XLI", "XLB", "XLRE", "XLC", "XLU"];

      // Phase 1: FRED data (free, unlimited, no rate limit issues)
      const [vixSeries, sp500Series, tenYearYield, dxy, spyQuote] = await Promise.all([
        fredFetchSeries("VIXCLS", 5),
        fredFetchSeries("SP500", 250),
        fredFetchLatest("DGS10"),
        fredFetchLatest("DTWEXBGS").catch(() => undefined),
        finnhubFetch<FinnhubQuote>("quote", { symbol: "SPY" }, apiKey).catch(() => null),
      ]);

      if (controller.signal.aborted) return;

      // VIX from FRED
      const vix = vixSeries.length > 0 ? vixSeries[0] : undefined;
      const vixPrev = vixSeries.length > 1 ? vixSeries[1] : undefined;

      // SP500 MAs and RSI from FRED daily closes
      let spySma20: number | undefined;
      let spySma50: number | undefined;
      let spySma200: number | undefined;
      let spyRsi14: number | undefined;
      let spyPrice: number | undefined;

      if (sp500Series.length > 0) {
        spyPrice = sp500Series[0];
        const chronological = [...sp500Series].reverse();
        spySma20 = computeSMA(chronological, 20);
        spySma50 = computeSMA(chronological, 50);
        spySma200 = computeSMA(chronological, 200);
        spyRsi14 = computeRSI(chronological, 14);
      }

      // Override with live SPY quote if available
      if (spyQuote?.c) spyPrice = spyQuote.c;

      // Phase 2: Sector quotes from Finnhub
      const sectorChanges: { symbol: string; change: number }[] = [];
      for (let i = 0; i < sectors.length; i += 4) {
        if (controller.signal.aborted) return;
        const batch = sectors.slice(i, i + 4);
        const results = await Promise.all(
          batch.map(async (sym) => {
            try {
              const q = await finnhubFetch<FinnhubQuote>("quote", { symbol: sym }, apiKey);
              return { symbol: sym, change: q.dp ?? 0 };
            } catch {
              return null;
            }
          })
        );
        for (const r of results) if (r) sectorChanges.push(r);
        if (i + 4 < sectors.length) {
          await new Promise((r) => setTimeout(r, 500));
          if (controller.signal.aborted) return;
        }
      }

      if (controller.signal.aborted) return;

      const marketOpen = status === "OPEN" || status === "PRE_MARKET" || status === "AFTER_HOURS";

      const inputs: MarketInputs = {
        vix,
        vixPrev,
        spyPrice,
        spyChange: spyQuote?.dp ?? undefined,
        spySma20,
        spySma50,
        spySma200,
        spyRsi14,
        sectorChanges: sectorChanges.length > 0 ? sectorChanges : undefined,
        tenYearYield,
        dxy: dxy ?? undefined,
        marketOpen,
      };

      const result = computeMarketScore(inputs);

      if (controller.signal.aborted) return;
      setScore(result);

      // Cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ score: result, ts: Date.now() }));
      } catch { /* ignore */ }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to compute market score");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [status]);

  // Load from cache, then refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { score: cached, ts } = JSON.parse(raw);
        const ttl = status === "OPEN" ? CACHE_TTL : CLOSED_CACHE_TTL;
        if (Date.now() - ts < ttl) {
          setScore(cached);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchScore();
  }, [fetchScore]);

  // Auto-refresh during market hours — use ref to avoid interval recreation
  const fetchScoreRef = useRef(fetchScore);
  fetchScoreRef.current = fetchScore;

  useEffect(() => {
    if (status !== "OPEN") return;
    const interval = setInterval(() => fetchScoreRef.current(), 60_000);
    return () => clearInterval(interval);
  }, [status]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { score, loading, error, refresh: fetchScore };
}
