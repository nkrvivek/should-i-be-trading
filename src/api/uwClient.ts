/**
 * Unusual Whales API client for SIBT.
 * Used as premium data source when user has UW_TOKEN configured.
 * Routes all requests through proxy-uw edge function to keep API keys server-side.
 */
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";
import { getCredential } from "../lib/credentials";

export function hasUWToken(): boolean {
  return !!getCredential("unusual_whales");
}

async function uwFetch<T>(path: string): Promise<T> {
  if (!hasUWToken()) throw new Error("UW token not configured");
  if (!isSupabaseConfigured()) throw new Error("Sign in to use Unusual Whales data");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = await getEdgeHeaders();
  const url = `${supabaseUrl}/functions/v1/proxy-uw?path=${encodeURIComponent(path)}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Invalid UW token");
    if (res.status === 429) throw new Error("UW rate limit — try again shortly");
    throw new Error(`UW API error: ${res.status}`);
  }

  return res.json();
}

/* ─── Congress Trading ─────────────────────────────── */

export type UWCongressTrade = {
  name: string;
  ticker: string | null;
  issuer: string;
  is_active: boolean;
  politician_id: string;
  reporter: string;
  txn_type: string;
  amounts: string;
  notes: string | null;
  transaction_date: string;
  filed_at_date: string;
  member_type: string; // "house" | "senate"
};

export async function fetchUWCongressTrades(): Promise<UWCongressTrade[]> {
  const data = await uwFetch<{ data: UWCongressTrade[] }>("/congress/recent-trades");
  return data.data ?? [];
}

/* ─── Insider Trading ──────────────────────────────── */

export type UWInsiderTransaction = {
  id: string;
  ticker: string;
  amount: number;
  transactions: number;
  price: string | null;
  sector: string;
  is_s_p_500: boolean;
  owner_name: string;
  transaction_date: string;
  filing_date: string;
  stock_price: string | null;
  formtype: string;
  is_officer: boolean;
  is_director: boolean;
  is_ten_percent_owner: boolean;
  security_title: string;
  transaction_code: string; // "P" = purchase, "S" = sale, "A" = award, "D" = disposition
  officer_title: string | null;
  shares_owned_after: number;
  shares_owned_before: number;
  marketcap: string;
  is_10b5_1: boolean;
};

export async function fetchUWInsiderTransactions(): Promise<UWInsiderTransaction[]> {
  const data = await uwFetch<{ data: UWInsiderTransaction[] }>("/insider/transactions");
  return data.data ?? [];
}

export async function fetchUWInsiderByTicker(ticker: string): Promise<UWInsiderTransaction[]> {
  const data = await uwFetch<{ data: UWInsiderTransaction[] }>(`/insider/${encodeURIComponent(ticker)}/ticker-flow`);
  return data.data ?? [];
}
