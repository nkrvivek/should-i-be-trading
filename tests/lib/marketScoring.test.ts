import { describe, it, expect } from "vitest";
import { computeMarketScore } from "../../src/lib/marketScoring";
import type { MarketInputs } from "../../src/lib/marketScoring";

function makeInputs(overrides: Partial<MarketInputs> = {}): MarketInputs {
  return {
    vix: 18,
    vixPrev: 17,
    spyPrice: 450,
    spySma20: 445,
    spySma50: 440,
    spySma200: 420,
    spyRsi14: 55,
    spyChange: 0.5,
    sectorChanges: [
      { symbol: "XLK", change: 1.2 },
      { symbol: "XLF", change: 0.8 },
      { symbol: "XLE", change: -0.3 },
      { symbol: "XLV", change: 0.5 },
      { symbol: "XLI", change: 0.6 },
      { symbol: "XLC", change: 0.9 },
      { symbol: "XLY", change: -0.1 },
      { symbol: "XLP", change: 0.2 },
      { symbol: "XLRE", change: -0.5 },
      { symbol: "XLU", change: 0.1 },
      { symbol: "XLB", change: 0.4 },
    ],
    tenYearYield: 4.2,
    tenYearYieldPrev: 4.15,
    marketOpen: true,
  };
}

describe("computeMarketScore", () => {
  it("returns a score object with all required fields", () => {
    const result = computeMarketScore(makeInputs());
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("signal");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("executionWindow");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("timestamp");
  });

  it("total score is between 0 and 100", () => {
    const result = computeMarketScore(makeInputs());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("signal is one of YES, CAUTION, NO", () => {
    const result = computeMarketScore(makeInputs());
    expect(["YES", "CAUTION", "NO"]).toContain(result.signal);
  });

  it("returns exactly 5 categories", () => {
    const result = computeMarketScore(makeInputs());
    expect(result.categories).toHaveLength(5);
    const names = result.categories.map((c) => c.name);
    expect(names).toContain("Volatility");
    expect(names).toContain("Momentum");
    expect(names).toContain("Trend");
    expect(names).toContain("Breadth");
    expect(names).toContain("Macro");
  });

  it("category weights sum to 1.0", () => {
    const result = computeMarketScore(makeInputs());
    const weightSum = result.categories.reduce((sum, c) => sum + c.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 5);
  });

  it("each category score is between 0 and 100", () => {
    const result = computeMarketScore(makeInputs());
    for (const cat of result.categories) {
      expect(cat.score).toBeGreaterThanOrEqual(0);
      expect(cat.score).toBeLessThanOrEqual(100);
    }
  });

  it("executionWindow is between 0 and 100", () => {
    const result = computeMarketScore(makeInputs());
    expect(result.executionWindow).toBeGreaterThanOrEqual(0);
    expect(result.executionWindow).toBeLessThanOrEqual(100);
  });

  it("produces valid score with missing inputs (degraded)", () => {
    const result = computeMarketScore({ marketOpen: true });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(["YES", "CAUTION", "NO"]).toContain(result.signal);
    expect(result.categories).toHaveLength(5);
  });

  it("all inputs missing produces a valid score", () => {
    const result = computeMarketScore({});
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    // With no marketOpen, signal should be NO
    expect(result.signal).toBe("NO");
    expect(result.categories).toHaveLength(5);
  });

  it("extreme VIX of 5 produces high volatility score", () => {
    const inputs: MarketInputs = { vix: 5, vixPrev: 6, marketOpen: true };
    const result = computeMarketScore(inputs);
    const volCat = result.categories.find((c) => c.name === "Volatility")!;
    expect(volCat).toBeDefined();
    expect(volCat.score).toBeGreaterThanOrEqual(90);
  });

  it("extreme VIX of 80 produces very low volatility score", () => {
    const inputs: MarketInputs = { vix: 80, vixPrev: 70, marketOpen: true };
    const result = computeMarketScore(inputs);
    const volCat = result.categories.find((c) => c.name === "Volatility")!;
    expect(volCat).toBeDefined();
    expect(volCat.score).toBeLessThanOrEqual(15);
  });

  it("signal is NO when market is closed", () => {
    const inputs: MarketInputs = { marketOpen: false, vix: 15 };
    const result = computeMarketScore(inputs);
    expect(result.signal).toBe("NO");
  });

  it("bullish inputs produce high score with YES signal", () => {
    const result = computeMarketScore({
      vix: 12,
      vixPrev: 13,
      spyPrice: 500,
      spySma20: 495,
      spySma50: 490,
      spySma200: 460,
      spyRsi14: 58,
      spyChange: 1.5,
      sectorChanges: [
        { symbol: "XLK", change: 2.0 },
        { symbol: "XLF", change: 1.5 },
        { symbol: "XLE", change: 1.0 },
        { symbol: "XLV", change: 1.2 },
        { symbol: "XLI", change: 0.8 },
        { symbol: "XLC", change: 1.1 },
        { symbol: "XLY", change: 0.9 },
        { symbol: "XLP", change: 0.5 },
        { symbol: "XLRE", change: 0.3 },
        { symbol: "XLU", change: 0.4 },
        { symbol: "XLB", change: 0.7 },
      ],
      tenYearYield: 3.2,
      tenYearYieldPrev: 3.3,
      marketOpen: true,
    });
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.signal).toBe("YES");
  });

  it("bearish inputs produce low score with NO signal", () => {
    const result = computeMarketScore({
      vix: 40,
      vixPrev: 30,
      spyPrice: 380,
      spySma20: 400,
      spySma50: 420,
      spySma200: 450,
      spyRsi14: 25,
      spyChange: -2.5,
      sectorChanges: [
        { symbol: "XLK", change: -3.0 },
        { symbol: "XLF", change: -2.5 },
        { symbol: "XLE", change: -2.0 },
        { symbol: "XLV", change: -1.5 },
        { symbol: "XLI", change: -1.8 },
        { symbol: "XLC", change: -2.2 },
        { symbol: "XLY", change: -1.9 },
        { symbol: "XLP", change: -0.5 },
        { symbol: "XLRE", change: -1.2 },
        { symbol: "XLU", change: -0.8 },
        { symbol: "XLB", change: -1.5 },
      ],
      tenYearYield: 5.2,
      tenYearYieldPrev: 5.0,
      marketOpen: true,
    });
    expect(result.total).toBeLessThan(60);
    expect(result.signal).toBe("NO");
  });

  it("summary is a non-empty string", () => {
    const result = computeMarketScore(makeInputs());
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("timestamp is a recent epoch", () => {
    const before = Date.now();
    const result = computeMarketScore(makeInputs());
    const after = Date.now();
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });
});
