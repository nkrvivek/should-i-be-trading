import { describe, it, expect } from "vitest";
import { computePortfolioRiskScore } from "../../src/lib/portfolio/portfolioRiskScore";
import type { BrokerPosition } from "../../src/lib/brokers/types";
import type { RiskPreferences } from "../../src/stores/riskPrefsStore";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makePosition(
  symbol: string,
  marketValue: number,
  unrealizedPL = 0,
  opts: Partial<BrokerPosition> = {},
): BrokerPosition {
  const qty = Math.max(1, Math.round(marketValue / 100));
  return {
    symbol,
    qty,
    side: "long",
    avgEntryPrice: (marketValue - unrealizedPL) / qty,
    currentPrice: marketValue / qty,
    marketValue,
    unrealizedPL,
    unrealizedPLPercent: marketValue > 0 ? (unrealizedPL / (marketValue - unrealizedPL)) * 100 : 0,
    assetType: "stock",
    ...opts,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("computePortfolioRiskScore", () => {
  it("well-diversified portfolio scores > 75 with grade A or B", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 10_000, 500),   // Technology
      makePosition("JPM", 10_000, 200),    // Financials
      makePosition("UNH", 10_000, 300),    // Healthcare
      makePosition("XOM", 10_000, -100),   // Energy
      makePosition("DIS", 10_000, 150),    // Communication
      makePosition("CAT", 10_000, 50),     // Industrials
      makePosition("WMT", 10_000, 100),    // Consumer
      makePosition("NEE", 10_000, -50),    // Utilities
      makePosition("SH", 10_000, -200),    // Inverse ETF (hedge)
      makePosition("SGOV", 10_000, 10),    // Cash-like (hedge)
    ];

    const result = computePortfolioRiskScore(positions, equity);
    expect(result.overall).toBeGreaterThan(75);
    expect(["A", "B"]).toContain(result.grade);
    expect(result.pillars).toHaveLength(5);
  });

  it("concentrated portfolio — one position 50% of equity — flags concentration", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("NVDA", 50_000, 1000),  // 50%
      makePosition("AAPL", 25_000, 200),
      makePosition("MSFT", 25_000, 100),
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const concentrationPillar = result.pillars.find((p) => p.name === "Concentration")!;
    expect(concentrationPillar.score).toBeLessThan(30);
    expect(result.warnings.some((w) => w.includes("NVDA") && w.includes("concentration"))).toBe(true);
  });

  it("single sector — all tech stocks — low diversification score", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 25_000),
      makePosition("MSFT", 25_000),
      makePosition("NVDA", 25_000),
      makePosition("AMD", 25_000),
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const diversificationPillar = result.pillars.find((p) => p.name === "Diversification")!;
    expect(diversificationPillar.score).toBeLessThanOrEqual(15);
    expect(result.warnings.some((w) => w.includes("single sector"))).toBe(true);
  });

  it("large drawdown — portfolio down 15% — low drawdown score with warning", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 30_000, -5_000),
      makePosition("JPM", 30_000, -5_000),
      makePosition("XOM", 20_000, -3_000),
      makePosition("UNH", 20_000, -2_000),
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const drawdownPillar = result.pillars.find((p) => p.name === "Drawdown Risk")!;
    expect(drawdownPillar.score).toBeLessThan(50);
    expect(result.warnings.some((w) => w.includes("drawdown"))).toBe(true);
  });

  it("no hedges — all long stock — hedging pillar = 20", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 25_000),
      makePosition("JPM", 25_000),
      makePosition("XOM", 25_000),
      makePosition("UNH", 25_000),
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const hedgingPillar = result.pillars.find((p) => p.name === "Hedging")!;
    expect(hedgingPillar.score).toBe(20);
    expect(result.warnings.some((w) => w.includes("No portfolio hedges"))).toBe(true);
  });

  it("with hedges — inverse ETF + put — hedging pillar > 60", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 40_000),
      makePosition("JPM", 30_000),
      makePosition("SH", 15_000),         // Inverse ETF
      makePosition("SPY230P400", 15_000, 0, { assetType: "option" }), // Put option
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const hedgingPillar = result.pillars.find((p) => p.name === "Hedging")!;
    expect(hedgingPillar.score).toBeGreaterThan(60);
  });

  it("empty portfolio — score 100, grade A", () => {
    const result = computePortfolioRiskScore([], 50_000);
    expect(result.overall).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.warnings).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
    expect(result.pillars).toHaveLength(5);
    result.pillars.forEach((p) => expect(p.score).toBe(100));
  });

  it("risk prefs integration — drawdown exceeds maxLossPercent", () => {
    const equity = 100_000;
    const prefs: RiskPreferences = {
      riskTolerance: "conservative",
      maxLossPercent: 5,
      targetProfitPercent: 10,
    };
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 50_000, -4_000),
      makePosition("JPM", 50_000, -4_000),
    ];

    const result = computePortfolioRiskScore(positions, equity, prefs);
    expect(result.warnings.some((w) => w.includes("exceeds your 5%"))).toBe(true);
    expect(result.suggestions.some((s) => s.includes("risk tolerance"))).toBe(true);
  });

  it("position sizing — highly uneven sizes produce lower score", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 80_000),  // 80%
      makePosition("JPM", 5_000),    // 5%
      makePosition("XOM", 5_000),    // 5%
      makePosition("UNH", 5_000),    // 5%
      makePosition("CAT", 5_000),    // 5%
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const sizingPillar = result.pillars.find((p) => p.name === "Position Sizing")!;
    // High std dev between 80% and 5% should produce a low score
    expect(sizingPillar.score).toBeLessThan(50);
    // AAPL at 80% is well over 3x the average of 20%
    expect(result.warnings.some((w) => w.includes("AAPL") && w.includes("average position size"))).toBe(true);
  });

  it("pillar weights sum to 1.0", () => {
    const result = computePortfolioRiskScore([], 10_000);
    const totalWeight = result.pillars.reduce((sum, p) => sum + p.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  it("overall score is weighted average of pillar scores", () => {
    const equity = 100_000;
    const positions: BrokerPosition[] = [
      makePosition("AAPL", 50_000),
      makePosition("JPM", 50_000),
    ];

    const result = computePortfolioRiskScore(positions, equity);
    const expected = Math.round(
      result.pillars.reduce((sum, p) => sum + p.score * p.weight, 0),
    );
    expect(result.overall).toBe(expected);
  });
});
