import { describe, it, expect } from "vitest";
import { computeRegimeMonitor } from "../../src/lib/regimeScoring";
import type { RegimeInputs } from "../../src/lib/regimeScoring";

function makeInputs(overrides: Partial<RegimeInputs> = {}): RegimeInputs {
  return {
    spxPrice: 5200,
    spxSma200: 4800,
    hySpread: 3.0,
    twoYearYield: 4.0,
    tenYearYield: 4.5,
    vix: 15,
    vixPrev: 16,
    vix3m: 18,
    rspPrice: 160,
    spyPrice: 520,
    rspPrev: 158,
    spyPrev: 518,
    hygPrice: 78,
    tltPrice: 90,
    moveIndex: 100,
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
    ...overrides,
  };
}

describe("computeRegimeMonitor", () => {
  it("returns all required fields", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result).toHaveProperty("compositeScore");
    expect(result).toHaveProperty("confidenceScore");
    expect(result).toHaveProperty("marketState");
    expect(result).toHaveProperty("actionStance");
    expect(result).toHaveProperty("pillars");
    expect(result).toHaveProperty("signals");
    expect(result).toHaveProperty("fsi");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("timestamp");
  });

  it("composite score is between 0 and 100", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
  });

  it("confidence score is between 0 and 100", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });

  it("returns exactly 3 pillars with correct names", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.pillars).toHaveLength(3);
    const names = result.pillars.map((p) => p.name);
    expect(names).toContain("REGIME");
    expect(names).toContain("FRAGILITY");
    expect(names).toContain("TRIGGER");
  });

  it("pillar weights sum to 1.0", () => {
    const result = computeRegimeMonitor(makeInputs());
    const weightSum = result.pillars.reduce((sum, p) => sum + p.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 5);
  });

  it("each pillar score is between 0 and 100", () => {
    const result = computeRegimeMonitor(makeInputs());
    for (const p of result.pillars) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it("returns 8 total signals", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.signals).toHaveLength(8);
  });

  it("each signal score is between 0 and 100", () => {
    const result = computeRegimeMonitor(makeInputs());
    for (const s of result.signals) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  it("timestamp is a recent epoch", () => {
    const before = Date.now();
    const result = computeRegimeMonitor(makeInputs());
    const after = Date.now();
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });

  // ── Market state mapping ──

  it("marketState is one of the valid values", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect([
      "Strong / Risk-On",
      "Stable / Normal",
      "Fragile / Hedged",
      "Stressed / Defensive",
      "Crisis / Risk-Off",
    ]).toContain(result.marketState);
  });

  it("actionStance is one of the valid values", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(["Aggressive", "Normal", "Hedged", "Defensive", "Cash"]).toContain(
      result.actionStance,
    );
  });

  // ── Bullish scenario ──

  it("bullish inputs produce high composite and Risk-On state", () => {
    const result = computeRegimeMonitor(
      makeInputs({
        spxPrice: 5500,
        spxSma200: 4800,
        hySpread: 2.5,
        twoYearYield: 3.5,
        tenYearYield: 4.8,
        vix: 11,
        vix3m: 15,
        sectorChanges: Array.from({ length: 11 }, (_, i) => ({
          symbol: `S${i}`,
          change: 1.5,
        })),
        rspPrice: 165,
        spyPrice: 520,
        rspPrev: 160,
        spyPrev: 518,
      }),
    );
    expect(result.compositeScore).toBeGreaterThanOrEqual(75);
    expect(result.marketState).toBe("Strong / Risk-On");
    expect(result.actionStance).toBe("Aggressive");
  });

  // ── Bearish scenario ──

  it("bearish inputs produce low composite and Stressed state", () => {
    const result = computeRegimeMonitor(
      makeInputs({
        spxPrice: 4200,
        spxSma200: 4800,
        hySpread: 6.0,
        twoYearYield: 5.0,
        tenYearYield: 4.2,
        vix: 35,
        vix3m: 28,
        sectorChanges: [
          { symbol: "XLK", change: -2.0 },
          { symbol: "XLF", change: -1.5 },
        ],
        rspPrice: 140,
        spyPrice: 520,
        rspPrev: 155,
        spyPrev: 518,
      }),
    );
    expect(result.compositeScore).toBeLessThan(40);
    expect(["Stressed / Defensive", "Crisis / Risk-Off"]).toContain(
      result.marketState,
    );
  });

  // ── Missing data defaults ──

  it("empty inputs produce neutral scores with low confidence", () => {
    const result = computeRegimeMonitor({});
    expect(result.compositeScore).toBe(50);
    expect(result.confidenceScore).toBe(0);
    expect(result.marketState).toBe("Fragile / Hedged");
    expect(result.actionStance).toBe("Hedged");
  });

  it("all signals default to N/A and score 50 with empty inputs", () => {
    const result = computeRegimeMonitor({});
    for (const s of result.signals) {
      expect(s.currentValue).toBe("N/A");
      expect(s.score).toBe(50);
    }
  });

  // ── FSI computation ──

  it("FSI has all component fields", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.fsi).toHaveProperty("value");
    expect(result.fsi).toHaveProperty("score");
    expect(result.fsi).toHaveProperty("label");
    expect(result.fsi).toHaveProperty("components");
  });

  it("FSI with all components produces a numeric value", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.fsi.value).toBeTypeOf("number");
    expect(result.fsi.score).toBeGreaterThanOrEqual(0);
    expect(result.fsi.score).toBeLessThanOrEqual(100);
  });

  it("FSI without MOVE index falls back to VIX as proxy", () => {
    const result = computeRegimeMonitor(
      makeInputs({ moveIndex: undefined }),
    );
    // Should still compute a value using VIX
    expect(result.fsi.value).toBeTypeOf("number");
  });

  it("FSI with missing HYG/TLT returns null value and score 50", () => {
    const result = computeRegimeMonitor(
      makeInputs({ hygPrice: undefined, tltPrice: undefined }),
    );
    expect(result.fsi.value).toBeNull();
    expect(result.fsi.score).toBe(50);
    expect(result.fsi.label).toBe("Insufficient Data");
  });

  it("FSI label maps correctly based on score", () => {
    // Healthy scenario: low spread, high HYG/TLT ratio
    const healthy = computeRegimeMonitor(
      makeInputs({ hySpread: 2.0, moveIndex: 50, hygPrice: 85, tltPrice: 90 }),
    );
    expect(["Healthy", "Cautious"]).toContain(healthy.fsi.label);

    // Stressed scenario: high spread, low ratio
    const stressed = computeRegimeMonitor(
      makeInputs({ hySpread: 6.0, moveIndex: 150, hygPrice: 70, tltPrice: 100 }),
    );
    expect(["Stressed", "Critical"]).toContain(stressed.fsi.label);
  });

  // ── Individual signal scorers ──

  it("SPX well above 200DMA scores high", () => {
    const result = computeRegimeMonitor(
      makeInputs({ spxPrice: 5500, spxSma200: 4500 }),
    );
    const signal = result.signals.find((s) => s.id === "spx_200dma")!;
    expect(signal.score).toBeGreaterThanOrEqual(82);
    expect(signal.badge).toBe("POSITIVE");
  });

  it("SPX well below 200DMA scores low", () => {
    const result = computeRegimeMonitor(
      makeInputs({ spxPrice: 4000, spxSma200: 4800 }),
    );
    const signal = result.signals.find((s) => s.id === "spx_200dma")!;
    expect(signal.score).toBeLessThanOrEqual(38);
    expect(["CAUTION", "ELEVATED"]).toContain(signal.badge);
  });

  it("tight HY spread scores high", () => {
    const result = computeRegimeMonitor(makeInputs({ hySpread: 2.5 }));
    const signal = result.signals.find((s) => s.id === "hy_spread")!;
    expect(signal.score).toBe(90);
  });

  it("wide HY spread scores low", () => {
    const result = computeRegimeMonitor(makeInputs({ hySpread: 7.5 }));
    const signal = result.signals.find((s) => s.id === "hy_spread")!;
    expect(signal.score).toBe(8);
    expect(signal.badge).toBe("ELEVATED");
  });

  it("positive yield curve scores high", () => {
    const result = computeRegimeMonitor(
      makeInputs({ twoYearYield: 3.0, tenYearYield: 4.5 }),
    );
    const signal = result.signals.find((s) => s.id === "yield_curve")!;
    expect(signal.score).toBeGreaterThanOrEqual(75);
  });

  it("deeply inverted yield curve scores low", () => {
    const result = computeRegimeMonitor(
      makeInputs({ twoYearYield: 5.5, tenYearYield: 4.5 }),
    );
    const signal = result.signals.find((s) => s.id === "yield_curve")!;
    expect(signal.score).toBe(12);
    expect(signal.badge).toBe("ELEVATED");
  });

  it("low VIX scores high", () => {
    const result = computeRegimeMonitor(makeInputs({ vix: 11 }));
    const signal = result.signals.find((s) => s.id === "vix_level")!;
    expect(signal.score).toBe(92);
  });

  it("extreme VIX scores very low", () => {
    const result = computeRegimeMonitor(makeInputs({ vix: 50 }));
    const signal = result.signals.find((s) => s.id === "vix_level")!;
    expect(signal.score).toBe(5);
    expect(signal.badge).toBe("ELEVATED");
  });

  it("VIX in steep contango scores high", () => {
    const result = computeRegimeMonitor(
      makeInputs({ vix: 14, vix3m: 20 }),
    );
    const signal = result.signals.find((s) => s.id === "vix_term")!;
    expect(signal.score).toBeGreaterThanOrEqual(72);
  });

  it("VIX in severe backwardation scores very low", () => {
    const result = computeRegimeMonitor(
      makeInputs({ vix: 35, vix3m: 25 }),
    );
    const signal = result.signals.find((s) => s.id === "vix_term")!;
    expect(signal.score).toBeLessThanOrEqual(28);
  });

  it("broad sector participation scores high for breadth", () => {
    const result = computeRegimeMonitor(
      makeInputs({
        sectorChanges: Array.from({ length: 10 }, (_, i) => ({
          symbol: `S${i}`,
          change: 1.0,
        })),
      }),
    );
    const signal = result.signals.find((s) => s.id === "breadth_50dma")!;
    expect(signal.score).toBe(88);
  });

  it("narrow sector participation scores low for breadth", () => {
    const result = computeRegimeMonitor(
      makeInputs({
        sectorChanges: [
          { symbol: "XLK", change: 1.0 },
          { symbol: "XLF", change: -1.0 },
          { symbol: "XLE", change: -1.0 },
          { symbol: "XLV", change: -1.0 },
          { symbol: "XLI", change: -1.0 },
        ],
      }),
    );
    const signal = result.signals.find((s) => s.id === "breadth_50dma")!;
    expect(signal.score).toBe(18);
  });

  // ── Warnings ──

  it("generates warnings for elevated signals", () => {
    const result = computeRegimeMonitor(
      makeInputs({
        vix: 50,
        vix3m: 35,
        hySpread: 7.5,
        twoYearYield: 5.5,
        tenYearYield: 4.5,
      }),
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("VIX"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("Credit"))).toBe(true);
  });

  it("no warnings for healthy market", () => {
    const result = computeRegimeMonitor(
      makeInputs({
        vix: 12,
        vix3m: 16,
        hySpread: 2.5,
        twoYearYield: 3.0,
        tenYearYield: 4.5,
      }),
    );
    expect(result.warnings).toHaveLength(0);
  });

  // ── Confidence ──

  it("full data produces 100% confidence", () => {
    const result = computeRegimeMonitor(makeInputs());
    expect(result.confidenceScore).toBe(100);
  });

  it("partial data reduces confidence proportionally", () => {
    const result = computeRegimeMonitor({
      vix: 15,
      hySpread: 3.0,
    });
    // Only 2 of 8 signals have data
    expect(result.confidenceScore).toBe(25);
  });
});
