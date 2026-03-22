import { describe, it, expect } from "vitest";
import {
  scoreVix,
  scoreVvix,
  scoreCorrelation,
  scoreMomentum,
  computeCri,
  criLevel,
} from "../../src/lib/criCalc";

describe("scoreVix", () => {
  it("returns 0 for low VIX", () => {
    expect(scoreVix(12, 0)).toBe(0);
  });

  it("scales linearly between 15 and 40", () => {
    const score = scoreVix(27.5, 0);
    expect(score).toBeCloseTo(7.5, 1);
  });

  it("caps at 25", () => {
    expect(scoreVix(50, 100)).toBe(25);
  });

  it("returns 0 for NaN inputs", () => {
    expect(scoreVix(NaN, 10)).toBe(0);
    expect(scoreVix(20, NaN)).toBe(0);
  });
});

describe("scoreVvix", () => {
  it("returns 0 for low VVIX", () => {
    expect(scoreVvix(80, 4)).toBe(0);
  });

  it("scales between 90 and 140", () => {
    const score = scoreVvix(115, 5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(25);
  });

  it("caps at 25", () => {
    expect(scoreVvix(200, 20)).toBe(25);
  });
});

describe("scoreCorrelation", () => {
  it("returns 0 for low correlation", () => {
    expect(scoreCorrelation(20, 0)).toBe(0);
  });

  it("scores high for elevated correlation", () => {
    const score = scoreCorrelation(60, 15);
    expect(score).toBeGreaterThan(10);
  });
});

describe("scoreMomentum", () => {
  it("returns 0 when above MA", () => {
    expect(scoreMomentum(2)).toBe(0);
  });

  it("scores higher the further below MA", () => {
    expect(scoreMomentum(-5)).toBeGreaterThan(0);
    expect(scoreMomentum(-10)).toBe(25);
  });
});

describe("criLevel", () => {
  it("classifies levels correctly", () => {
    expect(criLevel(10)).toBe("LOW");
    expect(criLevel(30)).toBe("ELEVATED");
    expect(criLevel(55)).toBe("HIGH");
    expect(criLevel(80)).toBe("CRITICAL");
  });
});

describe("computeCri", () => {
  it("computes composite score", () => {
    const result = computeCri({
      vix: 20,
      vix5dRoc: 10,
      vvix: 100,
      vvixVixRatio: 5,
      corr: 40,
      corr5dChange: 5,
      spxDistancePct: -2,
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBeDefined();
    expect(result.components.vix).toBeGreaterThan(0);
  });

  it("returns 0 for calm market", () => {
    const result = computeCri({
      vix: 12,
      vix5dRoc: 0,
      vvix: 80,
      vvixVixRatio: 4,
      corr: 20,
      corr5dChange: 0,
      spxDistancePct: 3,
    });

    expect(result.score).toBe(0);
    expect(result.level).toBe("LOW");
  });
});
