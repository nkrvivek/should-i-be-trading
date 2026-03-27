import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  executeStrategy,
  getExecutionCooldownRemaining,
} from "../../src/lib/execution/executionEngine";
import type { ExecutionPlan, ExecutionLeg } from "../../src/lib/execution/types";
import type { BrokerOrder } from "../../src/lib/brokers/types";

function makePlan(legs: ExecutionLeg[]): ExecutionPlan {
  return {
    strategyName: "Test Strategy",
    symbol: "AAPL",
    currentPrice: 150,
    connectionId: "conn-1",
    brokerName: "test-broker",
    legs,
    estimatedCost: 1000,
    maxProfit: "$500",
    maxLoss: "$300",
    breakeven: "$153",
  };
}

function makeLeg(overrides: Partial<ExecutionLeg> = {}): ExecutionLeg {
  return {
    action: "buy",
    type: "stock",
    qty: 100,
    strike: 150,
    premium: 0,
    estimatedPrice: 150,
    status: "pending",
    ...overrides,
  };
}

function mockOrder(id: string): BrokerOrder {
  return {
    id,
    symbol: "AAPL",
    side: "buy",
    type: "limit",
    qty: 100,
    status: "filled",
    createdAt: "2026-03-27T12:00:00Z",
  };
}

let testCounter = 0;

beforeEach(() => {
  vi.useFakeTimers();
  // Each test gets a unique time window far apart so cooldown never leaks.
  // Each test starts 5 minutes apart from the previous one (well past 30s cooldown).
  const baseTime = new Date("2026-03-27T12:00:00Z").getTime() + testCounter * 300_000;
  vi.setSystemTime(new Date(baseTime));
  testCounter++;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getExecutionCooldownRemaining", () => {
  it("returns 0 when no execution has occurred recently", () => {
    expect(getExecutionCooldownRemaining()).toBe(0);
  });
});

describe("executeStrategy — success", () => {
  it("single leg success", async () => {
    const placeOrder = vi.fn().mockResolvedValue(mockOrder("order-1"));
    const onProgress = vi.fn();
    const plan = makePlan([makeLeg()]);

    const result = await executeStrategy(plan, placeOrder, onProgress);

    expect(result.success).toBe(true);
    expect(result.totalFilled).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(result.partialExecution).toBe(false);
  });

  it("two-leg success", async () => {
    const placeOrder = vi.fn()
      .mockResolvedValueOnce(mockOrder("order-1"))
      .mockResolvedValueOnce(mockOrder("order-2"));
    const onProgress = vi.fn();
    const plan = makePlan([
      makeLeg({ action: "buy", type: "stock" }),
      makeLeg({ action: "sell", type: "call", strike: 160, premium: 3 }),
    ]);

    const result = await executeStrategy(plan, placeOrder, onProgress);

    expect(result.success).toBe(true);
    expect(result.totalFilled).toBe(2);
    expect(result.partialExecution).toBe(false);
  });

  it("onProgress called with placing then filled", async () => {
    const placeOrder = vi.fn().mockResolvedValue(mockOrder("order-1"));
    const onProgress = vi.fn();
    const plan = makePlan([makeLeg()]);

    await executeStrategy(plan, placeOrder, onProgress);

    expect(onProgress).toHaveBeenCalledWith(0, "placing");
    expect(onProgress).toHaveBeenCalledWith(0, "filled", "order-1");
  });

  it("returns orderId from mock", async () => {
    const placeOrder = vi.fn().mockResolvedValue(mockOrder("order-xyz"));
    const onProgress = vi.fn();
    const plan = makePlan([makeLeg()]);

    const result = await executeStrategy(plan, placeOrder, onProgress);

    expect(result.legs[0].orderId).toBe("order-xyz");
  });
});

describe("executeStrategy — failure", () => {
  it("first leg fails, second is cancelled", async () => {
    const placeOrder = vi.fn().mockRejectedValue(new Error("Broker rejected"));
    const onProgress = vi.fn();
    const plan = makePlan([
      makeLeg({ action: "buy", type: "stock" }),
      makeLeg({ action: "sell", type: "call", strike: 160, premium: 3 }),
    ]);

    const result = await executeStrategy(plan, placeOrder, onProgress);

    expect(result.success).toBe(false);
    expect(result.legs[0].status).toBe("failed");
    expect(result.legs[1].status).toBe("cancelled");
    expect(result.totalFailed).toBe(1);
  });

  it("partialExecution=true when first fills but second fails", async () => {
    const placeOrder = vi.fn()
      .mockResolvedValueOnce(mockOrder("order-1"))
      .mockRejectedValueOnce(new Error("Failed"));
    const onProgress = vi.fn();
    const plan = makePlan([
      makeLeg({ action: "buy", type: "stock" }),
      makeLeg({ action: "sell", type: "call", strike: 160, premium: 3 }),
    ]);

    const result = await executeStrategy(plan, placeOrder, onProgress);

    expect(result.partialExecution).toBe(true);
    expect(result.totalFilled).toBe(1);
    expect(result.totalFailed).toBe(1);
    expect(result.success).toBe(false);
  });
});

describe("executeStrategy — cooldown", () => {
  it("returns cooldown error if called within 30s of last execution", async () => {
    const placeOrder = vi.fn().mockResolvedValue(mockOrder("order-1"));
    const onProgress = vi.fn();
    const plan = makePlan([makeLeg()]);

    // First execution succeeds
    await executeStrategy(plan, placeOrder, onProgress);

    // Try again immediately — should be on cooldown
    const onProgress2 = vi.fn();
    const result2 = await executeStrategy(plan, placeOrder, onProgress2);

    expect(result2.success).toBe(false);
    expect(result2.totalFailed).toBe(plan.legs.length);
    expect(result2.legs[0].status).toBe("failed");
    expect(result2.legs[0].error).toContain("Cooldown");
  });

  it("works again after 31 seconds", async () => {
    const placeOrder = vi.fn().mockResolvedValue(mockOrder("order-1"));
    const onProgress = vi.fn();
    const plan = makePlan([makeLeg()]);

    // First execution
    await executeStrategy(plan, placeOrder, onProgress);

    // Advance past cooldown
    vi.advanceTimersByTime(31_000);

    // Second execution should work
    const onProgress2 = vi.fn();
    const result2 = await executeStrategy(plan, placeOrder, onProgress2);

    expect(result2.success).toBe(true);
    expect(result2.totalFilled).toBe(1);
  });
});
