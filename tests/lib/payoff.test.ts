import { describe, it, expect } from "vitest";
import {
  computePayoffAtExpiry,
  computePayoffCurve,
  computeKeyMetrics,
} from "../../src/lib/strategy/payoff";
import type { SimulatorLeg } from "../../src/lib/strategy/payoff";

describe("computePayoffAtExpiry", () => {
  it("long stock profit", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "stock", qty: 100, strike: 50, premium: 0 },
    ];
    // bought at 50, price is 60 => +100 * (60 - 50) = 1000
    expect(computePayoffAtExpiry(legs, 60)).toBe(1000);
  });

  it("long stock loss", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "stock", qty: 100, strike: 50, premium: 0 },
    ];
    // bought at 50, price is 40 => +100 * (40 - 50) = -1000
    expect(computePayoffAtExpiry(legs, 40)).toBe(-1000);
  });

  it("long call ITM", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    // price=120: intrinsic=20, pnl = (20 - 5) * 1 * 100 = 1500
    expect(computePayoffAtExpiry(legs, 120)).toBe(1500);
  });

  it("long call OTM", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    // price=90: intrinsic=0, pnl = (0 - 5) * 1 * 100 = -500
    expect(computePayoffAtExpiry(legs, 90)).toBe(-500);
  });

  it("long put ITM", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "put", qty: 1, strike: 100, premium: 4 },
    ];
    // price=80: intrinsic=20, pnl = (20 - 4) * 1 * 100 = 1600
    expect(computePayoffAtExpiry(legs, 80)).toBe(1600);
  });

  it("long put OTM", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "put", qty: 1, strike: 100, premium: 4 },
    ];
    // price=110: intrinsic=0, pnl = (0 - 4) * 1 * 100 = -400
    expect(computePayoffAtExpiry(legs, 110)).toBe(-400);
  });

  it("short call (sell call)", () => {
    const legs: SimulatorLeg[] = [
      { action: "sell", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    // price=120: intrinsic=20, pnl = -1 * (20 - 5) * 100 = -1500
    expect(computePayoffAtExpiry(legs, 120)).toBe(-1500);
    // price=90: intrinsic=0, pnl = -1 * (0 - 5) * 100 = 500
    expect(computePayoffAtExpiry(legs, 90)).toBe(500);
  });

  it("short put (sell put)", () => {
    const legs: SimulatorLeg[] = [
      { action: "sell", type: "put", qty: 1, strike: 100, premium: 4 },
    ];
    // price=80: intrinsic=20, pnl = -1 * (20 - 4) * 100 = -1600
    expect(computePayoffAtExpiry(legs, 80)).toBe(-1600);
    // price=110: intrinsic=0, pnl = -1 * (0 - 4) * 100 = 400
    expect(computePayoffAtExpiry(legs, 110)).toBe(400);
  });

  it("bull call spread (2 legs)", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
      { action: "sell", type: "call", qty: 1, strike: 110, premium: 2 },
    ];
    // price=120: buy call = (20-5)*100=1500, sell call = -1*(10-2)*100=-800 => 700
    expect(computePayoffAtExpiry(legs, 120)).toBe(700);
    // price=90: buy call = (0-5)*100=-500, sell call = -1*(0-2)*100=200 => -300
    expect(computePayoffAtExpiry(legs, 90)).toBe(-300);
    // price=105: buy call = (5-5)*100=0, sell call = -1*(0-2)*100=200 => 200
    expect(computePayoffAtExpiry(legs, 105)).toBe(200);
  });
});

describe("computePayoffCurve", () => {
  it("returns 201 points by default (points=200)", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "stock", qty: 1, strike: 100, premium: 0 },
    ];
    const curve = computePayoffCurve(legs, 100);
    expect(curve).toHaveLength(201);
  });

  it("returns empty array for no legs", () => {
    const curve = computePayoffCurve([], 100);
    expect(curve).toHaveLength(0);
  });

  it("returns empty array for price <= 0", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "stock", qty: 1, strike: 100, premium: 0 },
    ];
    expect(computePayoffCurve(legs, 0)).toHaveLength(0);
    expect(computePayoffCurve(legs, -10)).toHaveLength(0);
  });
});

describe("computeKeyMetrics", () => {
  it("long call max loss equals premium * qty * 100", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    const metrics = computeKeyMetrics(legs, 100);
    expect(metrics.maxLoss).toBe(-500);
  });

  it("bull call spread has defined risk", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
      { action: "sell", type: "call", qty: 1, strike: 110, premium: 2 },
    ];
    const metrics = computeKeyMetrics(legs, 100);
    // Max loss = net debit = (5 - 2) * 100 = -300
    expect(metrics.maxLoss).toBe(-300);
    // Max profit = spread width - net debit = (10 - 3) * 100 = 700
    expect(metrics.maxProfit).toBe(700);
  });

  it("detects breakeven points", () => {
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 5 },
    ];
    const metrics = computeKeyMetrics(legs, 100);
    // Breakeven should be near strike + premium = 105
    expect(metrics.breakevens.length).toBeGreaterThanOrEqual(1);
    expect(metrics.breakevens[0]).toBeCloseTo(105, 0);
  });

  it("riskReward is capped at 99", () => {
    // Long stock has unlimited upside (within curve range) and limited downside
    // but with a wide enough range the ratio may not hit 99
    // Use a scenario where maxLoss is near zero
    const legs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty: 1, strike: 100, premium: 0.01 },
    ];
    const metrics = computeKeyMetrics(legs, 100);
    // Premium is $0.01, so max loss = $1, max profit is very large => capped at 99
    expect(metrics.riskReward).toBeLessThanOrEqual(99);
  });

  it("empty legs returns zeros", () => {
    const metrics = computeKeyMetrics([], 100);
    expect(metrics.maxProfit).toBe(0);
    expect(metrics.maxLoss).toBe(0);
    expect(metrics.breakevens).toEqual([]);
    expect(metrics.riskReward).toBe(0);
  });
});
