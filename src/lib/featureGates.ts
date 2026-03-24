import type { UserTier } from "../stores/authStore";

export type Feature =
  | "regime_dashboard"
  | "macro_dashboard"
  | "terminal"
  | "ai_analysis"
  | "scanner"
  | "dark_pool"
  | "alerts"
  | "watchlists_unlimited"
  | "backtester"
  | "automation"
  | "charts_advanced"
  | "regime_detail"
  | "regime_ai";

const FEATURE_MAP: Record<Feature, UserTier[]> = {
  regime_dashboard: ["free", "pro", "enterprise"],
  macro_dashboard: ["free", "pro", "enterprise"],
  terminal: ["pro", "enterprise"],
  ai_analysis: ["pro", "enterprise"],
  scanner: ["pro", "enterprise"],
  dark_pool: ["pro", "enterprise"],
  alerts: ["pro", "enterprise"],
  watchlists_unlimited: ["pro", "enterprise"],
  backtester: ["pro", "enterprise"],
  automation: ["enterprise"],
  charts_advanced: ["pro", "enterprise"],
  regime_detail: ["pro", "enterprise"],
  regime_ai: ["pro", "enterprise"],
};

export function hasFeature(tier: UserTier | undefined, feature: Feature): boolean {
  if (!tier) return FEATURE_MAP[feature].includes("free");
  return FEATURE_MAP[feature].includes(tier);
}

export function getRequiredTier(feature: Feature): UserTier {
  const tiers = FEATURE_MAP[feature];
  if (tiers.includes("free")) return "free";
  if (tiers.includes("pro")) return "pro";
  return "enterprise";
}

/** Max watchlist tickers by tier */
export function maxWatchlistTickers(tier: UserTier | undefined): number {
  if (tier === "pro" || tier === "enterprise") return 500;
  return 10;
}

/** Max watchlists by tier */
export function maxWatchlists(tier: UserTier | undefined): number {
  if (tier === "pro" || tier === "enterprise") return 50;
  return 1;
}
