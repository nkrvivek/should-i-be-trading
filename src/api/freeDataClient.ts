import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";
import { dedupFetch } from "./fetchDedup";

/**
 * Call a Supabase Edge Function for free data APIs (FRED, Finnhub, SEC EDGAR).
 * These use server-side keys, not per-user credentials.
 * Sends user JWT via x-user-token for authentication.
 */
async function callEdgeFunction<T>(
  functionName: string,
  params: Record<string, string>,
  ttlMs = 60_000,
): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error(`${functionName} unavailable. Please sign in for automatic access.`);
  }

  const searchParams = new URLSearchParams(params);
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}?${searchParams}`;

  const headers = await getEdgeHeaders();
  const response = await dedupFetch(url, { headers }, ttlMs);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `${functionName} failed: ${response.status}`);
  }

  return response.json();
}

/* ─── FRED ─────────────────────────────────────────── */

export type FredObservation = {
  date: string;
  value: string;
};

export type FredSeriesResponse = {
  observations: FredObservation[];
};

export async function fetchFredSeries(seriesId: string, limit = 60): Promise<FredObservation[]> {
  const data = await callEdgeFunction<FredSeriesResponse>("fred", {
    series_id: seriesId,
    sort_order: "desc",
    limit: String(limit),
  }, 5 * 60_000);
  return (data.observations ?? []).filter((o) => o.value !== ".");
}

/** Yield curve: fetch multiple treasury rates */
export async function fetchYieldCurve(): Promise<Record<string, number>> {
  const series = ["DGS1MO", "DGS3MO", "DGS6MO", "DGS1", "DGS2", "DGS5", "DGS10", "DGS30"];
  const results = await Promise.allSettled(
    series.map((s) => fetchFredSeries(s, 1)),
  );

  const curve: Record<string, number> = {};
  const labels = ["1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "30Y"];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length > 0) {
      curve[labels[i]] = parseFloat(r.value[0].value);
    }
  });
  return curve;
}

/* ─── Finnhub ──────────────────────────────────────── */

export type EconomicEvent = {
  country: string;
  event: string;
  impact: string;
  time: string;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
};

export async function fetchEconomicCalendar(): Promise<EconomicEvent[]> {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const data = await callEdgeFunction<{ economicCalendar: EconomicEvent[] }>("finnhub", {
    endpoint: "calendar/economic",
    from: today,
    to: nextWeek,
  }, 30 * 60_000);
  return data.economicCalendar ?? [];
}

export type InsiderTransaction = {
  symbol: string;
  name: string;
  share: number;
  change: number;
  transactionDate: string;
  transactionType: string;
  transactionCode: string;
  transactionPrice: number;
  filingDate?: string;
  id?: string;
};

export async function fetchInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  const data = await callEdgeFunction<{ data: InsiderTransaction[] }>("finnhub", {
    endpoint: "stock/insider-transactions",
    symbol,
    from: threeMonthsAgo,
    to: today,
  }, 15 * 60_000);
  return data.data ?? [];
}

/* ─── Congressional Trading (Finnhub) ────────────── */

export type CongressTrade = {
  symbol: string;
  name: string;
  amount: number;
  transactionDate: string;
  transactionType: string;
  ownerType: string;
  assetType: string;
};

export async function fetchCongressionalTrades(): Promise<CongressTrade[]> {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  const data = await callEdgeFunction<{ data: CongressTrade[] }>("finnhub", {
    endpoint: "stock/congressional-trading",
    from: threeMonthsAgo,
    to: today,
  }, 15 * 60_000);
  return data.data ?? [];
}
