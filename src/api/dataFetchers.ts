/**
 * Shared data fetcher functions for Finnhub and FRED edge functions.
 *
 * Replaces duplicate inline implementations in useMarketScore, useRegimeMonitor, etc.
 * All calls include user authentication via x-user-token.
 */

import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";

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

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

/**
 * Fetch a FRED series via edge function. Returns values most-recent first.
 */
export async function fredFetchSeries(seriesId: string, limit = 5): Promise<number[]> {
  if (!isSupabaseConfigured()) return [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = await getEdgeHeaders();

  try {
    const url = `${supabaseUrl}/functions/v1/fred?series_id=${seriesId}&limit=${limit}&sort_order=desc`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    const obs = data?.observations;
    if (!obs) return [];
    return obs
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { value: string }) => parseFloat(o.value));
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
