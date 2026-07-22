import type { UserTier } from "../stores/authStore";
import { getAiRequestLimit } from "./aiLimits";

export type Feature =
  | "regime_dashboard"
  | "macro_dashboard"
  | "terminal"
  | "ai_analysis"
  | "ai_chat"
  | "scanner"
  | "dark_pool"
  | "alerts"
  | "watchlists_unlimited"
  | "backtester_basic"
  | "backtester_full"
  | "automation"
  | "charts_advanced"
  | "regime_detail"
  | "regime_ai"
  | "notifications_all"
  | "strategy_simulator"
  | "technical_signals"
  | "csv_upload"
  | "snaptrade"
  | "social_sentiment"
  | "market_activity"
  | "proposals"
  | "paper_trading"
  | "copilot_execution"
  | "auto_execute";

const FEATURE_MAP: Record<Feature, UserTier[]> = {
  regime_dashboard: ["free", "starter", "pro", "enterprise"],
  macro_dashboard: ["free", "starter", "pro", "enterprise"],
  terminal: ["pro", "enterprise"],
  ai_analysis: ["pro", "enterprise"],
  ai_chat: ["starter", "pro", "enterprise"],
  scanner: ["pro", "enterprise"],
  dark_pool: ["pro", "enterprise"],
  alerts: ["pro", "enterprise"],
  watchlists_unlimited: ["pro", "enterprise"],
  backtester_basic: ["starter", "pro", "enterprise"],
  backtester_full: ["pro", "enterprise"],
  automation: ["enterprise"],
  charts_advanced: ["pro", "enterprise"],
  regime_detail: ["starter", "pro", "enterprise"],
  regime_ai: ["pro", "enterprise"],
  notifications_all: ["starter", "pro", "enterprise"],
  strategy_simulator: ["free", "starter", "pro", "enterprise"],
  technical_signals: ["starter", "pro", "enterprise"],
  csv_upload: ["starter", "pro", "enterprise"],
  snaptrade: ["pro", "enterprise"],
  social_sentiment: ["starter", "pro", "enterprise"],
  market_activity: ["starter", "pro", "enterprise"],
  // Paper proposals are the free-tier funnel (relaunch 2026-07-21): every
  // tier can generate/approve paper trades, capped by src/lib/paperLimits.ts
  // for the free tier. Live execution stays behind copilot_execution below.
  proposals: ["free", "starter", "pro", "copilot", "enterprise"],
  paper_trading: ["free", "starter", "pro", "copilot", "enterprise"],
  copilot_execution: ["copilot", "enterprise"],
  auto_execute: ["copilot", "enterprise"],
};

export function hasFeature(tier: UserTier | undefined, feature: Feature): boolean {
  if (!tier) return FEATURE_MAP[feature].includes("free");
  return FEATURE_MAP[feature].includes(tier);
}

export function getRequiredTier(feature: Feature): UserTier {
  const tiers = FEATURE_MAP[feature];
  if (tiers.includes("free")) return "free";
  if (tiers.includes("starter")) return "starter";
  if (tiers.includes("pro")) return "pro";
  if (tiers.includes("copilot")) return "copilot";
  return "enterprise";
}

/** Max watchlist tickers by tier */
export function maxWatchlistTickers(tier: UserTier | undefined): number {
  if (tier === "pro" || tier === "enterprise") return 500;
  if (tier === "starter") return 50;
  return 10;
}

/** Max watchlists by tier */
export function maxWatchlists(tier: UserTier | undefined): number {
  if (tier === "pro" || tier === "enterprise") return 50;
  if (tier === "starter") return 5;
  return 1;
}

/** Max AI requests per day by tier (when using server-side key).
 * `copilot` has no AI-rate-limit tier of its own yet (aiLimits.ts covers only
 * the read/analysis surface, not the proposal/council pipeline) — treat it as
 * `pro` for this budget until a dedicated copilot AI budget is defined. */
export function maxAiRequests(tier: UserTier | undefined): number {
  const aiTier = tier === "copilot" ? "pro" : tier;
  return getAiRequestLimit(aiTier ?? "free");
}
