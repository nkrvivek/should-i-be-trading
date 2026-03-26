/**
 * Client for the CFTC Commitments of Traders edge function.
 *
 * Tracks institutional futures positioning across key contracts.
 * CFTC data is free (no API key needed). Published weekly.
 */

import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";

/* ─── Types ─────────────────────────────────────────── */

export interface CotHistory {
  date: string;
  netSpeculative: number;
  netCommercial: number;
  openInterest: number;
  specLong: number;
  specShort: number;
  commLong: number;
  commShort: number;
  specChange: number;
}

export interface CotContract {
  name: string;
  category: string;
  code: string;
  history: CotHistory[];
  latest: CotHistory & {
    netPctOI: number;
    weeklyChange: number;
    posture: string;
  };
}

export interface CftcResponse {
  source: string;
  lastReport: string;
  contracts: CotContract[];
}

/* ─── API ───────────────────────────────────────────── */

export async function getCotData(weeks = 12): Promise<CftcResponse> {
  if (!isSupabaseConfigured()) {
    throw new Error("CFTC requires Supabase. Configure VITE_SUPABASE_URL.");
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cftc?weeks=${weeks}`;
  const headers = await getEdgeHeaders();

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `CFTC request failed: ${response.status}`);
  }

  return response.json();
}

/* ─── Helpers ───────────────────────────────────────── */

/** Compute COT Index (percentile ranking of net spec position over history) */
export function computeCotIndex(history: CotHistory[]): number {
  if (history.length < 2) return 50;
  const values = history.map((h) => h.netSpeculative);
  const current = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return Math.round(((current - min) / (max - min)) * 100);
}

/** Get posture color */
export function postureColor(posture: string): string {
  if (posture.includes("HEAVY LONG")) return "var(--positive)";
  if (posture === "LONG") return "rgba(16, 185, 129, 0.7)";
  if (posture.includes("HEAVY SHORT")) return "var(--negative)";
  if (posture === "SHORT") return "rgba(232, 93, 108, 0.7)";
  return "var(--text-muted)";
}

/** Get category label */
export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    index: "Equity Indices",
    rates: "Interest Rates",
    commodity: "Commodities",
    volatility: "Volatility",
    currency: "Currencies",
  };
  return labels[category] ?? category;
}
