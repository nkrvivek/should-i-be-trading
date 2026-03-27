/**
 * Order Mapper — converts SimulatorLeg[] to OrderRequest[] for broker execution.
 * Builds OCC symbol format for options and orders legs correctly (buys first).
 */
import type { SimulatorLeg } from "../strategy/payoff";
import type { OrderRequest } from "../brokers/types";
import type { ExecutionLeg } from "./types";

/**
 * Build OCC option symbol: {UNDERLYING padded 6}{YYMMDD}{C|P}{strike*1000 padded 8}
 * Example: AAPL  260417C00185000
 */
function buildOccSymbol(
  underlying: string,
  expiration: string, // YYYYMMDD
  optionType: "call" | "put",
  strike: number,
): string {
  const sym = underlying.toUpperCase().padEnd(6, " ");
  // YYYYMMDD -> YYMMDD
  const yymmdd = expiration.length === 8
    ? expiration.slice(2)
    : expiration;
  const cp = optionType === "call" ? "C" : "P";
  const strikeInt = Math.round(strike * 1000);
  const strikePad = String(strikeInt).padStart(8, "0");
  return `${sym}${yymmdd}${cp}${strikePad}`;
}

/**
 * Generate a default expiration date ~30 DTE from today (YYYYMMDD format).
 * Rounds to the nearest Friday (standard option expiration).
 */
function defaultExpiration(): string {
  const target = new Date();
  target.setDate(target.getDate() + 30);
  // Move to next Friday
  const day = target.getDay();
  const daysToFriday = (5 - day + 7) % 7;
  target.setDate(target.getDate() + daysToFriday);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * Convert a SimulatorLeg into an ExecutionLeg with estimated pricing.
 */
export function toExecutionLeg(
  leg: SimulatorLeg,
  currentPrice: number,
): ExecutionLeg {
  const estimatedPrice =
    leg.type === "stock" ? currentPrice : leg.premium;

  return {
    action: leg.action,
    type: leg.type,
    qty: leg.qty,
    strike: leg.strike,
    premium: leg.premium,
    estimatedPrice,
    status: "pending",
  };
}

/**
 * Convert SimulatorLeg[] into OrderRequest[] suitable for broker placement.
 * Orders buys first (need to own shares before selling covered), then sells.
 */
export function mapLegsToOrders(
  legs: SimulatorLeg[],
  symbol: string,
  currentPrice: number,
): OrderRequest[] {
  const expiration = defaultExpiration();
  const orders: OrderRequest[] = [];

  // Sort: buys first, then sells
  const sorted = [...legs].sort((a, b) => {
    if (a.action === "buy" && b.action === "sell") return -1;
    if (a.action === "sell" && b.action === "buy") return 1;
    return 0;
  });

  for (const leg of sorted) {
    // Validate all values are positive finite numbers
    if (!isFinite(leg.qty) || leg.qty <= 0) continue;
    if (!isFinite(leg.strike) || leg.strike < 0) continue;

    if (leg.type === "stock") {
      orders.push({
        symbol: symbol.toUpperCase(),
        side: leg.action,
        type: "limit",
        qty: leg.qty,
        limitPrice: Math.round(currentPrice * 100) / 100,
        timeInForce: "day",
      });
    } else {
      // Option leg — build OCC symbol
      const optionType: "call" | "put" = leg.type;
      const occSymbol = buildOccSymbol(symbol, expiration, optionType, leg.strike);

      orders.push({
        symbol: occSymbol.trim(),
        side: leg.action,
        type: "limit",
        qty: leg.qty,
        limitPrice: Math.round(leg.premium * 100) / 100,
        timeInForce: "day",
        optionDetails: {
          underlying: symbol.toUpperCase(),
          strike: leg.strike,
          expiration,
          optionType,
          occSymbol: occSymbol.trim(),
        },
      });
    }
  }

  return orders;
}

/**
 * Convert all SimulatorLegs to ExecutionLegs (for UI display),
 * ordered buys-first.
 */
export function mapLegsToExecutionLegs(
  legs: SimulatorLeg[],
  currentPrice: number,
): ExecutionLeg[] {
  const sorted = [...legs].sort((a, b) => {
    if (a.action === "buy" && b.action === "sell") return -1;
    if (a.action === "sell" && b.action === "buy") return 1;
    return 0;
  });
  return sorted.map((leg) => toExecutionLeg(leg, currentPrice));
}
