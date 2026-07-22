/**
 * Tradier options-chain client — builds a production StrikeSelector for the
 * covered-call candidate builder. Ported pattern: duplicates a thin
 * direct-fetch client here (same precedent as _shared/snaptradeClient.ts's
 * doc comment) rather than hopping through the existing tradier/index.ts
 * edge function internally — that function stays the user-facing quote/chain
 * proxy (rate-limited, scoped endpoints); this module talks to Tradier
 * directly for the server-side strike-selection path.
 *
 * Fetches available expirations, picks one 30-45 DTE out, fetches the call
 * chain (with greeks) for that expiry, and hands the raw options to
 * src/lib/strikeSelector.ts's pure selectCoveredCallStrike for the actual
 * pick. Any failure (missing API key, network error, empty chain) resolves
 * to null — "no chain" — which the candidate builder treats as
 * no_valid_strike, never a guessed strike.
 */
import { selectCoveredCallStrike, type ChainOption } from "../../../src/lib/strikeSelector.ts";
import type { StrikeSelector, StrikeSelectorResult } from "../../../src/lib/proposalEngine.ts";

const PROD_BASE = "https://api.tradier.com/v1";
const SANDBOX_BASE = "https://sandbox.tradier.com/v1";

const MIN_DTE = 30;
const MAX_DTE = 45;
const TARGET_DTE_MIDPOINT = (MIN_DTE + MAX_DTE) / 2;

interface TradierExpirationsResponse {
  expirations?: { date?: string[] | string };
}

interface TradierGreeksRaw {
  delta?: number;
}

interface TradierOptionRaw {
  strike?: number;
  option_type?: "call" | "put";
  bid?: number;
  greeks?: TradierGreeksRaw | null;
}

interface TradierChainResponse {
  options?: { option?: TradierOptionRaw[] | TradierOptionRaw };
}

interface TradierQuoteRaw {
  symbol?: string;
  last?: number;
  bid?: number;
  ask?: number;
}

interface TradierQuotesResponse {
  quotes?: { quote?: TradierQuoteRaw[] | TradierQuoteRaw };
}

export interface LiveQuote {
  bid: number;
  ask: number;
  last: number;
}

function tradierBase(): string {
  return Deno.env.get("TRADIER_SANDBOX") === "true" ? SANDBOX_BASE : PROD_BASE;
}

function tradierHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
}

/**
 * Pick the expiration closest to the 37-38 DTE midpoint among those in
 * [MIN_DTE, MAX_DTE]. Falls back to the closest expiration >= MIN_DTE, and
 * finally to the closest expiration overall, so a thin/irregular expiration
 * ladder still yields a usable expiry rather than rejecting every ticker.
 */
export function pickExpiry(expirations: string[], today: string): string | null {
  if (expirations.length === 0) return null;
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const withDte = expirations
    .map((date) => ({ date, dte: Math.round((Date.parse(`${date}T00:00:00Z`) - todayMs) / 86_400_000) }))
    .filter((e) => Number.isFinite(e.dte));
  if (withDte.length === 0) return null;

  const inWindow = withDte.filter((e) => e.dte >= MIN_DTE && e.dte <= MAX_DTE);
  const atLeastMin = withDte.filter((e) => e.dte >= MIN_DTE);
  const pool = inWindow.length > 0 ? inWindow : atLeastMin.length > 0 ? atLeastMin : withDte;

  let best = pool[0];
  let bestDist = Math.abs(best.dte - TARGET_DTE_MIDPOINT);
  for (const e of pool) {
    const dist = Math.abs(e.dte - TARGET_DTE_MIDPOINT);
    if (dist < bestDist) {
      best = e;
      bestDist = dist;
    }
  }
  return best.date;
}

async function fetchExpirations(symbol: string, apiKey: string): Promise<string[]> {
  const url = `${tradierBase()}/markets/options/expirations?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: tradierHeaders(apiKey) });
  if (!res.ok) return [];
  const data = (await res.json()) as TradierExpirationsResponse;
  const raw = data.expirations?.date;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function fetchCallChain(symbol: string, expiry: string, apiKey: string): Promise<ChainOption[]> {
  const url = `${tradierBase()}/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${expiry}&greeks=true`;
  const res = await fetch(url, { headers: tradierHeaders(apiKey) });
  if (!res.ok) return [];
  const data = (await res.json()) as TradierChainResponse;
  const raw = data.options?.option;
  if (!raw) return [];
  const options = Array.isArray(raw) ? raw : [raw];
  return options
    .filter((o): o is TradierOptionRaw & { strike: number } => o.option_type === "call" && typeof o.strike === "number")
    .map((o) => ({
      strike: o.strike,
      bid: o.bid ?? 0,
      delta: o.greeks?.delta ?? null,
    }));
}

/**
 * Live equity or option quote for paper-mode spot/fill-price lookups (a
 * symbol may be a plain ticker or a full OCC option symbol — Tradier's
 * quotes endpoint resolves both). Returns null on a missing API key, a
 * non-ok response, or an empty/malformed body — callers must fail closed
 * (never guess a fill price), same posture as fetchExpirations/fetchCallChain
 * above. bid/ask fall back to `last` when Tradier omits them (thin/illiquid
 * quote), so a caller can always compute a fill price from the result.
 */
export async function fetchTradierQuote(symbol: string): Promise<LiveQuote | null> {
  const apiKey = Deno.env.get("TRADIER_API_KEY");
  if (!apiKey) return null;

  try {
    const url = `${tradierBase()}/markets/quotes?symbols=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { headers: tradierHeaders(apiKey) });
    if (!res.ok) return null;
    const data = (await res.json()) as TradierQuotesResponse;
    const raw = data.quotes?.quote;
    if (!raw) return null;
    const quote = Array.isArray(raw) ? raw[0] : raw;
    if (!quote || typeof quote.last !== "number") return null;
    return { last: quote.last, bid: quote.bid ?? quote.last, ask: quote.ask ?? quote.last };
  } catch {
    return null;
  }
}

/** Real, Tradier-backed StrikeSelector. Returns null (reject the holding) on
 * a missing API key, no expirations, no chain data, or any fetch/parse
 * failure — the pure selector's own gates (basis floor, min bid) then apply
 * on top of whatever chain data was retrieved. */
export const tradierStrikeSelector: StrikeSelector = async (params) => {
  const apiKey = Deno.env.get("TRADIER_API_KEY");
  if (!apiKey) return null;

  try {
    const expirations = await fetchExpirations(params.ticker, apiKey);
    const expiry = pickExpiry(expirations, params.today);
    if (!expiry) return null;

    const options = await fetchCallChain(params.ticker, expiry, apiKey);
    const selection = selectCoveredCallStrike({ spot: params.spot, costBasis: params.costBasis, options });
    if (!selection) return null;

    const result: StrikeSelectorResult = {
      strike: selection.strike,
      expiry,
      delta: selection.delta,
      bid: selection.bid,
      method: selection.method,
      chainSource: "tradier",
    };
    return result;
  } catch {
    // Network/parse failure -> treat exactly like "no chain data".
    return null;
  }
};
