import type { StrategySuggestion } from "./strategyAnalyzer";
import type { StrategyTemplate } from "../strategy/catalog";
import type { RiskTolerance, RiskPreferences } from "../../stores/riskPrefsStore";

const TOLERANCE_ORDER: Record<RiskTolerance, number> = {
  conservative: 1,
  moderate: 2,
  aggressive: 3,
};

export function riskToleranceAllows(
  level: "conservative" | "moderate" | "aggressive",
  tolerance: RiskTolerance,
): boolean {
  return TOLERANCE_ORDER[level] <= TOLERANCE_ORDER[tolerance];
}

export function filterSuggestions(
  suggestions: StrategySuggestion[],
  prefs: RiskPreferences,
): StrategySuggestion[] {
  const maxScore = prefs.riskTolerance === "conservative" ? 3
    : prefs.riskTolerance === "moderate" ? 6
    : 10;
  return suggestions.filter((s) => s.riskScore <= maxScore);
}

export function filterCatalog(
  templates: StrategyTemplate[],
  prefs: RiskPreferences,
): StrategyTemplate[] {
  return templates.filter((t) => {
    if (prefs.riskTolerance === "conservative") {
      return t.complexity === "beginner" && t.riskProfile === "defined";
    }
    if (prefs.riskTolerance === "moderate") {
      return (t.complexity === "beginner" || t.complexity === "intermediate")
        && (t.riskProfile === "defined" || t.riskProfile === "mixed");
    }
    return true; // aggressive: show all
  });
}
