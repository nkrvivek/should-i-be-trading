import { describe, it, expect } from "vitest";
import { analyzePositions } from "../../src/lib/portfolio/strategyAnalyzer";
import type { BrokerPosition } from "../../src/lib/brokers/types";
import type { ManualPosition } from "../../src/lib/strategy/types";

function makeBrokerPosition(overrides: Partial<BrokerPosition> = {}): BrokerPosition {
  return {
    symbol: "AAPL",
    qty: 200,
    side: "long",
    avgEntryPrice: 150,
    currentPrice: 155,
    marketValue: 31000,
    unrealizedPL: 1000,
    unrealizedPLPercent: 3.33,
    assetType: "stock",
    ...overrides,
  };
}

function makeManualPosition(overrides: Partial<ManualPosition> = {}): ManualPosition {
  return {
    id: "manual-1",
    symbol: "AAPL",
    qty: 1,
    side: "long",
    avgEntryPrice: 5,
    currentPrice: 155,
    marketValue: 500,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    assetType: "option",
    importedAt: "2026-03-27",
    source: "manual",
    ...overrides,
  };
}

describe("analyzePositions", () => {
  it("long stock 200 shares returns 4 suggestions sorted by riskScore", () => {
    const positions = [makeBrokerPosition({ qty: 200 })];
    const results = analyzePositions(positions);

    expect(results).toHaveLength(1);
    const suggestions = results[0].suggestions;
    expect(suggestions).toHaveLength(4);

    const names = suggestions.map((s) => s.strategyName);
    expect(names).toContain("Covered Call");
    expect(names).toContain("Collar");
    expect(names).toContain("Protective Put");
    expect(names).toContain("Bull Call Spread");

    // Verify sorted by riskScore ascending
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].riskScore).toBeGreaterThanOrEqual(suggestions[i - 1].riskScore);
    }
  });

  it("long stock 50 shares returns 1 suggestion (Protective Put) with 100-share warning", () => {
    const positions = [makeBrokerPosition({ qty: 50 })];
    const results = analyzePositions(positions);

    expect(results).toHaveLength(1);
    expect(results[0].suggestions).toHaveLength(1);
    expect(results[0].suggestions[0].strategyName).toBe("Protective Put");
    expect(results[0].warnings.some((w) => w.includes("100 shares"))).toBe(true);
  });

  it("short stock returns Protective Call suggestion", () => {
    const positions = [makeBrokerPosition({ qty: 100, side: "short" })];
    const results = analyzePositions(positions);

    expect(results).toHaveLength(1);
    expect(results[0].suggestions.length).toBeGreaterThanOrEqual(1);
    expect(results[0].suggestions[0].strategyName).toBe("Protective Call");
  });

  it("long call option returns Bull Call Spread suggestion", () => {
    const positions = [
      makeManualPosition({
        assetType: "option",
        optionType: "call",
        strike: 155,
        qty: 1,
        side: "long",
      }),
    ];
    const results = analyzePositions(positions);

    expect(results).toHaveLength(1);
    expect(results[0].suggestions.length).toBeGreaterThanOrEqual(1);
    expect(results[0].suggestions[0].strategyName).toBe("Bull Call Spread");
  });

  it("long put option returns Bear Put Spread suggestion", () => {
    const positions = [
      makeManualPosition({
        assetType: "option",
        optionType: "put",
        strike: 150,
        qty: 1,
        side: "long",
      }),
    ];
    const results = analyzePositions(positions);

    expect(results).toHaveLength(1);
    expect(results[0].suggestions.length).toBeGreaterThanOrEqual(1);
    expect(results[0].suggestions[0].strategyName).toBe("Bear Put Spread");
  });

  it("empty positions returns empty array", () => {
    const results = analyzePositions([]);
    expect(results).toEqual([]);
  });

  it("each suggestion has non-empty legs and estimatedMaxProfit/Loss strings", () => {
    const positions = [makeBrokerPosition({ qty: 200 })];
    const results = analyzePositions(positions);

    for (const analysis of results) {
      for (const suggestion of analysis.suggestions) {
        expect(suggestion.legs.length).toBeGreaterThan(0);
        expect(typeof suggestion.estimatedMaxProfit).toBe("string");
        expect(suggestion.estimatedMaxProfit.length).toBeGreaterThan(0);
        expect(typeof suggestion.estimatedMaxLoss).toBe("string");
        expect(suggestion.estimatedMaxLoss.length).toBeGreaterThan(0);
      }
    }
  });
});
