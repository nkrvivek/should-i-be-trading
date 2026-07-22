import { describe, it, expect } from "vitest";
import {
  FREE_PAPER_DAILY_ACTIONS,
  FREE_PAPER_TICKER_ALLOWLIST,
  isFreeTier,
  checkPaperActionBudget,
  isPaperTickerAllowed,
} from "../../src/lib/paperLimits";

describe("isFreeTier", () => {
  it("treats 'free' as free", () => {
    expect(isFreeTier("free")).toBe(true);
  });

  it("treats undefined as free", () => {
    expect(isFreeTier(undefined)).toBe(true);
  });

  it("does not treat starter/pro/copilot/enterprise as free", () => {
    expect(isFreeTier("starter")).toBe(false);
    expect(isFreeTier("pro")).toBe(false);
    expect(isFreeTier("copilot")).toBe(false);
    expect(isFreeTier("enterprise")).toBe(false);
  });
});

describe("checkPaperActionBudget", () => {
  it("allows a free-tier user under the daily cap", () => {
    const result = checkPaperActionBudget(5, "free");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(FREE_PAPER_DAILY_ACTIONS);
    expect(result.remaining).toBe(FREE_PAPER_DAILY_ACTIONS - 5);
  });

  it("denies a free-tier user at the daily cap", () => {
    const result = checkPaperActionBudget(FREE_PAPER_DAILY_ACTIONS, "free");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("denies a free-tier user over the daily cap", () => {
    const result = checkPaperActionBudget(FREE_PAPER_DAILY_ACTIONS + 3, "free");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("treats undefined tier as free for budget purposes", () => {
    const result = checkPaperActionBudget(FREE_PAPER_DAILY_ACTIONS, undefined);
    expect(result.allowed).toBe(false);
  });

  it("gives paid tiers an unlimited (null) budget regardless of count", () => {
    for (const tier of ["starter", "pro", "copilot", "enterprise"] as const) {
      const result = checkPaperActionBudget(10_000, tier);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
    }
  });
});

describe("isPaperTickerAllowed", () => {
  it("allows every ticker in the allowlist for the free tier", () => {
    for (const ticker of FREE_PAPER_TICKER_ALLOWLIST) {
      expect(isPaperTickerAllowed(ticker, "free")).toBe(true);
    }
  });

  it("is case-insensitive", () => {
    expect(isPaperTickerAllowed("aapl", "free")).toBe(true);
    expect(isPaperTickerAllowed("Spy", "free")).toBe(true);
  });

  it("rejects a ticker not on the allowlist for the free tier", () => {
    expect(isPaperTickerAllowed("GME", "free")).toBe(false);
    expect(isPaperTickerAllowed("COIN", "free")).toBe(false);
  });

  it("treats undefined tier as free for the allowlist check", () => {
    expect(isPaperTickerAllowed("GME", undefined)).toBe(false);
    expect(isPaperTickerAllowed("AAPL", undefined)).toBe(true);
  });

  it("allows any ticker for paid tiers", () => {
    for (const tier of ["starter", "pro", "copilot", "enterprise"] as const) {
      expect(isPaperTickerAllowed("GME", tier)).toBe(true);
    }
  });

  it("the allowlist has exactly the 20 contracted names", () => {
    expect(FREE_PAPER_TICKER_ALLOWLIST).toHaveLength(20);
    expect([...FREE_PAPER_TICKER_ALLOWLIST]).toEqual([
      "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "SPY", "QQQ", "AMD",
      "INTC", "BAC", "WFC", "KO", "PFE", "F", "T", "VZ", "PLTR", "SOFI",
    ]);
  });
});
