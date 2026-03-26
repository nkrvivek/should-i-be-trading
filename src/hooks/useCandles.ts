/**
 * Hook for fetching OHLCV candle data.
 *
 * Primary: FMP historical-price-full via v3 API (daily data, requires API key).
 * Fallback: Yahoo Finance chart API (free, no key, daily + intraday).
 *
 * Tries FMP first for daily/weekly/monthly. Falls back to Yahoo Finance
 * edge function proxy if FMP fails or for intraday resolutions.
 *
 * 15-minute in-memory cache per symbol/resolution.
 */

import { useState, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "../api/edgeHeaders";
import type { OHLCV } from "../lib/technicalIndicators";

export type Resolution = "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M";

interface CandleCache {
  data: OHLCV[];
  timestamp: number;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, CandleCache>();

/* ─── FMP Fetcher (daily candles via v3 API) ─────────── */

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

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fmp`;

  const from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const to = new Date().toISOString().split("T")[0];

  const headers = await getEdgeHeaders();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
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
  // FMP v3 response: { historical: [...] } or directly [...]
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

/* ─── Yahoo Finance Fetcher (fallback, intraday) ─────── */

function yahooParams(resolution: Resolution): { interval: string; range: string } {
  switch (resolution) {
    case "1":  return { interval: "1m",  range: "1d" };
    case "5":  return { interval: "5m",  range: "5d" };
    case "15": return { interval: "15m", range: "5d" };
    case "30": return { interval: "30m", range: "5d" };
    case "60": return { interval: "60m", range: "1mo" };
    case "W":  return { interval: "1wk", range: "3y" };
    case "M":  return { interval: "1mo", range: "5y" };
    default:   return { interval: "1d",  range: "1y" };
  }
}

interface YahooChartResponse {
  chart: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }>;
    error?: { code: string; description: string };
  };
}

async function fetchFromYahoo(symbol: string, resolution: Resolution): Promise<OHLCV[]> {
  const { interval, range } = yahooParams(resolution);
  const sym = symbol.toUpperCase();

  // Use edge function proxy to avoid CORS
  if (isSupabaseConfigured()) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const qs = new URLSearchParams({
      endpoint: `v8/finance/chart/${sym}`,
      range,
      interval,
      includePrePost: "false",
    });

    const headers = await getEdgeHeaders();
    const res = await fetch(`${supabaseUrl}/functions/v1/yahoo-chart?${qs}`, {
      headers,
    });

    if (!res.ok) throw new Error(`Yahoo Finance failed: ${res.status}`);
    return parseYahooChart(await res.json());
  }

  // Direct fetch (dev mode)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${range}&interval=${interval}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo Finance failed: ${res.status}`);
  return parseYahooChart(await res.json());
}

function parseYahooChart(data: YahooChartResponse): OHLCV[] {
  if (data.chart?.error) throw new Error(data.chart.error.description || "Yahoo Finance error");
  const result = data.chart?.result?.[0];
  if (!result?.timestamp?.length) return [];

  const q = result.indicators.quote[0];
  const candles: OHLCV[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i], v = q.volume[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ o, h, l, c, v: v ?? 0, t: result.timestamp[i] });
  }
  return candles;
}

/* ─── Resolution Helpers ─────────────────────────────── */

function getLookbackDays(resolution: Resolution): number {
  switch (resolution) {
    case "W": return 3 * 365;
    case "M": return 5 * 365;
    default: return 365;
  }
}

function isIntraday(resolution: Resolution): boolean {
  return ["1", "5", "15", "30", "60"].includes(resolution);
}

function resampleCandles(candles: OHLCV[], resolution: "W" | "M"): OHLCV[] {
  if (candles.length === 0) return [];
  const grouped = new Map<string, OHLCV[]>();
  for (const c of candles) {
    const d = new Date(c.t * 1000);
    let key: string;
    if (resolution === "W") {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
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
        // Intraday: Yahoo Finance only
        parsed = await fetchFromYahoo(symbol, resolution);
      } else {
        // Daily/Weekly/Monthly: try FMP first, fallback to Yahoo
        try {
          const days = getLookbackDays(resolution);
          parsed = await fetchFromFMP(symbol, days);
          if (resolution === "W" || resolution === "M") {
            parsed = resampleCandles(parsed, resolution);
          }
        } catch {
          // FMP failed — fallback to Yahoo Finance
          parsed = await fetchFromYahoo(symbol, resolution);
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
