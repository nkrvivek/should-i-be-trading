/**
 * Hook for fetching OHLCV candle data from Finnhub.
 *
 * Supports daily, weekly, and intraday resolutions.
 * Uses Supabase edge function or direct Finnhub API.
 * 15-minute in-memory cache per symbol/resolution.
 */

import { useState, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getCredential } from "../lib/credentials";
import type { OHLCV } from "../lib/technicalIndicators";

export type Resolution = "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M";

interface CandleCache {
  data: OHLCV[];
  timestamp: number;
  key: string;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, CandleCache>();

async function finnhubFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const apiKey = getCredential("finnhub");

  const useEdge = !apiKey && isSupabaseConfigured();
  if (!apiKey && !useEdge) throw new Error("No Finnhub API key configured");

  let url: string;
  if (useEdge) {
    const qs = new URLSearchParams({ endpoint, ...params });
    url = `${supabaseUrl}/functions/v1/finnhub?${qs}`;
  } else {
    const qs = new URLSearchParams({ ...params, token: apiKey! });
    url = `https://finnhub.io/api/v1/${endpoint}?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (useEdge) {
    headers["Authorization"] = `Bearer ${supabaseKey}`;
    headers["apikey"] = supabaseKey;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Finnhub ${endpoint} failed: ${response.status}`);
  return response.json();
}

interface FinnhubCandleResponse {
  c: number[];  // close
  h: number[];  // high
  l: number[];  // low
  o: number[];  // open
  v: number[];  // volume
  t: number[];  // timestamp
  s: string;    // status ("ok" or "no_data")
}

function parseCandleResponse(data: FinnhubCandleResponse): OHLCV[] {
  if (data.s !== "ok" || !data.c?.length) return [];
  return data.t.map((t, i) => ({
    o: data.o[i],
    h: data.h[i],
    l: data.l[i],
    c: data.c[i],
    v: data.v[i],
    t,
  }));
}

/**
 * Calculate how many seconds of history to fetch for a given resolution.
 * Daily: 1 year, Weekly: 3 years, Intraday: 5 days.
 */
function getTimeRange(resolution: Resolution): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  let lookback: number;

  switch (resolution) {
    case "1":
    case "5":
      lookback = 2 * 86400; // 2 days
      break;
    case "15":
    case "30":
      lookback = 5 * 86400; // 5 days
      break;
    case "60":
      lookback = 14 * 86400; // 2 weeks
      break;
    case "W":
      lookback = 3 * 365 * 86400; // 3 years
      break;
    case "M":
      lookback = 5 * 365 * 86400; // 5 years
      break;
    default: // "D"
      lookback = 365 * 86400; // 1 year
  }

  return { from: now - lookback, to: now };
}

export function useCandles() {
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCandles = useCallback(async (symbol: string, resolution: Resolution = "D") => {
    const cacheKey = `${symbol.toUpperCase()}_${resolution}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setCandles(cached.data);
      setError(null);
      return cached.data;
    }

    // Abort previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { from, to } = getTimeRange(resolution);
      const data = await finnhubFetch<FinnhubCandleResponse>("stock/candle", {
        symbol: symbol.toUpperCase(),
        resolution,
        from: from.toString(),
        to: to.toString(),
      });

      const parsed = parseCandleResponse(data);
      if (parsed.length === 0) {
        setError("No candle data available for this symbol");
        setCandles([]);
        return [];
      }

      // Cache it
      cache.set(cacheKey, { data: parsed, timestamp: Date.now(), key: cacheKey });
      setCandles(parsed);
      setLoading(false);
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch candle data";
      setError(msg);
      setCandles([]);
      setLoading(false);
      return [];
    }
  }, []);

  return { candles, loading, error, fetchCandles };
}
