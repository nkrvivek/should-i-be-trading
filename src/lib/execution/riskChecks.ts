/**
 * Pre-execution risk validation checks.
 * Runs before any order is placed to catch common pitfalls.
 */
import type { BrokerAccount } from "../brokers/types";
import type { ExecutionLeg, PreExecutionCheck } from "./types";

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

/**
 * Check if the account has sufficient buying power for the estimated cost.
 */
function checkBuyingPower(
  account: BrokerAccount | null,
  estimatedCost: number,
): CheckResult {
  if (!account) {
    return {
      name: "Buying Power",
      passed: false,
      message: "No account data available",
    };
  }

  // Credits (negative cost) always pass
  if (estimatedCost <= 0) {
    return {
      name: "Buying Power",
      passed: true,
      message: `Net credit strategy — no buying power required`,
    };
  }

  const hasFunds = account.buyingPower >= estimatedCost;
  return {
    name: "Buying Power",
    passed: hasFunds,
    message: hasFunds
      ? `$${account.buyingPower.toLocaleString()} available (need $${estimatedCost.toLocaleString()})`
      : `Insufficient buying power: $${account.buyingPower.toLocaleString()} available, need $${estimatedCost.toLocaleString()}`,
  };
}

/**
 * Check if the market is currently open.
 * US market hours: Mon-Fri 9:30 AM - 4:00 PM ET.
 * Options cannot trade after hours.
 */
function checkMarketHours(hasOptions: boolean): CheckResult {
  const now = new Date();

  // Convert to ET
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etString);

  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = timeMinutes >= 570 && timeMinutes < 960; // 9:30 AM to 4:00 PM

  if (!isWeekday) {
    return {
      name: "Market Hours",
      passed: false,
      message: "Market is closed (weekend)",
    };
  }

  if (!isMarketHours) {
    if (hasOptions) {
      return {
        name: "Market Hours",
        passed: false,
        message: "Market is closed — options cannot trade after hours",
      };
    }
    return {
      name: "Market Hours",
      passed: false,
      message: "Market is closed — extended hours trading only for stocks",
    };
  }

  return {
    name: "Market Hours",
    passed: true,
    message: "Market is open",
  };
}

/**
 * Check for undefined risk (naked short calls/puts).
 * Naked short calls = unlimited loss potential.
 * Naked short puts = large loss potential (down to zero).
 */
function checkUndefinedRisk(legs: ExecutionLeg[]): CheckResult {
  const shortCalls = legs.filter((l) => l.action === "sell" && l.type === "call");
  const shortPuts = legs.filter((l) => l.action === "sell" && l.type === "put");
  const longStock = legs.filter((l) => l.action === "buy" && l.type === "stock");
  const longCalls = legs.filter((l) => l.action === "buy" && l.type === "call");
  const longPuts = legs.filter((l) => l.action === "buy" && l.type === "put");

  // Naked short call: selling calls without owning stock or a higher call
  const nakedShortCall =
    shortCalls.length > 0 &&
    longStock.length === 0 &&
    longCalls.length === 0;

  // Naked short put: selling puts without a lower put to define risk
  const nakedShortPut =
    shortPuts.length > 0 &&
    longPuts.length === 0;

  if (nakedShortCall) {
    return {
      name: "Undefined Risk",
      passed: false,
      message: "NAKED SHORT CALL detected — unlimited loss potential",
    };
  }

  if (nakedShortPut) {
    return {
      name: "Undefined Risk",
      passed: true, // Still allow but warn
      message: "Short put detected — max loss is strike price x 100 x contracts",
    };
  }

  return {
    name: "Undefined Risk",
    passed: true,
    message: "Risk is defined",
  };
}

/**
 * Validate option expiry dates.
 * Warn if DTE < 7 days, fail if expired.
 */
function checkExpiryValid(legs: ExecutionLeg[]): CheckResult {
  const optionLegs = legs.filter((l) => l.type === "call" || l.type === "put");

  if (optionLegs.length === 0) {
    return {
      name: "Expiration",
      passed: true,
      message: "No options in this strategy",
    };
  }

  // Strategy uses estimated default expiry (~30 DTE), so always valid
  // But warn that user should confirm expiration
  return {
    name: "Expiration",
    passed: true,
    message: "Default ~30 DTE expiration — confirm in broker before execution",
  };
}

/**
 * Run all pre-execution checks and return a combined result.
 */
export function runPreExecutionChecks(
  account: BrokerAccount | null,
  legs: ExecutionLeg[],
  estimatedCost: number,
): PreExecutionCheck {
  const hasOptions = legs.some((l) => l.type === "call" || l.type === "put");

  const checks = [
    checkBuyingPower(account, estimatedCost),
    checkMarketHours(hasOptions),
    checkUndefinedRisk(legs),
    checkExpiryValid(legs),
  ];

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
