/**
 * Unusual Whales API client for SIBT.
 * Used as premium data source when user has UW_TOKEN configured.
 */
import { getCredential } from "../lib/credentials";

const UW_BASE = "https://api.unusualwhales.com/api";

function getToken(): string | null {
  return getCredential("unusual_whales");
}

export function hasUWToken(): boolean {
  return !!getToken();
}

async function uwFetch<T>(path: string): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("UW token not configured");

  const res = await fetch(`${UW_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid UW token");
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
