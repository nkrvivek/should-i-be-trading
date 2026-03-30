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

async function fmpActivityCall(endpoint: string): Promise<ActiveStock[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  const url = `${SUPABASE_URL}/functions/v1/fmp`;
  const headers = await getEdgeHeaders();

  const res = await dedupFetch(
    `${url}?_ep=${endpoint}`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    },
    FIVE_MIN,
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `FMP ${endpoint} failed: ${res.status}`);
  }

  const result = await res.json();
  return (result.data ?? []) as ActiveStock[];
}

/* ─── Public API ───────────────────────────────────── */

export async function getMostActive(): Promise<ActiveStock[]> {
  return fmpActivityCall("actives");
}

export async function getGainers(): Promise<ActiveStock[]> {
  return fmpActivityCall("gainers");
}

export async function getLosers(): Promise<ActiveStock[]> {
  return fmpActivityCall("losers");
}

export async function getShortVolume(symbol?: string): Promise<ShortVolumeEntry[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
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
