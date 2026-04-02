import { describe, it, expect } from "vitest";
import {
  hasFeature,
  getRequiredTier,
  maxWatchlistTickers,
  maxWatchlists,
} from "../../src/lib/featureGates";
import type { Feature } from "../../src/lib/featureGates";

describe("hasFeature", () => {
  // ── Free tier ──

  it("free tier has access to free features", () => {
    expect(hasFeature("free", "regime_dashboard")).toBe(true);
    expect(hasFeature("free", "macro_dashboard")).toBe(true);
    expect(hasFeature("free", "strategy_simulator")).toBe(true);
  });

  it("free tier does not have access to starter features", () => {
    expect(hasFeature("free", "ai_chat")).toBe(false);
    expect(hasFeature("free", "backtester_basic")).toBe(false);
    expect(hasFeature("free", "regime_detail")).toBe(false);
    expect(hasFeature("free", "technical_signals")).toBe(false);
  });

  it("free tier does not have access to pro features", () => {
    expect(hasFeature("free", "terminal")).toBe(false);
    expect(hasFeature("free", "ai_analysis")).toBe(false);
    expect(hasFeature("free", "scanner")).toBe(false);
    expect(hasFeature("free", "dark_pool")).toBe(false);
  });

  it("free tier does not have access to enterprise features", () => {
    expect(hasFeature("free", "automation")).toBe(false);
  });

  // ── Starter tier ──

  it("starter tier has access to free and starter features", () => {
    expect(hasFeature("starter", "regime_dashboard")).toBe(true);
    expect(hasFeature("starter", "ai_chat")).toBe(true);
    expect(hasFeature("starter", "backtester_basic")).toBe(true);
    expect(hasFeature("starter", "regime_detail")).toBe(true);
    expect(hasFeature("starter", "notifications_all")).toBe(true);
    expect(hasFeature("starter", "technical_signals")).toBe(true);
    expect(hasFeature("starter", "csv_upload")).toBe(true);
    expect(hasFeature("starter", "social_sentiment")).toBe(true);
    expect(hasFeature("starter", "market_activity")).toBe(true);
  });

  it("starter tier does not have access to pro features", () => {
    expect(hasFeature("starter", "terminal")).toBe(false);
    expect(hasFeature("starter", "ai_analysis")).toBe(false);
    expect(hasFeature("starter", "scanner")).toBe(false);
    expect(hasFeature("starter", "dark_pool")).toBe(false);
    expect(hasFeature("starter", "backtester_full")).toBe(false);
    expect(hasFeature("starter", "charts_advanced")).toBe(false);
    expect(hasFeature("starter", "regime_ai")).toBe(false);
    expect(hasFeature("starter", "snaptrade")).toBe(false);
  });

  // ── Pro tier ──

  it("pro tier has access to all features except enterprise-only", () => {
    const proFeatures: Feature[] = [
      "regime_dashboard",
      "macro_dashboard",
      "terminal",
      "ai_analysis",
      "ai_chat",
      "scanner",
      "dark_pool",
      "alerts",
      "watchlists_unlimited",
      "backtester_basic",
      "backtester_full",
      "charts_advanced",
      "regime_detail",
      "regime_ai",
      "notifications_all",
      "strategy_simulator",
      "technical_signals",
      "csv_upload",
      "snaptrade",
      "social_sentiment",
      "market_activity",
    ];
    for (const feature of proFeatures) {
      expect(hasFeature("pro", feature)).toBe(true);
    }
  });

  it("pro tier does not have enterprise-only features", () => {
    expect(hasFeature("pro", "automation")).toBe(false);
  });

  // ── Enterprise tier ──

  it("enterprise tier has access to all features", () => {
    const allFeatures: Feature[] = [
      "regime_dashboard",
      "macro_dashboard",
      "terminal",
      "ai_analysis",
      "ai_chat",
      "scanner",
      "dark_pool",
      "alerts",
      "watchlists_unlimited",
      "backtester_basic",
      "backtester_full",
      "automation",
      "charts_advanced",
      "regime_detail",
      "regime_ai",
      "notifications_all",
      "strategy_simulator",
      "technical_signals",
      "csv_upload",
      "snaptrade",
      "social_sentiment",
      "market_activity",
    ];
    for (const feature of allFeatures) {
      expect(hasFeature("enterprise", feature)).toBe(true);
    }
  });

  // ── Undefined tier (treated as free) ──

  it("undefined tier is treated as free tier", () => {
    expect(hasFeature(undefined, "regime_dashboard")).toBe(true);
    expect(hasFeature(undefined, "strategy_simulator")).toBe(true);
    expect(hasFeature(undefined, "ai_chat")).toBe(false);
    expect(hasFeature(undefined, "terminal")).toBe(false);
    expect(hasFeature(undefined, "automation")).toBe(false);
  });
});

describe("getRequiredTier", () => {
  it("returns free for universally available features", () => {
    expect(getRequiredTier("regime_dashboard")).toBe("free");
    expect(getRequiredTier("macro_dashboard")).toBe("free");
    expect(getRequiredTier("strategy_simulator")).toBe("free");
  });

  it("returns starter for starter-gated features", () => {
    expect(getRequiredTier("ai_chat")).toBe("starter");
    expect(getRequiredTier("backtester_basic")).toBe("starter");
    expect(getRequiredTier("regime_detail")).toBe("starter");
    expect(getRequiredTier("technical_signals")).toBe("starter");
    expect(getRequiredTier("csv_upload")).toBe("starter");
    expect(getRequiredTier("social_sentiment")).toBe("starter");
    expect(getRequiredTier("market_activity")).toBe("starter");
  });

  it("returns pro for pro-gated features", () => {
    expect(getRequiredTier("terminal")).toBe("pro");
    expect(getRequiredTier("ai_analysis")).toBe("pro");
    expect(getRequiredTier("scanner")).toBe("pro");
    expect(getRequiredTier("dark_pool")).toBe("pro");
    expect(getRequiredTier("backtester_full")).toBe("pro");
    expect(getRequiredTier("charts_advanced")).toBe("pro");
    expect(getRequiredTier("regime_ai")).toBe("pro");
    expect(getRequiredTier("snaptrade")).toBe("pro");
  });

  it("returns enterprise for enterprise-only features", () => {
    expect(getRequiredTier("automation")).toBe("enterprise");
  });
});

describe("maxWatchlistTickers", () => {
  it("free tier gets 10 tickers", () => {
    expect(maxWatchlistTickers("free")).toBe(10);
  });

  it("undefined tier gets 10 tickers", () => {
    expect(maxWatchlistTickers(undefined)).toBe(10);
  });

  it("starter tier gets 50 tickers", () => {
    expect(maxWatchlistTickers("starter")).toBe(50);
  });

  it("pro tier gets 500 tickers", () => {
    expect(maxWatchlistTickers("pro")).toBe(500);
  });

  it("enterprise tier gets 500 tickers", () => {
    expect(maxWatchlistTickers("enterprise")).toBe(500);
  });
});

describe("maxWatchlists", () => {
  it("free tier gets 1 watchlist", () => {
    expect(maxWatchlists("free")).toBe(1);
  });

  it("undefined tier gets 1 watchlist", () => {
    expect(maxWatchlists(undefined)).toBe(1);
  });

  it("starter tier gets 5 watchlists", () => {
    expect(maxWatchlists("starter")).toBe(5);
  });

  it("pro tier gets 50 watchlists", () => {
    expect(maxWatchlists("pro")).toBe(50);
  });

  it("enterprise tier gets 50 watchlists", () => {
    expect(maxWatchlists("enterprise")).toBe(50);
  });
});
