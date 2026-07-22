import { describe, it, expect } from "vitest";
import { selectFillPrice, computeFillBookkeeping } from "../../src/lib/paperFillEngine";

describe("selectFillPrice", () => {
  it("fills a buy at the ask", () => {
    expect(selectFillPrice("buy", { bid: 100, ask: 101 })).toBe(101);
  });

  it("fills a buy_to_close at the ask", () => {
    expect(selectFillPrice("buy_to_close", { bid: 2, ask: 2.5 })).toBe(2.5);
  });

  it("fills a sell at the bid", () => {
    expect(selectFillPrice("sell", { bid: 100, ask: 101 })).toBe(100);
  });

  it("fills a sell_to_open at the bid", () => {
    expect(selectFillPrice("sell_to_open", { bid: 2, ask: 2.5 })).toBe(2);
  });
});

describe("computeFillBookkeeping", () => {
  it("opens a new long equity position and debits cash at qty * price", () => {
    const result = computeFillBookkeeping({
      cashUsd: 100_000,
      position: null,
      side: "buy",
      qty: 100,
      price: 195,
    });
    expect(result.cashUsd).toBe(100_000 - 100 * 195);
    expect(result.position).toEqual({ qty: 100, avgPrice: 195 });
  });

  it("credits cash on a sell_to_open (covered call) with the option multiplier", () => {
    const result = computeFillBookkeeping({
      cashUsd: 100_000,
      position: null,
      side: "sell_to_open",
      qty: 1,
      price: 2.5,
      multiplier: 100,
    });
    expect(result.cashUsd).toBe(100_000 + 250);
    expect(result.position).toEqual({ qty: -1, avgPrice: 2.5 });
  });

  it("weight-averages avg_price when adding to a long position in the same direction", () => {
    const result = computeFillBookkeeping({
      cashUsd: 50_000,
      position: { qty: 100, avgPrice: 190 },
      side: "buy",
      qty: 100,
      price: 200,
    });
    expect(result.position?.qty).toBe(200);
    expect(result.position?.avgPrice).toBe((100 * 190 + 100 * 200) / 200);
  });

  it("keeps the prior avg_price when a sell partially reduces a long position", () => {
    const result = computeFillBookkeeping({
      cashUsd: 0,
      position: { qty: 100, avgPrice: 190 },
      side: "sell",
      qty: 40,
      price: 210,
    });
    expect(result.position).toEqual({ qty: 60, avgPrice: 190 });
  });

  it("flattens the position (returns null) when a sell fully closes it", () => {
    const result = computeFillBookkeeping({
      cashUsd: 0,
      position: { qty: 100, avgPrice: 190 },
      side: "sell",
      qty: 100,
      price: 210,
    });
    expect(result.position).toBeNull();
    expect(result.cashUsd).toBe(21_000);
  });

  it("a buy_to_close on a short option position keeps avg_price on partial close", () => {
    const result = computeFillBookkeeping({
      cashUsd: 100_000,
      position: { qty: -2, avgPrice: 2.5 },
      side: "buy_to_close",
      qty: 1,
      price: 1.2,
      multiplier: 100,
    });
    expect(result.position).toEqual({ qty: -1, avgPrice: 2.5 });
    expect(result.cashUsd).toBe(100_000 - 120);
  });

  it("throws when a buy-direction fill would drive cash negative (no margin)", () => {
    expect(() =>
      computeFillBookkeeping({ cashUsd: 100, position: null, side: "buy", qty: 10, price: 50 })
    ).toThrow(/insufficient/i);
  });

  it("throws on a non-positive qty", () => {
    expect(() =>
      computeFillBookkeeping({ cashUsd: 100_000, position: null, side: "buy", qty: 0, price: 50 })
    ).toThrow(/qty/i);
  });

  it("throws on a negative price", () => {
    expect(() =>
      computeFillBookkeeping({ cashUsd: 100_000, position: null, side: "buy", qty: 1, price: -1 })
    ).toThrow(/price/i);
  });

  it("does not throw an insufficient-cash error for a sell that credits cash", () => {
    expect(() =>
      computeFillBookkeeping({ cashUsd: 0, position: { qty: 10, avgPrice: 5 }, side: "sell", qty: 10, price: 5 })
    ).not.toThrow();
  });
});
