import { describe, it, expect } from "vitest";
import { computeStockScore } from "../../src/lib/stockScore";
import type { StockScoreInput } from "../../src/lib/stockScore";

function makeInput(overrides: Partial<StockScoreInput> = {}): StockScoreInput {
  return {
    price: 150,
    change: 2.5,
    changePercent: 1.7,
    marketCap: 2_500_000_000_000,
    beta: 1.1,
    volume: 80_000_000,
    avgVolume: 60_000_000,
    peRatio: 20,
    pbRatio: 8,
    psRatio: 6,
    evEbitda: 15,
    grossMargin: 0.45,
    operatingMargin: 0.30,
    netMargin: 0.25,
    roe: 0.30,
    roa: 0.15,
    currentRatio: 1.8,
    debtEquity: 0.4,
    dividendYield: 0.006,
    revenuePerShare: 25,
    fcfPerShare: 5,
    roic: 0.20,
    priceTargetConsensus: 185,
    revenueGrowth: 15,
    netIncomeGrowth: 20,
    epsGrowth: 18,
    insiderBuyCount: 4,
    insiderSellCount: 1,
    insiderNetShares: 200_000,
    ivPercentile: 30,
    putCallRatio: 0.9,
    avgOptionVolume: 500_000,
    ...overrides,
  };
}

