import type { CriData, InsiderActivitySummary } from "../api/types";
import type { MarketStatus } from "./marketHours";

export type TrafficSignal = "TRADE" | "CAUTION" | "NO_TRADE";

export type VixRegimeAction = "BUY_AGGRESSIVE" | "BUY" | "HOLD" | "SELL";

export type VixRegime = {
  action: VixRegimeAction;
  label: string;
  detail: string;
};

export type TrafficLightVerdict = {
  signal: TrafficSignal;
  reasons: string[];
  overrides: string[];
  confidence: number;
  vixRegime: VixRegime;
  insiderContext?: string;
};

export type TrafficLightInputs = {
  cri: CriData | null;
  marketStatus: MarketStatus;
  /** Live VIX from WS, falls back to cri.vix */
  liveVix?: number | null;
  /** Live VVIX from WS, falls back to cri.vvix */
  liveVvix?: number | null;
  /** Insider trading activity for watchlist tickers */
  insiderActivity?: InsiderActivitySummary[] | null;
};

/**
 * VIX-based equity allocation regime.
 * Based on the historically proven VIX mean-reversion strategy:
 *   VIX >= 45  → Buy aggressively (extreme fear = maximum opportunity)
 *   VIX >= 30  → Buy stocks (elevated fear = opportunity)
 *   VIX 14-30  → Hold / normal trading
 *   VIX <= 14  → Sell / take profits (complacency = risk)
 */
export function computeVixRegime(vix: number): VixRegime {
  if (vix >= 45) {
    return {
      action: "BUY_AGGRESSIVE",
      label: "BUY AGGRESSIVE",
      detail: `VIX at ${vix.toFixed(1)} — extreme fear, historically the best buying opportunity`,
    };
  }
  if (vix >= 30) {
    return {
      action: "BUY",
      label: "BUY STOCKS",
      detail: `VIX at ${vix.toFixed(1)} — elevated fear, favorable entry for equities`,
    };
  }
  if (vix <= 14) {
    return {
      action: "SELL",
      label: "SELL / TAKE PROFITS",
      detail: `VIX at ${vix.toFixed(1)} — complacency, historically precedes corrections`,
    };
  }
  return {
    action: "HOLD",
    label: "HOLD / NORMAL",
    detail: `VIX at ${vix.toFixed(1)} — normal range, standard position management`,
  };
}

/**
 * Compute insider trading confidence adjustment.
 * Heavy selling across multiple tickers = bearish signal, reduces confidence.
 * Heavy buying = bullish signal, increases confidence.
 */
function computeInsiderAdjustment(activity: InsiderActivitySummary[] | null | undefined): {
  adjustment: number;
  context: string | null;
  reasons: string[];
} {
  if (!activity || activity.length === 0) return { adjustment: 0, context: null, reasons: [] };

  const heavySellers = activity.filter((a) => a.signal === "HEAVY_SELLING");
  const netSellers = activity.filter((a) => a.signal === "HEAVY_SELLING" || a.signal === "NET_SELLING");
  const heavyBuyers = activity.filter((a) => a.signal === "HEAVY_BUYING");
  const netBuyers = activity.filter((a) => a.signal === "HEAVY_BUYING" || a.signal === "NET_BUYING");

  const totalSellValue = netSellers.reduce((s, a) => s + a.sellValue, 0);
  const totalBuyValue = netBuyers.reduce((s, a) => s + a.buyValue, 0);

  const reasons: string[] = [];
  let adjustment = 0;

  // Heavy selling across multiple tickers is a strong bearish signal
  if (heavySellers.length >= 3) {
    adjustment -= 15;
    reasons.push(`Heavy insider selling in ${heavySellers.length} tickers ($${(totalSellValue / 1e6).toFixed(0)}M)`);
  } else if (heavySellers.length >= 1) {
    adjustment -= 8;
    reasons.push(`Insider selling detected in ${netSellers.length} ticker(s)`);
  }

  // Broad insider buying is a bullish signal
  if (heavyBuyers.length >= 3) {
    adjustment += 10;
    reasons.push(`Heavy insider buying in ${heavyBuyers.length} tickers ($${(totalBuyValue / 1e6).toFixed(0)}M)`);
  } else if (heavyBuyers.length >= 1) {
    adjustment += 5;
    reasons.push(`Insider buying detected in ${netBuyers.length} ticker(s)`);
  }

  const context = reasons.length > 0 ? reasons.join("; ") : null;
  return { adjustment, context, reasons };
}

