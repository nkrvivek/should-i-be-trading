// Pure UI helpers for the paper-trading surface. No Supabase, no React —
// kept side-effect free so they can be unit tested directly. Mirrors the
// pattern in proposalUi.ts.

import type { BadgeVariant } from "../components/shared/Badge";

// ── free-tier caps (TODO merge cleanup) ─────────────────────────────────
//
// The backend branch owns src/lib/paperLimits.ts (FREE_PAPER_DAILY_ACTIONS,
// FREE_PAPER_TICKER_ALLOWLIST) and it does not exist on this branch yet.
// These are local fallback values matching the agreed contract. Once
// paperLimits.ts lands, delete this block and import from it instead.
export const FREE_PAPER_DAILY_ACTIONS = 20;
export const FREE_PAPER_TICKER_ALLOWLIST = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD",
  "SPY", "QQQ", "IWM", "NFLX", "AVGO", "CRM", "ORCL", "COST",
  "JPM", "V", "UNH", "XOM",
];

// ── mode → badge ─────────────────────────────────────────────────────────

export type ProposalMode = "paper" | "live";

const MODE_BADGES: Record<ProposalMode, { label: string; variant: BadgeVariant }> = {
  paper: { label: "PAPER", variant: "default" },
  live: { label: "LIVE", variant: "positive" },
};

/** Maps a proposal's `mode` column to a badge. Unknown/missing values fall
 * back to "paper" — the safer default when a value is absent (no real
 * money moves on a misread). */
export function modeBadge(mode: string | null | undefined): { label: string; variant: BadgeVariant } {
  if (mode === "live") return MODE_BADGES.live;
  return MODE_BADGES.paper;
}

/** Confirm-dialog disclosure copy for the approve flow, branched on mode. */
export function approveDisclosure(mode: string | null | undefined): string {
  if (mode === "live") return "This places a real order.";
  return "This is a simulated fill. No real money moves.";
}

// ── paper account value math ─────────────────────────────────────────────

export type PaperPositionValue = {
  qty: number;
  price: number;
};

/** Total mark-to-market value of a list of positions (qty * price, summed). */
export function positionsValue(positions: PaperPositionValue[]): number {
  return positions.reduce((sum, p) => sum + p.qty * p.price, 0);
}

/** Total paper account value: cash on hand plus marked positions. */
export function paperAccountValue(cashUsd: number, positions: PaperPositionValue[]): number {
  return cashUsd + positionsValue(positions);
}

// ── cap meter ─────────────────────────────────────────────────────────────

/** "X of 20 daily actions used" style label. Clamps `used` into [0, limit]
 * so a stale/over-count never reads as more than 100%. */
export function capMeterLabel(used: number, limit: number = FREE_PAPER_DAILY_ACTIONS): string {
  const clamped = Math.max(0, Math.min(used, limit));
  return `${clamped} of ${limit} daily actions used`;
}

/** Fraction used, clamped to [0, 1], for a progress-bar width. */
export function capMeterFraction(used: number, limit: number = FREE_PAPER_DAILY_ACTIONS): number {
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(used, limit)) / limit;
}

/** True once the free-tier ticker allowlist would block a symbol. */
export function isTickerAllowlisted(ticker: string, allowlist: string[] = FREE_PAPER_TICKER_ALLOWLIST): boolean {
  return allowlist.includes(ticker.toUpperCase());
}
