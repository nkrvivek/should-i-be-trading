/**
 * CRI (Crash Risk Index) calculator.
 * Ported from Radon's web/lib/criCalc.ts.
 */

import { clamp } from "./scoring/normalize";

/* ─── Component Scoring (each 0-25) ────────────────── */

export function scoreVix(vix: number, vix5dRoc: number): number {
  if (!Number.isFinite(vix) || !Number.isFinite(vix5dRoc)) return 0;
  const levelScore = clamp(((vix - 15) / (40 - 15)) * 15, 0, 15);
  const rocScore = clamp((Math.max(vix5dRoc, 0) / 60) * 10, 0, 10);
  return clamp(levelScore + rocScore, 0, 25);
}

export function scoreVvix(vvix: number, vvixVixRatio: number): number {
  if (!Number.isFinite(vvix) || !Number.isFinite(vvixVixRatio)) return 0;
  const levelScore = clamp(((vvix - 90) / (140 - 90)) * 17, 0, 17);
  const ratioScore = clamp(((vvixVixRatio - 5) / (8 - 5)) * 8, 0, 8);
  return clamp(levelScore + ratioScore, 0, 25);
}

export function scoreCorrelation(corr: number, corr5dChange: number): number {
  if (!Number.isFinite(corr)) return 0;
  const safeChange = Number.isFinite(corr5dChange) ? corr5dChange : 0;
  const levelScore = clamp(((corr - 25) / (70 - 25)) * 17, 0, 17);
  const spikeScore = clamp((Math.max(safeChange, 0) / 20) * 8, 0, 8);
  return clamp(levelScore + spikeScore, 0, 25);
}

export function scoreMomentum(spxDistancePct: number): number {
  if (!Number.isFinite(spxDistancePct)) return 0;
  if (spxDistancePct >= 0) return 0;
  return clamp((Math.abs(spxDistancePct) / 10) * 25, 0, 25);
}

/* ─── Level classification ─────────────────────────── */

export type CriLevel = "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";

export function criLevel(score: number): CriLevel {
  if (score < 25) return "LOW";
  if (score < 50) return "ELEVATED";
  if (score < 75) return "HIGH";
  return "CRITICAL";
}

/* ─── Composite CRI ────────────────────────────────── */

export type CriComponents = {
  vix: number;
  vvix: number;
  correlation: number;
  momentum: number;
};

export type CriResult = {
  score: number;
  level: CriLevel;
  components: CriComponents;
};

export type CriInputs = {
  vix: number;
  vix5dRoc: number;
  vvix: number;
  vvixVixRatio: number;
  corr: number;
  corr5dChange: number;
  spxDistancePct: number;
};

export function computeCri(inputs: CriInputs): CriResult {
  const vixScore = scoreVix(inputs.vix, inputs.vix5dRoc);
  const vvixScore = scoreVvix(inputs.vvix, inputs.vvixVixRatio);
  const corrScore = scoreCorrelation(inputs.corr, inputs.corr5dChange);
  const momentumScore = scoreMomentum(inputs.spxDistancePct);

  const total = clamp(vixScore + vvixScore + corrScore + momentumScore, 0, 100);

  return {
    score: Math.round(total * 10) / 10,
    level: criLevel(total),
    components: {
      vix: Math.round(vixScore * 10) / 10,
      vvix: Math.round(vvixScore * 10) / 10,
      correlation: Math.round(corrScore * 10) / 10,
      momentum: Math.round(momentumScore * 10) / 10,
    },
  };
}
