import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runPreExecutionChecks } from "../../src/lib/execution/riskChecks";
import type { BrokerAccount } from "../../src/lib/brokers/types";
import type { ExecutionLeg } from "../../src/lib/execution/types";

function makeAccount(overrides: Partial<BrokerAccount> = {}): BrokerAccount {
  return {
    id: "acct-1",
    broker: "test",
    equity: 50000,
    buyingPower: 25000,
    cash: 25000,
    portfolioValue: 50000,
    isPaperTrading: true,
    ...overrides,
  };
}

function makeLeg(overrides: Partial<ExecutionLeg> = {}): ExecutionLeg {
  return {
    action: "buy",
    type: "stock",
    qty: 100,
    strike: 100,
    premium: 0,
    estimatedPrice: 100,
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Buying Power check", () => {
  it("passes when sufficient buying power", () => {
    // Set to market hours so other checks pass too
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z")); // Tue 11AM ET
    const account = makeAccount({ buyingPower: 10000 });
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(account, legs, 5000);
    const bpCheck = result.checks.find((c) => c.name === "Buying Power");
    expect(bpCheck!.passed).toBe(true);
  });

  it("fails when insufficient buying power", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount({ buyingPower: 1000 });
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(account, legs, 5000);
    const bpCheck = result.checks.find((c) => c.name === "Buying Power");
    expect(bpCheck!.passed).toBe(false);
    expect(bpCheck!.message).toContain("Insufficient");
  });

  it("passes for credit strategy (cost <= 0)", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount({ buyingPower: 0 });
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(account, legs, -500);
    const bpCheck = result.checks.find((c) => c.name === "Buying Power");
    expect(bpCheck!.passed).toBe(true);
    expect(bpCheck!.message).toContain("credit");
  });

  it("fails for null account", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(null, legs, 1000);
    const bpCheck = result.checks.find((c) => c.name === "Buying Power");
    expect(bpCheck!.passed).toBe(false);
    expect(bpCheck!.message).toContain("No account");
  });
});

describe("Market Hours check", () => {
  it("passes during market hours (Tuesday 11AM ET)", () => {
    // Tuesday March 24 2026 at 15:00 UTC = 11:00 AM ET
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(account, legs, 100);
    const mhCheck = result.checks.find((c) => c.name === "Market Hours");
    expect(mhCheck!.passed).toBe(true);
    expect(mhCheck!.message).toContain("open");
  });

  it("fails on weekend", () => {
    // Saturday March 28, 2026 at 15:00 UTC
    vi.setSystemTime(new Date("2026-03-28T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(account, legs, 100);
    const mhCheck = result.checks.find((c) => c.name === "Market Hours");
    expect(mhCheck!.passed).toBe(false);
    expect(mhCheck!.message).toContain("weekend");
  });

  it("fails after 4PM ET with different message for options vs stocks", () => {
    // Tuesday March 24, 2026 at 21:00 UTC = 5:00 PM ET (after close)
    vi.setSystemTime(new Date("2026-03-24T21:00:00Z"));
    const account = makeAccount();

    // With options
    const optionLegs = [makeLeg({ type: "call", premium: 5 })];
    const resultOpt = runPreExecutionChecks(account, optionLegs, 500);
    const mhOpt = resultOpt.checks.find((c) => c.name === "Market Hours");
    expect(mhOpt!.passed).toBe(false);
    expect(mhOpt!.message).toContain("options");

    // Stocks only
    const stockLegs = [makeLeg({ type: "stock" })];
    const resultStock = runPreExecutionChecks(account, stockLegs, 100);
    const mhStock = resultStock.checks.find((c) => c.name === "Market Hours");
    expect(mhStock!.passed).toBe(false);
    expect(mhStock!.message).toContain("extended hours");
  });
});

describe("Undefined Risk check", () => {
  it("naked short call fails", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg({ action: "sell", type: "call", qty: 1, strike: 110, premium: 3 })];
    const result = runPreExecutionChecks(account, legs, -300);
    const riskCheck = result.checks.find((c) => c.name === "Undefined Risk");
    expect(riskCheck!.passed).toBe(false);
    expect(riskCheck!.message).toContain("NAKED SHORT CALL");
  });

  it("naked short put passes with warning", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg({ action: "sell", type: "put", qty: 1, strike: 90, premium: 3 })];
    const result = runPreExecutionChecks(account, legs, -300);
    const riskCheck = result.checks.find((c) => c.name === "Undefined Risk");
    expect(riskCheck!.passed).toBe(true);
    expect(riskCheck!.message).toContain("Short put");
  });

  it("covered call (buy stock + sell call) passes", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [
      makeLeg({ action: "buy", type: "stock", qty: 100 }),
      makeLeg({ action: "sell", type: "call", qty: 1, strike: 110, premium: 3 }),
    ];
    const result = runPreExecutionChecks(account, legs, 9700);
    const riskCheck = result.checks.find((c) => c.name === "Undefined Risk");
    expect(riskCheck!.passed).toBe(true);
    expect(riskCheck!.message).toContain("defined");
  });

  it("defined spread passes", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [
      makeLeg({ action: "buy", type: "call", qty: 1, strike: 100, premium: 5 }),
      makeLeg({ action: "sell", type: "call", qty: 1, strike: 110, premium: 2 }),
    ];
    const result = runPreExecutionChecks(account, legs, 300);
    const riskCheck = result.checks.find((c) => c.name === "Undefined Risk");
    expect(riskCheck!.passed).toBe(true);
  });
});

describe("Expiration check", () => {
  it("passes for option legs with DTE message", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg({ type: "call", premium: 5, strike: 100 })];
    const result = runPreExecutionChecks(account, legs, 500);
    const expCheck = result.checks.find((c) => c.name === "Expiration");
    expect(expCheck!.passed).toBe(true);
    expect(expCheck!.message).toContain("DTE");
  });

  it("passes for stock-only with 'No options' message", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg({ type: "stock" })];
    const result = runPreExecutionChecks(account, legs, 10000);
    const expCheck = result.checks.find((c) => c.name === "Expiration");
    expect(expCheck!.passed).toBe(true);
    expect(expCheck!.message).toContain("No options");
  });
});

describe("Combined checks", () => {
  it("overall passed is false if ANY check fails", () => {
    // Weekend + null account = multiple failures
    vi.setSystemTime(new Date("2026-03-28T15:00:00Z"));
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(null, legs, 1000);
    expect(result.passed).toBe(false);
  });

  it("always returns exactly 4 checks", () => {
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const account = makeAccount();
    const legs = [makeLeg()];
    const result = runPreExecutionChecks(account, legs, 100);
    expect(result.checks).toHaveLength(4);
  });
});
