import { useState, useEffect, useCallback, useRef } from "react";
import { computeMarketScore, computeRSI, computeSMA, type MarketScore, type MarketInputs } from "../lib/marketScoring";
import { getCredential } from "../lib/credentials";
import { isSupabaseConfigured } from "../lib/supabase";
import { useMarketHours } from "./useMarketHours";

const CACHE_KEY = "sibt_market_score";
const CACHE_TTL = 60_000; // 1 min during market hours
const CLOSED_CACHE_TTL = 15 * 60_000; // 15 min when closed

type FinnhubQuote = { c: number; dp: number; pc: number; o: number; h: number; l: number };
type FinnhubCandle = { c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string };

async function finnhubFetch<T>(endpoint: string, params: Record<string, string>, apiKey?: string): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const useEdge = !apiKey && isSupabaseConfigured();

  if (!apiKey && !useEdge) throw new Error("No Finnhub API key");

  let url: string;
  if (useEdge) {
    const qs = new URLSearchParams({ endpoint, ...params });
    url = `${supabaseUrl}/functions/v1/finnhub?${qs}`;
  } else {
    const qs = new URLSearchParams({ ...params, token: apiKey! });
    url = `/finnhub-api/api/v1/${endpoint}?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (useEdge) {
    headers["Authorization"] = `Bearer ${supabaseKey}`;
    headers["apikey"] = supabaseKey;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

async function fredFetch(seriesId: string): Promise<number | undefined> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!isSupabaseConfigured()) return undefined;

  try {
    const url = `${supabaseUrl}/functions/v1/fred?series_id=${seriesId}&limit=2&sort_order=desc`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const obs = data?.observations;
    if (obs && obs.length > 0) return parseFloat(obs[0].value);
    return undefined;
  } catch {
    return undefined;
  }
}

export function useMarketScore() {
  const [score, setScore] = useState<MarketScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useMarketHours();
  const fetchingRef = useRef(false);

  const fetchScore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const apiKey = getCredential("finnhub") ?? undefined;

      // Parallel fetch: VIX quote, SPY quote, SPY candles (for MAs + RSI), sector quotes
      const now = Math.floor(Date.now() / 1000);
      const sixMonthsAgo = now - 200 * 24 * 60 * 60; // ~200 trading days for 200d SMA

      const sectors = ["XLK", "XLF", "XLV", "XLY", "XLP", "XLE", "XLI", "XLB", "XLRE", "XLC", "XLU"];

      // Batch fetches with rate limit awareness
      const [vixQuote, spyQuote, spyCandles, tenYearYield] = await Promise.all([
        finnhubFetch<FinnhubQuote>("quote", { symbol: "^VIX" }, apiKey).catch(() =>
          // VIX might need different symbol format
          finnhubFetch<FinnhubQuote>("quote", { symbol: "VIX" }, apiKey).catch(() => null)
        ),
        finnhubFetch<FinnhubQuote>("quote", { symbol: "SPY" }, apiKey).catch(() => null),
        finnhubFetch<FinnhubCandle>("stock/candle", {
          symbol: "SPY",
          resolution: "D",
          from: sixMonthsAgo.toString(),
          to: now.toString(),
        }, apiKey).catch(() => null),
        fredFetch("DGS10"), // 10-Year Treasury
      ]);

      // Fetch sectors in batches of 4 with delay
      const sectorChanges: { symbol: string; change: number }[] = [];
      for (let i = 0; i < sectors.length; i += 4) {
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
        if (i + 4 < sectors.length) await new Promise((r) => setTimeout(r, 500));
      }

      // Compute MAs and RSI from candle data
      let spySma20: number | undefined;
      let spySma50: number | undefined;
      let spySma200: number | undefined;
      let spyRsi14: number | undefined;

      if (spyCandles && spyCandles.s === "ok" && spyCandles.c.length > 0) {
        const closes = spyCandles.c;
        spySma20 = computeSMA(closes, 20);
        spySma50 = computeSMA(closes, 50);
        spySma200 = computeSMA(closes, 200);
        spyRsi14 = computeRSI(closes, 14);
      }

      // Also fetch DXY via FRED
      const dxy = await fredFetch("DTWEXBGS").catch(() => undefined);

      const marketOpen = status === "OPEN" || status === "PRE_MARKET" || status === "AFTER_HOURS";

      const inputs: MarketInputs = {
        vix: vixQuote?.c ?? undefined,
        vixPrev: vixQuote?.pc ?? undefined,
        spyPrice: spyQuote?.c ?? undefined,
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
      setScore(result);

      // Cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ score: result, ts: Date.now() }));
      } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to compute market score");
    } finally {
      setLoading(false);
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

  // Auto-refresh during market hours
  useEffect(() => {
    if (status !== "OPEN") return;
    const interval = setInterval(fetchScore, 60_000); // every 60s
    return () => clearInterval(interval);
  }, [status, fetchScore]);

  return { score, loading, error, refresh: fetchScore };
}
