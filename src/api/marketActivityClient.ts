/**
 * Client for market activity data: most-active stocks, gainers, losers,
 * and FINRA short volume.
 */

import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";
import { dedupFetch } from "./fetchDedup";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FIVE_MIN = 5 * 60 * 1000;
const TWENTY_FOUR_HR = 24 * 60 * 60 * 1000;

/* ─── Types ────────────────────────────────────────── */

export interface ActiveStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  volume?: number;
}

export interface ShortVolumeEntry {
  symbol: string;
  shortVolume: number;
  totalVolume: number;
  shortRatio: number;
  shortExemptVolume?: number;
}

/* ─── Internal helpers ─────────────────────────────── */

async function finnhubActivityCall(type: "actives" | "gainers" | "losers"): Promise<ActiveStock[]> {
  if (!isSupabaseConfigured()) throw new Error("Market data unavailable. Please sign in for automatic access.");

  const headers = await getEdgeHeaders();

  // Fetch quotes for major tickers via Finnhub (already cached in edge function)
  const TICKERS = [
    "AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "TSLA", "AMD", "NFLX",
    "AVGO", "CRM", "ORCL", "ADBE", "INTC", "JPM", "BAC", "GS", "V", "MA",
    "UNH", "JNJ", "LLY", "PFE", "XOM", "CVX", "HD", "MCD", "NKE", "WMT",
    "COST", "CAT", "BA", "DIS", "NEE", "PG", "KO", "PLTR", "SHOP", "PANW",
  ];

  const results: ActiveStock[] = [];

  // Batch 5 at a time
  for (let i = 0; i < TICKERS.length; i += 5) {
    const batch = TICKERS.slice(i, i + 5);
    const responses = await Promise.allSettled(
      batch.map(async (symbol) => {
        const res = await dedupFetch(
          `${SUPABASE_URL}/functions/v1/finnhub?endpoint=quote&symbol=${symbol}`,
          { headers },
          FIVE_MIN,
        );
        if (!res.ok) return null;
        const q = await res.json();
        if (!q?.c) return null;
        return {
          symbol,
          name: symbol,
          price: q.c ?? 0,
          change: q.d ?? 0,
          changesPercentage: q.dp ?? 0,
          volume: q.v ?? undefined,
        } as ActiveStock;
      }),
    );
    for (const r of responses) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
    if (i + 5 < TICKERS.length) await new Promise((r) => setTimeout(r, 300));
  }

  // Sort based on type
  if (type === "actives") {
    return results.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 20);
  } else if (type === "gainers") {
    return results.filter((s) => s.changesPercentage > 0).sort((a, b) => b.changesPercentage - a.changesPercentage).slice(0, 20);
  } else {
    return results.filter((s) => s.changesPercentage < 0).sort((a, b) => a.changesPercentage - b.changesPercentage).slice(0, 20);
  }
}

/* ─── Public API ───────────────────────────────────── */

export async function getMostActive(): Promise<ActiveStock[]> {
  return finnhubActivityCall("actives");
}

export async function getGainers(): Promise<ActiveStock[]> {
  return finnhubActivityCall("gainers");
}

export async function getLosers(): Promise<ActiveStock[]> {
  return finnhubActivityCall("losers");
}

export async function getShortVolume(symbol?: string): Promise<ShortVolumeEntry[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Market data unavailable. Please sign in for automatic access.");
  }

  const params = symbol ? `?symbol=${symbol.toUpperCase()}` : "";
  const url = `${SUPABASE_URL}/functions/v1/finra-short-volume${params}`;
  const headers = await getEdgeHeaders();

  const res = await dedupFetch(url, { headers }, TWENTY_FOUR_HR);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `FINRA short volume failed: ${res.status}`);
  }

  const result = await res.json();
  return (result.data ?? []) as ShortVolumeEntry[];
}
