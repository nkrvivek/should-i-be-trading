/**
 * Shared data fetcher functions for Finnhub and FRED edge functions.
 *
 * Replaces duplicate inline implementations in useMarketScore, useRegimeMonitor, etc.
 * All calls include user authentication via x-user-token.
 */

import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";
import { dedupFetch } from "./fetchDedup";

/**
 * Fetch from Finnhub via edge function (or direct with API key).
 */
export async function finnhubFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey?: string,
): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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

  const headers: Record<string, string> = useEdge ? await getEdgeHeaders() : {};

  const res = await dedupFetch(url, { headers });
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

/**
 * Fetch a FRED series via edge function. Returns numeric values most-recent first.
 * Delegates to freeDataClient for the actual fetch, then extracts numbers.
 */
export async function fredFetchSeries(seriesId: string, limit = 5): Promise<number[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { fetchFredSeries } = await import("./freeDataClient");
    const obs = await fetchFredSeries(seriesId, limit);
    return obs.map((o) => parseFloat(o.value));
  } catch {
    return [];
  }
}

/**
 * Fetch a single latest FRED value.
 */
export async function fredFetchLatest(seriesId: string): Promise<number | undefined> {
  const vals = await fredFetchSeries(seriesId, 2);
  return vals.length > 0 ? vals[0] : undefined;
}
