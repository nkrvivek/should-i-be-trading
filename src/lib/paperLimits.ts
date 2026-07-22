/**
 * Free-tier paper-trading caps. Pure, dependency-free (the only import is a
 * type, erased at compile time so this stays a single-file module at
 * runtime — same convention as src/lib/proposalEngine.ts). Paper trading is
 * the free-tier funnel: everyone authenticated can generate and execute
 * paper proposals, but the free tier is capped so it stays a soak test, not
 * a way to run an unlimited simulated desk for free. Paid tiers (starter and
 * up) are uncapped.
 */
import type { UserTier } from "../stores/authStore";

export const FREE_PAPER_DAILY_ACTIONS = 20;

export const FREE_PAPER_TICKER_ALLOWLIST = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "SPY", "QQQ", "AMD",
  "INTC", "BAC", "WFC", "KO", "PFE", "F", "T", "VZ", "PLTR", "SOFI",
] as const;

const ALLOWLIST_SET = new Set(FREE_PAPER_TICKER_ALLOWLIST.map((t) => t.toUpperCase()));

export function isFreeTier(tier: UserTier | undefined): boolean {
  return tier === undefined || tier === "free";
}

export interface PaperActionBudgetResult {
  allowed: boolean;
  limit: number | null; // null = unlimited (paid tiers)
  remaining: number | null;
}

/** Paid tiers always pass with no cap. Free tier compares the given action
 * count (this day's usage so far, e.g. from paper_action_usage) against
 * FREE_PAPER_DAILY_ACTIONS. */
export function checkPaperActionBudget(count: number, tier: UserTier | undefined): PaperActionBudgetResult {
  if (!isFreeTier(tier)) {
    return { allowed: true, limit: null, remaining: null };
  }
  const remaining = Math.max(0, FREE_PAPER_DAILY_ACTIONS - count);
  return { allowed: count < FREE_PAPER_DAILY_ACTIONS, limit: FREE_PAPER_DAILY_ACTIONS, remaining };
}

/** Paid tiers may trade any ticker. Free tier is restricted to the 20-name
 * liquid allowlist (case-insensitive). */
export function isPaperTickerAllowed(ticker: string, tier: UserTier | undefined): boolean {
  if (!isFreeTier(tier)) return true;
  return ALLOWLIST_SET.has(ticker.toUpperCase());
}