export function computeVerdict(inputs: TrafficLightInputs): TrafficLightVerdict {
  const { cri, marketStatus, liveVix, liveVvix, insiderActivity } = inputs;
  const reasons: string[] = [];
  const overrides: string[] = [];

  // No data yet
  if (!cri) {
    return {
      signal: "NO_TRADE",
      reasons: ["No regime data available"],
      overrides: ["Connect to Radon and run a CRI scan"],
      confidence: 0,
      vixRegime: { action: "HOLD", label: "NO DATA", detail: "Awaiting VIX data" },
    };
  }

  const vix = liveVix ?? cri.vix;
  const vvix = liveVvix ?? cri.vvix;
  const vvixVixRatio = vix > 0 ? vvix / vix : cri.vvix_vix_ratio;
  const criScore = cri.cri?.score ?? 0;
  const criLvl = cri.cri?.level ?? "LOW";
  const vixRegime = computeVixRegime(vix);

  // ─── NO_TRADE conditions ─────────────────────────
  if (marketStatus === "CLOSED") {
    reasons.push("Market is closed");
    return { signal: "NO_TRADE", reasons, overrides: ["Wait for market open"], confidence: 95, vixRegime };
  }

  if (criLvl === "CRITICAL" || criScore >= 75) {
    reasons.push(`CRI is CRITICAL (${criScore.toFixed(1)})`);
    if (cri.crash_trigger.triggered) {
      reasons.push("Crash trigger conditions met");
    }
    // Even in CRITICAL CRI, the VIX regime may signal buying opportunity
    if (vixRegime.action === "BUY_AGGRESSIVE" || vixRegime.action === "BUY") {
      overrides.push(`VIX regime says ${vixRegime.label} — consider equity accumulation with tight risk`);
    }
    overrides.push("Only consider tail hedges or defined-risk protection");
    return { signal: "NO_TRADE", reasons, overrides, confidence: 90, vixRegime };
  }

  // VIX > 35: options trading is dangerous, but equity buying may be opportunistic
  if (vix > 35) {
    reasons.push(`VIX extremely elevated (${vix.toFixed(1)})`);
    if (vixRegime.action === "BUY_AGGRESSIVE") {
      overrides.push("VIX REGIME: BUY AGGRESSIVE — extreme fear historically = best equity entry");
      overrides.push("Avoid options (IV crush risk), accumulate equities in tranches");
    } else if (vixRegime.action === "BUY") {
      overrides.push("VIX REGIME: BUY STOCKS — elevated fear = favorable equity entry");
    }
    return {
      signal: "CAUTION",
      reasons,
      overrides,
      confidence: 60,
      vixRegime,
    };
  }

  // ─── CAUTION conditions ──────────────────────────
  const cautionReasons: string[] = [];

  if (criLvl === "HIGH" || criScore >= 50) {
    cautionReasons.push(`CRI is HIGH (${criScore.toFixed(1)})`);
  }

  if (vix >= 25 && vix <= 35) {
    cautionReasons.push(`VIX elevated (${vix.toFixed(1)})`);
  }

  if (vvixVixRatio > 7) {
    cautionReasons.push(`VVIX/VIX ratio high (${vvixVixRatio.toFixed(1)})`);
  }

  if (cri.cor1m > 60) {
    cautionReasons.push(`COR1M elevated (${cri.cor1m.toFixed(1)})`);
  }

  if (marketStatus === "PRE_MARKET" || marketStatus === "AFTER_HOURS") {
    cautionReasons.push(`Trading in ${marketStatus.replace("_", " ").toLowerCase()}`);
  }

  if (cri.crash_trigger.triggered) {
    cautionReasons.push("Crash trigger conditions met");
  }

  // VIX complacency warning
  if (vixRegime.action === "SELL") {
    cautionReasons.push(`VIX regime: SELL — complacency at ${vix.toFixed(1)}`);
  }

  // Insider activity adjustments
  const insider = computeInsiderAdjustment(insiderActivity);
  if (insider.reasons.length > 0) {
    cautionReasons.push(...insider.reasons);
  }

  if (cautionReasons.length > 0) {
    overrides.push("Reduce position sizes, prefer defined-risk structures");
    if (criScore >= 50) overrides.push("Consider hedging existing positions");
    if (vixRegime.action === "BUY") overrides.push("VIX regime favors equity accumulation despite caution");
    if (vixRegime.action === "SELL") overrides.push("VIX regime: take profits, reduce equity exposure");
    return {
      signal: "CAUTION",
      reasons: cautionReasons,
      overrides,
      confidence: Math.max(10, 70 - cautionReasons.length * 5 + insider.adjustment),
      vixRegime,
      insiderContext: insider.context ?? undefined,
    };
  }

  // ─── TRADE ───────────────────────────────────────
  reasons.push("Market is open");
  if (criScore < 25) reasons.push(`CRI is LOW (${criScore.toFixed(1)})`);
  else reasons.push(`CRI is ELEVATED but manageable (${criScore.toFixed(1)})`);
  if (vix < 20) reasons.push(`VIX is calm (${vix.toFixed(1)})`);

  // Add VIX regime context
  if (vixRegime.action === "SELL") {
    reasons.push(`VIX regime: complacency zone (${vix.toFixed(1)}) — consider taking profits`);
  }

  // Insider context for TRADE verdict
  if (insider.reasons.length > 0) {
    reasons.push(...insider.reasons);
  }

  return {
    signal: "TRADE",
    reasons,
    overrides: ["Monitor for intraday regime shifts"],
    confidence: Math.min(95, Math.max(10, 60 + (50 - criScore) + insider.adjustment)),
    vixRegime,
    insiderContext: insider.context ?? undefined,
  };
}
