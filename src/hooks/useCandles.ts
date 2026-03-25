/**
 * Hook for fetching OHLCV candle data.
 *
 * Primary: FMP historical-price-full (free tier, daily data).
 * Fallback: Finnhub stock/candle (requires paid plan for candles).
 *
 * FMP only provides daily data, so intraday resolutions fall back to
 * Finnhub (if user has a paid API key) or show an upgrade message.
 *
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
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, CandleCache>();

/* ─── FMP Fetcher (daily candles, free tier) ─────────── */

interface FmpHistoricalItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchFromFMP(symbol: string, days: number): Promise<OHLCV[]> {
  if (!isSupabaseConfigured()) throw new Error("FMP requires Supabase");

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fmp`;

  const from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const to = new Date().toISOString().split("T")[0];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: "historical-price",
      symbol: symbol.toUpperCase(),
      from,
      to,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `FMP historical price failed: ${response.status}`);
  }

  const result = await response.json();
  const items: FmpHistoricalItem[] = result.data?.historical ?? result.data ?? [];

  if (!Array.isArray(items) || items.length === 0) return [];

  // FMP returns newest first — reverse to oldest first
  return items
    .map((item) => ({
      o: item.open,
      h: item.high,
      l: item.low,
      c: item.close,
      v: item.volume,
      t: Math.floor(new Date(item.date).getTime() / 1000),
    }))
    .reverse();
}

/* ─── Finnhub Fetcher (intraday, paid only) ──────────── */

interface FinnhubCandleResponse {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  t: number[];
  s: string;
}

async function fetchFromFinnhub(symbol: string, resolution: Resolution): Promise<OHLCV[]> {
  const apiKey = getCredential("finnhub");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const useEdge = !apiKey && isSupabaseConfigured();
  if (!apiKey && !useEdge) throw new Error("Finnhub API key required for intraday data");

  const now = Math.floor(Date.now() / 1000);
  let lookback: number;
  switch (resolution) {
    case "1": case "5": lookback = 2 * 86400; break;
    case "15": case "30": lookback = 5 * 86400; break;
    case "60": lookback = 14 * 86400; break;
    default: lookback = 365 * 86400;
  }
  const from = now - lookback;

  const params: Record<string, string> = {
    symbol: symbol.toUpperCase(),
    resolution,
    from: from.toString(),
    to: now.toString(),
  };

  let url: string;
  if (useEdge) {
    const qs = new URLSearchParams({ endpoint: "stock/candle", ...params });
    url = `${supabaseUrl}/functions/v1/finnhub?${qs}`;
  } else {
    const qs = new URLSearchParams({ ...params, token: apiKey! });
    url = `https://finnhub.io/api/v1/stock/candle?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (useEdge) {
    headers["Authorization"] = `Bearer ${supabaseKey}`;
    headers["apikey"] = supabaseKey;
  }

  const response = await fetch(url, { headers });
  if (response.status === 403) {
    throw new Error("Finnhub candle data requires a paid subscription. Daily data from FMP is used instead.");
  }
  if (!response.ok) throw new Error(`Finnhub candle failed: ${response.status}`);

  const data: FinnhubCandleResponse = await response.json();
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

/* ─── Resolution Helpers ─────────────────────────────── */

function getLookbackDays(resolution: Resolution): number {
  switch (resolution) {
    case "W": return 3 * 365;
    case "M": return 5 * 365;
    default: return 365; // Daily
  }
}

function isIntraday(resolution: Resolution): boolean {
  return ["1", "5", "15", "30", "60"].includes(resolution);
}

/**
 * Resample daily candles to weekly or monthly.
 */
function resampleCandles(candles: OHLCV[], resolution: "W" | "M"): OHLCV[] {
  if (candles.length === 0) return [];

  const grouped = new Map<string, OHLCV[]>();
  for (const c of candles) {
    const d = new Date(c.t * 1000);
    let key: string;
    if (resolution === "W") {
      // Group by ISO week (Monday-start)
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      key = monday.toISOString().split("T")[0];
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  return Array.from(grouped.values()).map((bars) => ({
    o: bars[0].o,
    h: Math.max(...bars.map((b) => b.h)),
    l: Math.min(...bars.map((b) => b.l)),
    c: bars[bars.length - 1].c,
    v: bars.reduce((s, b) => s + b.v, 0),
    t: bars[0].t,
  }));
}

/* ─── Hook ───────────────────────────────────────────── */

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

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let parsed: OHLCV[];

      if (isIntraday(resolution)) {
        // Intraday: try Finnhub (paid) or error
        try {
          parsed = await fetchFromFinnhub(symbol, resolution);
        } catch {
          // Fall back to daily from FMP with a note
          parsed = await fetchFromFMP(symbol, 60);
          setError("Intraday data requires Finnhub paid plan. Showing daily data instead.");
        }
      } else {
        // Daily/Weekly/Monthly: use FMP (free)
        const days = getLookbackDays(resolution);
        parsed = await fetchFromFMP(symbol, days);

        // Resample if weekly or monthly
        if (resolution === "W" || resolution === "M") {
          parsed = resampleCandles(parsed, resolution);
        }
      }

      if (parsed.length === 0) {
        setError("No candle data available for this symbol");
        setCandles([]);
        setLoading(false);
        return [];
      }

      cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
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
