import { describe, it, expect } from "vitest";
import { riskToleranceAllows, filterSuggestions, filterCatalog } from "../../src/lib/portfolio/riskFilter";
import type { RiskPreferences } from "../../src/stores/riskPrefsStore";
import type { StrategySuggestion } from "../../src/lib/portfolio/strategyAnalyzer";
import type { StrategyTemplate } from "../../src/lib/strategy/catalog";

const mockSuggestions: StrategySuggestion[] = [
  { strategyName: "Covered Call", riskLevel: "conservative", riskScore: 2, description: "", rationale: "", legs: [], estimatedMaxProfit: "$500", estimatedMaxLoss: "$200", maxLossCoverage: "" },
  { strategyName: "Collar", riskLevel: "conservative", riskScore: 2, description: "", rationale: "", legs: [], estimatedMaxProfit: "$300", estimatedMaxLoss: "$100", maxLossCoverage: "" },
  { strategyName: "Bull Call Spread", riskLevel: "moderate", riskScore: 5, description: "", rationale: "", legs: [], estimatedMaxProfit: "$1K", estimatedMaxLoss: "$500", maxLossCoverage: "" },
  { strategyName: "Iron Condor", riskLevel: "moderate", riskScore: 6, description: "", rationale: "", legs: [], estimatedMaxProfit: "$400", estimatedMaxLoss: "$600", maxLossCoverage: "" },
  { strategyName: "Naked Put", riskLevel: "aggressive", riskScore: 8, description: "", rationale: "", legs: [], estimatedMaxProfit: "$300", estimatedMaxLoss: "$5K", maxLossCoverage: "" },
];

const mockTemplates = [
  { id: "1", name: "Covered Call", complexity: "beginner" as const, riskProfile: "defined" as const, assetClass: "options" as const, outlook: "bullish" as const, regimeSignals: ["YES"], legs: [], description: "", whenToUse: "", maxProfitDesc: "", maxLossDesc: "", volRegime: "any" as const },
  { id: "2", name: "Iron Condor", complexity: "intermediate" as const, riskProfile: "defined" as const, assetClass: "options" as const, outlook: "neutral" as const, regimeSignals: ["YES"], legs: [], description: "", whenToUse: "", maxProfitDesc: "", maxLossDesc: "", volRegime: "any" as const },
  { id: "3", name: "Calendar Spread", complexity: "advanced" as const, riskProfile: "mixed" as const, assetClass: "options" as const, outlook: "neutral" as const, regimeSignals: ["YES"], legs: [], description: "", whenToUse: "", maxProfitDesc: "", maxLossDesc: "", volRegime: "any" as const },
  { id: "4", name: "Long Straddle", complexity: "intermediate" as const, riskProfile: "mixed" as const, assetClass: "options" as const, outlook: "any" as const, regimeSignals: ["YES"], legs: [], description: "", whenToUse: "", maxProfitDesc: "", maxLossDesc: "", volRegime: "any" as const },
  { id: "5", name: "VIX Reversion", complexity: "advanced" as const, riskProfile: "undefined" as const, assetClass: "volatility" as const, outlook: "any" as const, regimeSignals: ["YES"], legs: [], description: "", whenToUse: "", maxProfitDesc: "", maxLossDesc: "", volRegime: "any" as const },
] as StrategyTemplate[];

describe("riskToleranceAllows", () => {
  it("conservative tolerance allows only conservative", () => {
    expect(riskToleranceAllows("conservative", "conservative")).toBe(true);
    expect(riskToleranceAllows("moderate", "conservative")).toBe(false);
    expect(riskToleranceAllows("aggressive", "conservative")).toBe(false);
  });

  it("moderate tolerance allows conservative and moderate", () => {
    expect(riskToleranceAllows("conservative", "moderate")).toBe(true);
    expect(riskToleranceAllows("moderate", "moderate")).toBe(true);
    expect(riskToleranceAllows("aggressive", "moderate")).toBe(false);
  });

  it("aggressive tolerance allows all levels", () => {
    expect(riskToleranceAllows("conservative", "aggressive")).toBe(true);
    expect(riskToleranceAllows("moderate", "aggressive")).toBe(true);
    expect(riskToleranceAllows("aggressive", "aggressive")).toBe(true);
  });
});

describe("filterSuggestions", () => {
  it("conservative prefs keep only riskScore <= 3", () => {
    const prefs: RiskPreferences = { riskTolerance: "conservative", maxLossPercent: 2, targetProfitPercent: 5 };
    const result = filterSuggestions(mockSuggestions, prefs);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.strategyName)).toEqual(["Covered Call", "Collar"]);
  });

  it("moderate prefs keep only riskScore <= 6", () => {
    const prefs: RiskPreferences = { riskTolerance: "moderate", maxLossPercent: 5, targetProfitPercent: 10 };
    const result = filterSuggestions(mockSuggestions, prefs);
    expect(result).toHaveLength(4);
    expect(result.map((s) => s.strategyName)).toEqual(["Covered Call", "Collar", "Bull Call Spread", "Iron Condor"]);
  });

  it("aggressive prefs keep all suggestions", () => {
    const prefs: RiskPreferences = { riskTolerance: "aggressive", maxLossPercent: 20, targetProfitPercent: 50 };
    const result = filterSuggestions(mockSuggestions, prefs);
    expect(result).toHaveLength(5);
  });

  it("returns empty array for empty input", () => {
    const prefs: RiskPreferences = { riskTolerance: "moderate", maxLossPercent: 5, targetProfitPercent: 10 };
    const result = filterSuggestions([], prefs);
    expect(result).toEqual([]);
  });
});

describe("filterCatalog", () => {
  it("conservative prefs keep only beginner + defined risk", () => {
    const prefs: RiskPreferences = { riskTolerance: "conservative", maxLossPercent: 2, targetProfitPercent: 5 };
    const result = filterCatalog(mockTemplates, prefs);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Covered Call");
  });

  it("moderate prefs keep beginner+intermediate with defined+mixed risk", () => {
    const prefs: RiskPreferences = { riskTolerance: "moderate", maxLossPercent: 5, targetProfitPercent: 10 };
    const result = filterCatalog(mockTemplates, prefs);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.name)).toEqual(["Covered Call", "Iron Condor", "Long Straddle"]);
  });

  it("aggressive prefs keep all templates", () => {
    const prefs: RiskPreferences = { riskTolerance: "aggressive", maxLossPercent: 20, targetProfitPercent: 50 };
    const result = filterCatalog(mockTemplates, prefs);
    expect(result).toHaveLength(5);
  });

  it("returns empty array for empty input", () => {
    const prefs: RiskPreferences = { riskTolerance: "conservative", maxLossPercent: 2, targetProfitPercent: 5 };
    const result = filterCatalog([], prefs);
    expect(result).toEqual([]);
  });
});
