import { describe, it, expect } from "vitest";
import {
  STARTING_CASH_USD,
  buildDefaultPaperAccountRow,
  STARTER_PORTFOLIO_SHARES,
  STARTER_PORTFOLIO_TICKERS,
  STARTER_PORTFOLIO_FALLBACK_PRICES,
  buildStarterPositionRows,
  isAlreadyProvisioned,
} from "../../src/lib/paperAccountDefaults";

describe("buildDefaultPaperAccountRow", () => {
  it("stamps the given user id onto the row", () => {
    const row = buildDefaultPaperAccountRow("user-123");
    expect(row.user_id).toBe("user-123");
  });

  it("sets cash_usd equal to starting_cash_usd at $100,000", () => {
    const row = buildDefaultPaperAccountRow("user-123");
    expect(row.starting_cash_usd).toBe(100_000);
    expect(row.cash_usd).toBe(100_000);
    expect(row.starting_cash_usd).toBe(STARTING_CASH_USD);
  });

  it("produces a fresh object on every call", () => {
    const a = buildDefaultPaperAccountRow("user-1");
    const b = buildDefaultPaperAccountRow("user-2");
    expect(a).not.toBe(b);
    expect(a.user_id).toBe("user-1");
    expect(b.user_id).toBe("user-2");
  });
});

describe("buildStarterPositionRows", () => {
  it("seeds 100 shares each of AAPL, SPY, and F", () => {
    const rows = buildStarterPositionRows("user-123", {});
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.symbol).sort()).toEqual([...STARTER_PORTFOLIO_TICKERS].sort());
    for (const row of rows) {
      expect(row.qty).toBe(STARTER_PORTFOLIO_SHARES);
      expect(row.user_id).toBe("user-123");
    }
  });

  it("uses a live quote price when provided", () => {
    const rows = buildStarterPositionRows("user-123", { AAPL: 201.5 });
    const aapl = rows.find((r) => r.symbol === "AAPL");
    expect(aapl?.avg_price).toBe(201.5);
  });

  it("falls back to the fixed reference price when no live quote is given", () => {
    const rows = buildStarterPositionRows("user-123", {});
    const aapl = rows.find((r) => r.symbol === "AAPL");
    const spy = rows.find((r) => r.symbol === "SPY");
    const f = rows.find((r) => r.symbol === "F");
    expect(aapl?.avg_price).toBe(STARTER_PORTFOLIO_FALLBACK_PRICES.AAPL);
    expect(spy?.avg_price).toBe(STARTER_PORTFOLIO_FALLBACK_PRICES.SPY);
    expect(f?.avg_price).toBe(STARTER_PORTFOLIO_FALLBACK_PRICES.F);
  });

  it("mixes live quotes and fallbacks independently per ticker", () => {
    const rows = buildStarterPositionRows("user-123", { SPY: 561.2 });
    expect(rows.find((r) => r.symbol === "SPY")?.avg_price).toBe(561.2);
    expect(rows.find((r) => r.symbol === "AAPL")?.avg_price).toBe(STARTER_PORTFOLIO_FALLBACK_PRICES.AAPL);
  });
});

describe("isAlreadyProvisioned", () => {
  it("returns false for null or undefined (not yet provisioned)", () => {
    expect(isAlreadyProvisioned(null)).toBe(false);
    expect(isAlreadyProvisioned(undefined)).toBe(false);
  });

  it("returns true for an existing account row", () => {
    expect(isAlreadyProvisioned({ user_id: "user-123", cash_usd: 87_000 })).toBe(true);
  });

  it("returns true even for a falsy-looking but non-null row shape", () => {
    expect(isAlreadyProvisioned({})).toBe(true);
  });
});