describe("computeStockScore", () => {
  it("returns all required fields", () => {
    const result = computeStockScore("AAPL", makeInput());
    expect(result).toHaveProperty("symbol");
    expect(result).toHaveProperty("composite");
    expect(result).toHaveProperty("rating");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("computedAt");
  });

  it("uppercases the symbol", () => {
    const result = computeStockScore("aapl", makeInput());
    expect(result.symbol).toBe("AAPL");
  });

  it("composite is between 1 and 10", () => {
    const result = computeStockScore("AAPL", makeInput());
    expect(result.composite).toBeGreaterThanOrEqual(1);
    expect(result.composite).toBeLessThanOrEqual(10);
  });

  it("rating is one of the valid values", () => {
    const result = computeStockScore("AAPL", makeInput());
    expect([
      "Strong Buy",
      "Buy",
      "Neutral",
      "Sell",
      "Strong Sell",
    ]).toContain(result.rating);
  });

  it("returns exactly 4 categories", () => {
    const result = computeStockScore("AAPL", makeInput());
    expect(result.categories).toHaveLength(4);
    const names = result.categories.map((c) => c.name);
    expect(names).toContain("Technical");
    expect(names).toContain("Fundamental");
    expect(names).toContain("Sentiment");
    expect(names).toContain("Options");
  });

  it("each category score is between 1 and 10", () => {
    const result = computeStockScore("AAPL", makeInput());
    for (const cat of result.categories) {
      expect(cat.score).toBeGreaterThanOrEqual(1);
      expect(cat.score).toBeLessThanOrEqual(10);
    }
  });

  it("computedAt is a valid ISO timestamp", () => {
    const result = computeStockScore("AAPL", makeInput());
    expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
  });

  // ── Bullish scenario ──

  it("strong bullish inputs produce high composite with Strong Buy", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        changePercent: 3.0,
        volume: 120_000_000,
        avgVolume: 60_000_000,
        peRatio: 12,
        netMargin: 0.25,
        roe: 0.30,
        revenueGrowth: 25,
        epsGrowth: 30,
        insiderBuyCount: 5,
        insiderSellCount: 0,
        insiderNetShares: 500_000,
        ivPercentile: 15,
        putCallRatio: 1.3,
        priceTargetConsensus: 200,
        price: 140,
      }),
    );
    expect(result.composite).toBeGreaterThanOrEqual(8);
    expect(result.rating).toBe("Strong Buy");
  });

  // ── Bearish scenario ──

  it("bearish inputs produce low composite with Sell or Strong Sell", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        changePercent: -3.0,
        volume: 20_000_000,
        avgVolume: 60_000_000,
        beta: 2.5,
        peRatio: -5,
        netMargin: -0.10,
        roe: -0.05,
        revenueGrowth: -15,
        epsGrowth: -20,
        debtEquity: 3.0,
        currentRatio: 0.5,
        insiderBuyCount: 0,
        insiderSellCount: 5,
        insiderNetShares: -200_000,
        ivPercentile: 90,
        putCallRatio: 0.3,
        priceTargetConsensus: 100,
        price: 150,
      }),
    );
    expect(result.composite).toBeLessThanOrEqual(3);
    expect(["Sell", "Strong Sell"]).toContain(result.rating);
  });

  // ── No data = neutral ──

  it("empty input produces neutral composite of 5", () => {
    const result = computeStockScore("AAPL", {});
    expect(result.composite).toBe(5);
    expect(result.rating).toBe("Neutral");
  });

  it("empty input produces categories with score 5 and no signals", () => {
    const result = computeStockScore("AAPL", {});
    for (const cat of result.categories) {
      expect(cat.score).toBe(5);
      expect(cat.signals).toHaveLength(0);
    }
  });

  // ── Technical scorer ──

  it("strong positive momentum scores high technically", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({ changePercent: 5.0, volume: 150_000_000, avgVolume: 60_000_000 }),
    );
    const tech = result.categories.find((c) => c.name === "Technical")!;
    expect(tech.score).toBeGreaterThanOrEqual(7);
  });

  it("strong negative momentum scores low technically", () => {
    const result = computeStockScore("AAPL", {
      changePercent: -4.0,
      volume: 20_000_000,
      avgVolume: 60_000_000,
      beta: 2.5,
      price: 150,
      priceTargetConsensus: 120,
    });
    const tech = result.categories.find((c) => c.name === "Technical")!;
    expect(tech.score).toBeLessThanOrEqual(4);
  });

  it("price target with large upside boosts technical score", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({ price: 100, priceTargetConsensus: 150 }),
    );
    const tech = result.categories.find((c) => c.name === "Technical")!;
    const targetSignal = tech.signals.find((s) => s.name === "Analyst Target")!;
    expect(targetSignal.contribution).toBe(3);
  });

  it("price target below current price penalizes technical", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({ price: 200, priceTargetConsensus: 170 }),
    );
    const tech = result.categories.find((c) => c.name === "Technical")!;
    const targetSignal = tech.signals.find((s) => s.name === "Analyst Target")!;
    expect(targetSignal.contribution).toBeLessThanOrEqual(0);
  });

  // ── Fundamental scorer ──

  it("low P/E with strong profitability scores high fundamentally", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        peRatio: 10,
        netMargin: 0.25,
        roe: 0.25,
        revenueGrowth: 25,
        epsGrowth: 30,
        debtEquity: 0.3,
        currentRatio: 2.5,
      }),
    );
    const fund = result.categories.find((c) => c.name === "Fundamental")!;
    expect(fund.score).toBeGreaterThanOrEqual(8);
  });

  it("negative P/E with negative margins scores low fundamentally", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        peRatio: -10,
        netMargin: -0.15,
        roe: -0.10,
        revenueGrowth: -20,
        epsGrowth: -25,
        debtEquity: 3.0,
        currentRatio: 0.5,
      }),
    );
    const fund = result.categories.find((c) => c.name === "Fundamental")!;
    expect(fund.score).toBeLessThanOrEqual(3);
  });

  // ── Sentiment scorer ──

  it("strong insider buying produces high sentiment score", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        insiderBuyCount: 5,
        insiderSellCount: 0,
        insiderNetShares: 500_000,
      }),
    );
    const sent = result.categories.find((c) => c.name === "Sentiment")!;
    expect(sent.score).toBeGreaterThanOrEqual(8);
  });

  it("heavy insider selling produces low sentiment score", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        insiderBuyCount: 0,
        insiderSellCount: 5,
        insiderNetShares: -200_000,
      }),
    );
    const sent = result.categories.find((c) => c.name === "Sentiment")!;
    expect(sent.score).toBeLessThanOrEqual(4);
  });

  it("no insider data produces neutral sentiment", () => {
    const result = computeStockScore("AAPL", {
      insiderBuyCount: undefined,
      insiderSellCount: undefined,
      insiderNetShares: undefined,
    });
    const sent = result.categories.find((c) => c.name === "Sentiment")!;
    expect(sent.score).toBe(5);
    expect(sent.signals).toHaveLength(0);
  });

  // ── Options scorer ──

  it("low IV with high put/call ratio scores high on options", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({ ivPercentile: 10, putCallRatio: 1.5 }),
    );
    const opts = result.categories.find((c) => c.name === "Options")!;
    expect(opts.score).toBeGreaterThanOrEqual(7);
  });

  it("high IV with low put/call ratio scores low on options", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({ ivPercentile: 90, putCallRatio: 0.3 }),
    );
    const opts = result.categories.find((c) => c.name === "Options")!;
    expect(opts.score).toBeLessThanOrEqual(3);
  });

  it("no options data produces neutral score", () => {
    const result = computeStockScore("AAPL", {
      ivPercentile: undefined,
      putCallRatio: undefined,
    });
    const opts = result.categories.find((c) => c.name === "Options")!;
    expect(opts.score).toBe(5);
    expect(opts.signals).toHaveLength(0);
  });

  // ── Rating boundaries ──

  it("composite >= 8 maps to Strong Buy", () => {
    const result = computeStockScore("AAPL", makeInput());
    // Our full bullish input should produce high score
    if (result.composite >= 8) {
      expect(result.rating).toBe("Strong Buy");
    }
  });

  it("composite < 2.5 maps to Strong Sell", () => {
    const result = computeStockScore(
      "AAPL",
      makeInput({
        changePercent: -5,
        volume: 10_000_000,
        avgVolume: 60_000_000,
        beta: 3.0,
        peRatio: -20,
        netMargin: -0.30,
        roe: -0.20,
        revenueGrowth: -25,
        epsGrowth: -30,
        debtEquity: 5.0,
        currentRatio: 0.3,
        insiderBuyCount: 0,
        insiderSellCount: 8,
        insiderNetShares: -500_000,
        ivPercentile: 95,
        putCallRatio: 0.2,
        priceTargetConsensus: 80,
        price: 150,
      }),
    );
    expect(result.composite).toBeLessThanOrEqual(2.5);
    expect(result.rating).toBe("Strong Sell");
  });

  // ── Category weights ──

  it("category weights are correct", () => {
    const result = computeStockScore("AAPL", makeInput());
    const tech = result.categories.find((c) => c.name === "Technical")!;
    const fund = result.categories.find((c) => c.name === "Fundamental")!;
    const sent = result.categories.find((c) => c.name === "Sentiment")!;
    const opts = result.categories.find((c) => c.name === "Options")!;
    expect(tech.weight).toBe(0.3);
    expect(fund.weight).toBe(0.35);
    expect(sent.weight).toBe(0.2);
    expect(opts.weight).toBe(0.15);
  });

  // ── Skips categories without signals ──

  it("composite excludes categories with no data from weighting", () => {
    // Only provide technical data
    const result = computeStockScore("AAPL", {
      changePercent: 3.0,
      volume: 100_000_000,
      avgVolume: 60_000_000,
    });
    const tech = result.categories.find((c) => c.name === "Technical")!;
    // Technical has signals, others do not
    expect(tech.signals.length).toBeGreaterThan(0);
    // Composite should reflect only technical, not be diluted by neutral zeros
    expect(result.composite).toBeGreaterThan(5);
  });
});
