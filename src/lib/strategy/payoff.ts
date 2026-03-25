export interface SimulatorLeg {
  action: "buy" | "sell";
  type: "stock" | "call" | "put";
  qty: number;
  strike: number;
  premium: number; // per share
}

export interface PayoffPoint {
  price: number;
  pnl: number;
}

export interface PayoffMetrics {
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  riskReward: number; // maxProfit / |maxLoss|, capped at 99
}

/** Compute P&L at expiration for a single underlying price */
export function computePayoffAtExpiry(
  legs: SimulatorLeg[],
  underlyingPrice: number,
): number {
  let pnl = 0;
  for (const leg of legs) {
    const dir = leg.action === "buy" ? 1 : -1;

    if (leg.type === "stock") {
      // Stock: linear payoff, qty is number of shares
      pnl += dir * leg.qty * (underlyingPrice - leg.strike);
    } else if (leg.type === "call") {
      // Options: qty is number of contracts, each = 100 shares
      const intrinsic = Math.max(0, underlyingPrice - leg.strike);
      const contractPnl = dir * (intrinsic - leg.premium);
      pnl += contractPnl * leg.qty * 100;
    } else {
      // put
      const intrinsic = Math.max(0, leg.strike - underlyingPrice);
      const contractPnl = dir * (intrinsic - leg.premium);
      pnl += contractPnl * leg.qty * 100;
    }
  }
  return pnl;
}

/** Generate full payoff curve across a price range */
export function computePayoffCurve(
  legs: SimulatorLeg[],
  currentPrice: number,
  points = 200,
): PayoffPoint[] {
  if (legs.length === 0 || currentPrice <= 0) return [];

  const low = currentPrice * 0.7;
  const high = currentPrice * 1.3;
  const step = (high - low) / points;
  const curve: PayoffPoint[] = [];

  for (let i = 0; i <= points; i++) {
    const price = low + step * i;
    curve.push({ price, pnl: computePayoffAtExpiry(legs, price) });
  }
  return curve;
}

/** Extract key metrics from a payoff curve */
export function computeKeyMetrics(
  legs: SimulatorLeg[],
  currentPrice: number,
): PayoffMetrics {
  const curve = computePayoffCurve(legs, currentPrice, 500);
  if (curve.length === 0)
    return { maxProfit: 0, maxLoss: 0, breakevens: [], riskReward: 0 };

  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  const breakevens: number[] = [];

  for (let i = 0; i < curve.length; i++) {
    const p = curve[i].pnl;
    if (p > maxProfit) maxProfit = p;
    if (p < maxLoss) maxLoss = p;

    // Detect zero crossings
    if (i > 0) {
      const prev = curve[i - 1].pnl;
      const curr = curve[i].pnl;
      if ((prev <= 0 && curr > 0) || (prev >= 0 && curr < 0)) {
        // Linear interpolation
        const ratio = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
        const be = curve[i - 1].price + ratio * (curve[i].price - curve[i - 1].price);
        breakevens.push(Math.round(be * 100) / 100);
      }
    }
  }

  const absLoss = Math.abs(maxLoss);
  const riskReward = absLoss > 0 ? Math.min(maxProfit / absLoss, 99) : 99;

  return {
    maxProfit: Math.round(maxProfit),
    maxLoss: Math.round(maxLoss),
    breakevens,
    riskReward: Math.round(riskReward * 100) / 100,
  };
}
