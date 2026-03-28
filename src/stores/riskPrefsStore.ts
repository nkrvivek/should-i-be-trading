import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export interface RiskPreferences {
  riskTolerance: RiskTolerance;
  maxLossPercent: number;
  targetProfitPercent: number;
}

interface RiskPrefsState extends RiskPreferences {
  setRiskTolerance: (v: RiskTolerance) => void;
  setMaxLossPercent: (v: number) => void;
  setTargetProfitPercent: (v: number) => void;
  resetDefaults: () => void;
}

const DEFAULTS: RiskPreferences = {
  riskTolerance: "moderate",
  maxLossPercent: 5,
  targetProfitPercent: 10,
};

export const useRiskPrefsStore = create<RiskPrefsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setRiskTolerance: (riskTolerance) => set({ riskTolerance }),
      setMaxLossPercent: (maxLossPercent) => set({ maxLossPercent }),
      setTargetProfitPercent: (targetProfitPercent) => set({ targetProfitPercent }),
      resetDefaults: () => set(DEFAULTS),
    }),
    { name: "sibt-risk-prefs" },
  ),
);
