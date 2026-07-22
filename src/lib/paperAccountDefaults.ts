/**
 * Safe-default row shapes for paper-account provisioning. Pure/dependency-
 * free so it's unit-testable without Supabase and reusable by the
 * provision-paper-account edge function and its tests — same convention as
 * src/lib/executionSettingsDefaults.ts.
 *
 * The account-row values here must match migration 017's paper_accounts
 * insert-policy `with check` clause exactly (cash_usd = starting_cash_usd =
 * 100000) — that policy re-validates every one of these columns
 * server-side, so a mismatch here would make every provisioning attempt
 * fail RLS, not silently succeed with different values.
 *
 * Bootstrap problem: a brand-new paper account holds only cash, so there's
 * nothing to write a covered call against. Rather than build a v1
 * momentum-based equity-buy proposal flow to solve that, provisioning seeds
 * a fixed "starter portfolio" of 100 shares each in 3 allowlisted liquid
 * names, at live Tradier quotes where available (falling back to fixed
 * reference prices if there's no API key or the quote fetch fails) — this
 * is a one-time direct paper_positions insert at provisioning time, not a
 * proposal.
 */

export const STARTING_CASH_USD = 100_000;

export interface PaperAccountDefaultsRow {
  user_id: string;
  starting_cash_usd: number;
  cash_usd: number;
}

/** Build the default ($100,000 starting cash) paper_accounts row for a
 * user's first-time paper provisioning. */
export function buildDefaultPaperAccountRow(userId: string): PaperAccountDefaultsRow {
  return {
    user_id: userId,
    starting_cash_usd: STARTING_CASH_USD,
    cash_usd: STARTING_CASH_USD,
  };
}

export const STARTER_PORTFOLIO_SHARES = 100;

export const STARTER_PORTFOLIO_TICKERS = ["AAPL", "SPY", "F"] as const;

/** Reference prices used only when a live Tradier quote can't be fetched
 * (no API key configured, or the fetch fails) — provisioning must still
 * succeed with a usable starter portfolio rather than blocking on Tradier
 * being reachable. */
export const STARTER_PORTFOLIO_FALLBACK_PRICES: Record<(typeof STARTER_PORTFOLIO_TICKERS)[number], number> = {
  AAPL: 195,
  SPY: 560,
  F: 11,
};

export interface StarterPositionRow {
  user_id: string;
  symbol: string;
  qty: number;
  avg_price: number;
}

/** Build the 3 starter_portfolio paper_positions rows, using the given
 * price map (live quotes where available) with fallback reference prices
 * for any ticker missing from it. */
export function buildStarterPositionRows(
  userId: string,
  prices: Partial<Record<string, number>>
): StarterPositionRow[] {
  return STARTER_PORTFOLIO_TICKERS.map((symbol) => ({
    user_id: userId,
    symbol,
    qty: STARTER_PORTFOLIO_SHARES,
    avg_price: prices[symbol] ?? STARTER_PORTFOLIO_FALLBACK_PRICES[symbol],
  }));
}

/** Idempotency check for the provisioning edge function: an existing
 * account row (any shape, even just truthy) means this user is already
 * provisioned, so the caller should no-op instead of erroring or
 * re-seeding the starter portfolio on top of whatever the user has since
 * done with their paper account. */
export function isAlreadyProvisioned(existingAccount: unknown): boolean {
  return existingAccount != null;
}
