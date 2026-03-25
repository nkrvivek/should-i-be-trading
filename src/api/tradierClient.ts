/**
 * Client for the Tradier edge function proxy.
 *
 * Provides typed access to options chains, quotes, and expirations.
 * All requests go through the Supabase edge function which adds the API key.
 */

import { isSupabaseConfigured } from "../lib/supabase";

async function tradierCall<T>(params: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("Tradier requires Supabase. Configure VITE_SUPABASE_URL.");
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tradier`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Tradier request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}

/* ─── Types ─────────────────────────────────────────── */

export interface TradierQuote {
  symbol: string;
  last: number;
  change: number;
  change_percentage: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bid: number;
  ask: number;
  description: string;
}

export interface TradierGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  mid_iv: number; // implied volatility
  phi: number;
  smv_vol: number;
  updated_at: string;
}

export interface TradierOption {
  symbol: string; // OCC symbol e.g. "AAPL260417C00200000"
  description: string;
  strike: number;
  option_type: "call" | "put";
  expiration_date: string;
  last: number | null;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  greeks: TradierGreeks | null;
}

export interface TradierChainResponse {
  options: {
    option: TradierOption[] | TradierOption;
  } | null;
}

export interface TradierExpirationsResponse {
  expirations: {
    date: string[] | string;
  } | null;
}

export interface TradierQuoteResponse {
  quotes: {
    quote: TradierQuote | TradierQuote[];
  };
}

export interface TradierStrikesResponse {
  strikes: {
    strike: number[] | number;
  } | null;
}

/* ─── API Functions ─────────────────────────────────── */

/** Get a stock quote */
export async function getQuote(symbol: string): Promise<TradierQuote | null> {
  const data = await tradierCall<TradierQuoteResponse>({ endpoint: "quote", symbol });
  const q = data?.quotes?.quote;
  if (Array.isArray(q)) return q[0] ?? null;
  return q ?? null;
}

/** Get available option expiration dates */
export async function getExpirations(symbol: string): Promise<string[]> {
  const data = await tradierCall<TradierExpirationsResponse>({ endpoint: "expirations", symbol });
  const dates = data?.expirations?.date;
  if (!dates) return [];
  return Array.isArray(dates) ? dates : [dates];
}

/** Get the full options chain for a symbol + expiration (with Greeks) */
export async function getOptionsChain(symbol: string, expiration: string): Promise<TradierOption[]> {
  const data = await tradierCall<TradierChainResponse>({ endpoint: "chain", symbol, expiration });
  const opts = data?.options?.option;
  if (!opts) return [];
  return Array.isArray(opts) ? opts : [opts];
}

/** Get available strikes for a symbol + expiration */
export async function getStrikes(symbol: string, expiration: string): Promise<number[]> {
  const data = await tradierCall<TradierStrikesResponse>({ endpoint: "strikes", symbol, expiration });
  const strikes = data?.strikes?.strike;
  if (!strikes) return [];
  return Array.isArray(strikes) ? strikes : [strikes];
}

/* ─── Helpers ───────────────────────────────────────── */

/** Find the nearest ATM options from a chain */
export function findNearATM(
  chain: TradierOption[],
  currentPrice: number,
  type: "call" | "put",
  count = 5,
): TradierOption[] {
  return chain
    .filter((o) => o.option_type === type)
    .sort((a, b) => Math.abs(a.strike - currentPrice) - Math.abs(b.strike - currentPrice))
    .slice(0, count);
}

/** Get mid price for an option */
export function midPrice(opt: TradierOption): number {
  if (opt.bid > 0 && opt.ask > 0) return (opt.bid + opt.ask) / 2;
  return opt.last ?? opt.ask ?? opt.bid ?? 0;
}
