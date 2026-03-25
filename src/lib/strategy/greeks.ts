/**
 * Black-Scholes Greeks calculator.
 *
 * Pure math — no API calls. Given IV from Tradier (or user input),
 * computes Delta, Gamma, Theta, Vega for option legs.
 *
 * Uses standard normal CDF approximation (Abramowitz & Stegun).
 */

/* ─── Standard Normal CDF ──────────────────────────── */

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1.0 / (1.0 + p * abs);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs / 2);

  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/* ─── Types ─────────────────────────────────────────── */

export interface GreeksInput {
  type: "call" | "put";
  spotPrice: number;       // Current underlying price
  strike: number;
  timeToExpiry: number;    // In years (e.g., 30 days = 30/365)
  iv: number;              // Implied volatility as decimal (e.g., 0.30 = 30%)
  riskFreeRate?: number;   // Default 0.05 (5%)
  dividendYield?: number;  // Default 0
}

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number;   // Per day (divided by 365)
  vega: number;    // Per 1% IV change
  rho: number;     // Per 1% rate change
  iv: number;      // Echo back the IV used
  theoreticalPrice: number;
}

export interface LegGreeks {
  legIndex: number;
  perContract: GreeksResult;
  /** Aggregate = perContract × qty × direction (buy=+1, sell=-1) × 100 */
  aggregate: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface PositionGreeks {
  legs: LegGreeks[];
  /** Net Greeks for the entire position */
  net: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

/* ─── Black-Scholes Greeks ─────────────────────────── */

export function computeGreeks(input: GreeksInput): GreeksResult {
  const { type, spotPrice, strike, timeToExpiry, iv } = input;
  const r = input.riskFreeRate ?? 0.05;
  const q = input.dividendYield ?? 0;

  // Edge cases
  if (timeToExpiry <= 0 || iv <= 0 || spotPrice <= 0 || strike <= 0) {
    const intrinsic = type === "call"
      ? Math.max(0, spotPrice - strike)
      : Math.max(0, strike - spotPrice);
    return {
      delta: type === "call" ? (spotPrice > strike ? 1 : 0) : (spotPrice < strike ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      iv,
      theoreticalPrice: intrinsic,
    };
  }

  const sqrtT = Math.sqrt(timeToExpiry);
  const d1 = (Math.log(spotPrice / strike) + (r - q + 0.5 * iv * iv) * timeToExpiry) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;

  const eqT = Math.exp(-q * timeToExpiry);
  const erT = Math.exp(-r * timeToExpiry);

  // Common terms
  const nd1 = normalCDF(d1);
  const nd2 = normalCDF(d2);
  const npd1 = normalPDF(d1);

  let delta: number;
  let theoreticalPrice: number;
  let rho: number;

  if (type === "call") {
    delta = eqT * nd1;
    theoreticalPrice = spotPrice * eqT * nd1 - strike * erT * nd2;
    rho = (strike * timeToExpiry * erT * nd2) / 100;
  } else {
    delta = eqT * (nd1 - 1);
    theoreticalPrice = strike * erT * normalCDF(-d2) - spotPrice * eqT * normalCDF(-d1);
    rho = (-strike * timeToExpiry * erT * normalCDF(-d2)) / 100;
  }

  const gamma = (eqT * npd1) / (spotPrice * iv * sqrtT);

  // Theta: per day
  const thetaAnnual = type === "call"
    ? -(spotPrice * eqT * npd1 * iv) / (2 * sqrtT) - r * strike * erT * nd2 + q * spotPrice * eqT * nd1
    : -(spotPrice * eqT * npd1 * iv) / (2 * sqrtT) + r * strike * erT * normalCDF(-d2) - q * spotPrice * eqT * normalCDF(-d1);
  const theta = thetaAnnual / 365;

  // Vega: per 1% move in IV
  const vega = (spotPrice * eqT * npd1 * sqrtT) / 100;

  return {
    delta: round4(delta),
    gamma: round4(gamma),
    theta: round4(theta),
    vega: round4(vega),
    rho: round4(rho),
    iv,
    theoreticalPrice: Math.max(0, round4(theoreticalPrice)),
  };
}

/* ─── Position-Level Greeks ────────────────────────── */

import type { SimulatorLeg } from "./payoff";

/**
 * Compute Greeks for each leg and net position Greeks.
 * Requires IV and DTE context to be provided per leg.
 */
export function computePositionGreeks(
  legs: SimulatorLeg[],
  spotPrice: number,
  ivByLeg: number[],       // IV per leg (decimal, e.g. 0.30)
  daysToExpiry: number,     // Shared DTE for now
  riskFreeRate = 0.05,
): PositionGreeks {
  const timeToExpiry = daysToExpiry / 365;

  const net = { delta: 0, gamma: 0, theta: 0, vega: 0 };
  const legResults: LegGreeks[] = [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const iv = ivByLeg[i] ?? 0.30;

    if (leg.type === "stock") {
      // Stock legs: delta = 1 per share, no gamma/theta/vega
      const dir = leg.action === "buy" ? 1 : -1;
      const agg = {
        delta: dir * leg.qty,
        gamma: 0,
        theta: 0,
        vega: 0,
      };
      legResults.push({
        legIndex: i,
        perContract: {
          delta: dir,
          gamma: 0,
          theta: 0,
          vega: 0,
          rho: 0,
          iv: 0,
          theoreticalPrice: spotPrice,
        },
        aggregate: agg,
      });
      net.delta += agg.delta;
      continue;
    }

    const greeks = computeGreeks({
      type: leg.type,
      spotPrice,
      strike: leg.strike,
      timeToExpiry,
      iv,
      riskFreeRate,
    });

    const dir = leg.action === "buy" ? 1 : -1;
    const multiplier = dir * leg.qty * 100; // 100 shares per contract

    const agg = {
      delta: round4(greeks.delta * multiplier),
      gamma: round4(greeks.gamma * multiplier),
      theta: round4(greeks.theta * multiplier),
      vega: round4(greeks.vega * multiplier),
    };

    legResults.push({
      legIndex: i,
      perContract: greeks,
      aggregate: agg,
    });

    net.delta += agg.delta;
    net.gamma += agg.gamma;
    net.theta += agg.theta;
    net.vega += agg.vega;
  }

  return {
    legs: legResults,
    net: {
      delta: round4(net.delta),
      gamma: round4(net.gamma),
      theta: round4(net.theta),
      vega: round4(net.vega),
    },
  };
}

/* ─── Helpers ───────────────────────────────────────── */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Compute days to expiry from a date string (YYYY-MM-DD).
 */
export function daysUntilExpiry(expirationDate: string): number {
  const exp = new Date(expirationDate + "T16:00:00"); // Market close
  const now = new Date();
  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(diff));
}
