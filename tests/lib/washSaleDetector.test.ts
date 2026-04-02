import { describe, it, expect } from "vitest";
import { detectWashSales } from "../../src/lib/strategy/washSaleDetector";
import type { BrokerOrder } from "../../src/lib/brokers/types";

function makeOrder(overrides: Partial<BrokerOrder> = {}): BrokerOrder {
  return {
    id: "ord-1",
    symbol: "AAPL",
    side: "buy",
    type: "market",
    qty: 100,
    status: "filled",
    filledQty: 100,
    filledAvgPrice: 150,
    createdAt: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("detectWashSales", () => {
  it("returns empty array for empty orders", () => {
    expect(detectWashSales([])).toEqual([]);
  });

  it("returns no violations with unrelated trades (different symbols)", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-01-10T10:00:00Z", filledAvgPrice: 160 }), // profit, not a loss
      makeOrder({ id: "3", symbol: "MSFT", side: "buy", createdAt: "2026-01-05T10:00:00Z", filledAvgPrice: 300 }),
      makeOrder({ id: "4", symbol: "MSFT", side: "sell", createdAt: "2026-01-20T10:00:00Z", filledAvgPrice: 310 }), // profit
    ];
    expect(detectWashSales(trades)).toEqual([]);
  });

  it("returns no violations when sell is at a profit", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 100 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-01-10T10:00:00Z", filledAvgPrice: 120 }),
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-01-15T10:00:00Z", filledAvgPrice: 110 }),
    ];
    expect(detectWashSales(trades)).toEqual([]);
  });

  it("detects wash sale when same symbol repurchased within 30 days", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-01-10T10:00:00Z", filledAvgPrice: 130 }), // loss
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-01-20T10:00:00Z", filledAvgPrice: 135 }), // repurchase 10 days later
    ];
    const violations = detectWashSales(trades);
    expect(violations.length).toBe(1);
    expect(violations[0].symbol).toBe("AAPL");
    expect(violations[0].daysApart).toBe(10);
    expect(violations[0].lossAmount).toBeGreaterThan(0);
  });

  it("boundary: exactly 30 days apart is a violation (daysDiff === 30)", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-02-01T10:00:00Z", filledAvgPrice: 130 }), // loss
      // Repurchase exactly 30 days after sell
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-03-03T10:00:00Z", filledAvgPrice: 135 }),
    ];
    const violations = detectWashSales(trades);
    expect(violations.length).toBe(1);
    expect(violations[0].daysApart).toBe(30);
  });

  it("boundary: 31 days apart is NOT a violation", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-02-01T10:00:00Z", filledAvgPrice: 130 }), // loss
      // Repurchase 31 days after sell
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-03-04T10:00:00Z", filledAvgPrice: 135 }),
    ];
    const violations = detectWashSales(trades);
    expect(violations.length).toBe(0);
  });

  it("detects violation with 29 days apart", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-02-01T10:00:00Z", filledAvgPrice: 130 }), // loss
      // Repurchase 29 days after sell
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-03-02T10:00:00Z", filledAvgPrice: 135 }),
    ];
    const violations = detectWashSales(trades);
    expect(violations.length).toBe(1);
    expect(violations[0].daysApart).toBe(29);
  });

  it("handles multiple violations for same symbol", () => {
    const trades: BrokerOrder[] = [
      // First buy/sell-at-loss/repurchase cycle
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150 }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-01-10T10:00:00Z", filledAvgPrice: 130 }), // loss
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-01-15T10:00:00Z", filledAvgPrice: 135 }), // repurchase
      // Second sell-at-loss/repurchase cycle
      makeOrder({ id: "4", symbol: "AAPL", side: "sell", createdAt: "2026-02-15T10:00:00Z", filledAvgPrice: 120 }), // loss (cost basis from buy #3)
      makeOrder({ id: "5", symbol: "AAPL", side: "buy", createdAt: "2026-02-20T10:00:00Z", filledAvgPrice: 125 }), // repurchase
    ];
    const violations = detectWashSales(trades);
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });

  it("skips non-filled orders", () => {
    const trades: BrokerOrder[] = [
      makeOrder({ id: "1", symbol: "AAPL", side: "buy", createdAt: "2026-01-01T10:00:00Z", filledAvgPrice: 150, status: "filled" }),
      makeOrder({ id: "2", symbol: "AAPL", side: "sell", createdAt: "2026-01-10T10:00:00Z", filledAvgPrice: 130, status: "filled" }),
      makeOrder({ id: "3", symbol: "AAPL", side: "buy", createdAt: "2026-01-15T10:00:00Z", filledAvgPrice: 135, status: "cancelled" }), // not filled
    ];
    const violations = detectWashSales(trades);
    expect(violations.length).toBe(0);
  });
});
