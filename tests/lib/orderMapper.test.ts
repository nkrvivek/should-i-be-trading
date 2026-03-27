import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toExecutionLeg,
  mapLegsToOrders,
  mapLegsToExecutionLegs,
} from "../../src/lib/execution/orderMapper";
import type { SimulatorLeg } from "../../src/lib/strategy/payoff";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-27T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toExecutionLeg", () => {
  it("stock leg uses currentPrice as estimatedPrice", () => {
    const leg: SimulatorLeg = {
      action: "buy",
      type: "stock",
      qty: 100,
      strike: 150,
      premium: 0,
    };
    const result = toExecutionLeg(leg, 155);
    expect(result.estimatedPrice).toBe(155);
    expect(result.status).toBe("pending");
  });

  it("option leg uses premium as estimatedPrice", () => {
    const leg: SimulatorLeg = {
      action: "buy",
      type: "call",
      qty: 1,
      strike: 100,
      premium: 5.5,
    };
    const result = toExecutionLeg(leg, 100);
    expect(result.estimatedPrice).toBe(5.5);
    expect(result.status).toBe("pending");
  });
});

describe("mapLegsToOrders", () => {
  it("orders buys before sells", () => {
    const legs: SimulatorLeg[] = [
      { action: "sell", type: "call", qty: 1, strike: 110, premium: 2 },
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    const orders = mapLegsToOrders(legs, "AAPL", 100);
    expect(orders[0].side).toBe("buy");
    expect(orders[1].side).toBe("sell");
  });

  it("stock order has uppercased symbol and limitPrice", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "stock", qty: 100, strike: 150, premium: 0 },
    ];
    const orders = mapLegsToOrders(legs, "aapl", 155.123);
    expect(orders).toHaveLength(1);
    expect(orders[0].symbol).toBe("AAPL");
    expect(orders[0].limitPrice).toBe(155.12);
    expect(orders[0].type).toBe("limit");
    expect(orders[0].timeInForce).toBe("day");
  });

  it("option order has OCC symbol format and optionDetails", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 185, premium: 3 },
    ];
    const orders = mapLegsToOrders(legs, "AAPL", 180);
    expect(orders).toHaveLength(1);

    // March 27 + 30 days = April 26. Day of week: April 26, 2026 is Sunday.
    // daysToFriday = (5 - 0 + 7) % 7 = 5. April 26 + 5 = May 1, 2026 (Friday)
    // OCC: "AAPL  260501C00185000"
    expect(orders[0].symbol).toBe("AAPL  260501C00185000");
    expect(orders[0].limitPrice).toBe(3);
    expect(orders[0].optionDetails).toBeDefined();
    expect(orders[0].optionDetails!.underlying).toBe("AAPL");
    expect(orders[0].optionDetails!.strike).toBe(185);
    expect(orders[0].optionDetails!.expiration).toBe("20260501");
    expect(orders[0].optionDetails!.optionType).toBe("call");
    expect(orders[0].optionDetails!.occSymbol).toBe("AAPL  260501C00185000");
  });

  it("put option uses P in OCC symbol", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "put", qty: 1, strike: 95, premium: 2 },
    ];
    const orders = mapLegsToOrders(legs, "SPY", 100);
    expect(orders[0].symbol).toContain("P");
    expect(orders[0].optionDetails!.optionType).toBe("put");
  });

  it("skips legs with qty=0", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "stock", qty: 0, strike: 100, premium: 0 },
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    const orders = mapLegsToOrders(legs, "AAPL", 100);
    expect(orders).toHaveLength(1);
  });

  it("empty legs returns empty array", () => {
    const orders = mapLegsToOrders([], "AAPL", 100);
    expect(orders).toHaveLength(0);
  });
});

describe("mapLegsToExecutionLegs", () => {
  it("orders buys first", () => {
    const legs: SimulatorLeg[] = [
      { action: "sell", type: "call", qty: 1, strike: 110, premium: 2 },
      { action: "buy", type: "stock", qty: 100, strike: 100, premium: 0 },
    ];
    const result = mapLegsToExecutionLegs(legs, 100);
    expect(result[0].action).toBe("buy");
    expect(result[1].action).toBe("sell");
  });
});
