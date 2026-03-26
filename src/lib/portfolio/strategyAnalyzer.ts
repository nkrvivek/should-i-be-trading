/**
 * Strategy Analyzer — deterministic rule engine that analyzes positions
 * and returns strategy suggestions with pre-filled simulator legs.
 */
import type { SimulatorLeg } from "../strategy/payoff";
import { computeKeyMetrics } from "../strategy/payoff";
import type { BrokerPosition } from "../brokers/types";
import type { ManualPosition } from "../strategy/types";

export interface StrategySuggestion {
  strategyName: string;
  riskLevel: "conservative" | "moderate" | "aggressive";
  riskScore: number; // 1-10
  description: string;
  rationale: string;
  legs: SimulatorLeg[];
  estimatedMaxProfit: string;
  estimatedMaxLoss: string;
  maxLossCoverage: string;
}

export interface PositionAnalysis {
  symbol: string;
  position: {
    qty: number;
    side: string;
    avgEntryPrice: number;
    currentPrice: number;
    assetType: string;
  };
  suggestions: StrategySuggestion[];
  warnings: string[];
}

/** Format a dollar amount for display */
function formatDollar(n: number): string {
  if (!isFinite(n) || Math.abs(n) > 1e8) return "Unlimited";
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}K`;
  return `$${abs.toFixed(0)}`;
}

/** Build a suggestion with computed metrics */
function buildSuggestion(
  base: Omit<StrategySuggestion, "estimatedMaxProfit" | "estimatedMaxLoss">,
  currentPrice: number,
): StrategySuggestion {
  const metrics = computeKeyMetrics(base.legs, currentPrice);
  const maxProfit = metrics.maxProfit;
  const maxLoss = metrics.maxLoss;

  return {
    ...base,
    estimatedMaxProfit:
      maxProfit > currentPrice * 100 ? "Unlimited" : formatDollar(maxProfit),
    estimatedMaxLoss: formatDollar(Math.abs(maxLoss)),
  };
}

/** Analyze long stock positions with >= 100 shares */
function analyzeLongStock100Plus(
  symbol: string,
  qty: number,
  avgEntry: number,
  currentPrice: number,
): { suggestions: StrategySuggestion[]; warnings: string[] } {
  const suggestions: StrategySuggestion[] = [];
  const warnings: string[] = [];
  const contracts = Math.floor(qty / 100);
  const callStrike = Math.round(currentPrice * 1.05);
  const putStrike = Math.round(currentPrice * 0.95);
  const callPremium = Math.round(currentPrice * 0.02 * 100) / 100;
  const putPremium = Math.round(currentPrice * 0.02 * 100) / 100;

  // 1. Covered Call
  const ccLegs: SimulatorLeg[] = [
    { action: "buy", type: "stock", qty, strike: avgEntry, premium: 0 },
    { action: "sell", type: "call", qty: contracts, strike: callStrike, premium: callPremium },
  ];
  suggestions.push(
    buildSuggestion(
      {
        strategyName: "Covered Call",
        riskLevel: "conservative",
        riskScore: 2,
        description: `Sell ${contracts} call${contracts > 1 ? "s" : ""} at $${callStrike} to generate income on your ${qty} shares.`,
        rationale:
          "Caps upside at the strike price but collects premium immediately. Best when IV is elevated and you expect modest upside.",
        legs: ccLegs,
        maxLossCoverage: `Premium cushion of $${(callPremium * contracts * 100).toFixed(0)}`,
      },
      currentPrice,
    ),
  );

  // 2. Collar
  const collarLegs: SimulatorLeg[] = [
    { action: "buy", type: "stock", qty, strike: avgEntry, premium: 0 },
    { action: "sell", type: "call", qty: contracts, strike: callStrike, premium: callPremium },
    { action: "buy", type: "put", qty: contracts, strike: putStrike, premium: putPremium },
  ];
  suggestions.push(
    buildSuggestion(
      {
        strategyName: "Collar",
        riskLevel: "conservative",
        riskScore: 2,
        description: `Hedge ${qty} shares with a ${putStrike}/${callStrike} collar for near-zero net cost.`,
        rationale:
          "Caps both upside and downside. The call premium offsets most or all of the put cost, giving you free downside protection.",
        legs: collarLegs,
        maxLossCoverage: `${Math.round(((currentPrice - putStrike) / currentPrice) * 100)}% downside protected`,
      },
      currentPrice,
    ),
  );

  // 3. Protective Put
  const ppLegs: SimulatorLeg[] = [
    { action: "buy", type: "stock", qty, strike: avgEntry, premium: 0 },
    { action: "buy", type: "put", qty: contracts, strike: putStrike, premium: putPremium },
  ];
  suggestions.push(
    buildSuggestion(
      {
        strategyName: "Protective Put",
        riskLevel: "conservative",
        riskScore: 3,
        description: `Buy ${contracts} put${contracts > 1 ? "s" : ""} at $${putStrike} to insure your ${qty} shares.`,
        rationale:
          "Unlimited upside with defined downside. Costs premium but protects against a significant drop.",
        legs: ppLegs,
        maxLossCoverage: `95% downside protected below $${putStrike}`,
      },
      currentPrice,
    ),
  );

  // 4. Bull Call Spread
  const bcsLongStrike = Math.round(currentPrice);
  const bcsShortStrike = Math.round(currentPrice * 1.10);
  const bcsLongPremium = Math.round(currentPrice * 0.03 * 100) / 100;
  const bcsShortPremium = Math.round(currentPrice * 0.015 * 100) / 100;
  const bcsLegs: SimulatorLeg[] = [
    { action: "buy", type: "call", qty: contracts, strike: bcsLongStrike, premium: bcsLongPremium },
    { action: "sell", type: "call", qty: contracts, strike: bcsShortStrike, premium: bcsShortPremium },
  ];
  suggestions.push(
    buildSuggestion(
      {
        strategyName: "Bull Call Spread",
        riskLevel: "moderate",
        riskScore: 5,
        description: `Buy ${bcsLongStrike}/${bcsShortStrike} call spread for leveraged upside with defined risk.`,
        rationale:
          "Lower cost than buying calls outright. Profits if the stock rises moderately. Max loss limited to net debit.",
        legs: bcsLegs,
        maxLossCoverage: "Max loss limited to net debit paid",
      },
      currentPrice,
    ),
  );

  // Warning if no options protection
  warnings.push(`${qty} shares of ${symbol} with no downside protection`);

  return { suggestions, warnings };
}

/** Analyze long stock with < 100 shares */
function analyzeLongStockUnder100(
  symbol: string,
  qty: number,
  avgEntry: number,
  currentPrice: number,
): { suggestions: StrategySuggestion[]; warnings: string[] } {
  const suggestions: StrategySuggestion[] = [];
  const warnings: string[] = [];
  const putStrike = Math.round(currentPrice * 0.95);
  const putPremium = Math.round(currentPrice * 0.02 * 100) / 100;

  // 1. Protective Put
  const ppLegs: SimulatorLeg[] = [
    { action: "buy", type: "stock", qty, strike: avgEntry, premium: 0 },
    { action: "buy", type: "put", qty: 1, strike: putStrike, premium: putPremium },
  ];
  suggestions.push(
    buildSuggestion(
      {
        strategyName: "Protective Put",
        riskLevel: "conservative",
        riskScore: 3,
        description: `Buy 1 put at $${putStrike} to protect your ${qty} shares.`,
        rationale:
          "Even with fewer than 100 shares, you can buy a single put for downside protection. Note: contract covers 100 shares so you are over-hedged.",
        legs: ppLegs,
        maxLossCoverage: `Downside protected below $${putStrike}`,
      },
      currentPrice,
    ),
  );

  warnings.push(
    `Accumulate to 100 shares of ${symbol} to enable covered call strategies`,
  );

  return { suggestions, warnings };
}

/** Analyze short stock positions */
function analyzeShortStock(
  symbol: string,
  qty: number,
  avgEntry: number,
  currentPrice: number,
): { suggestions: StrategySuggestion[]; warnings: string[] } {
  const suggestions: StrategySuggestion[] = [];
  const warnings: string[] = [];
  const callStrike = Math.round(currentPrice * 1.05);
  const callPremium = Math.round(currentPrice * 0.02 * 100) / 100;

  // 1. Protective Call
  const pcLegs: SimulatorLeg[] = [
    { action: "sell", type: "stock", qty, strike: avgEntry, premium: 0 },
    { action: "buy", type: "call", qty: Math.max(1, Math.floor(qty / 100)), strike: callStrike, premium: callPremium },
  ];
  suggestions.push(
    buildSuggestion(
      {
        strategyName: "Protective Call",
        riskLevel: "conservative",
        riskScore: 3,
        description: `Buy call at $${callStrike} to cap upside risk on your ${qty} short shares.`,
        rationale:
          "Short positions have unlimited upside risk. A protective call caps your maximum loss at the call strike.",
        legs: pcLegs,
        maxLossCoverage: `Upside risk capped at $${callStrike}`,
      },
      currentPrice,
    ),
  );

  warnings.push(`${qty} short shares of ${symbol} — unlimited upside risk without protection`);

  return { suggestions, warnings };
}

/** Analyze option positions */
function analyzeOptionPosition(
  symbol: string,
  qty: number,
  side: string,
  currentPrice: number,
  optionType?: "call" | "put",
  strike?: number,
): { suggestions: StrategySuggestion[]; warnings: string[] } {
  const suggestions: StrategySuggestion[] = [];
  const warnings: string[] = [];

  const isLong = side === "long";
  const estPremium = Math.round(currentPrice * 0.03 * 100) / 100;

  if (isLong && optionType === "call") {
    // Long call — suggest selling higher strike to create bull call spread
    const longStrike = strike ?? Math.round(currentPrice);
    const shortStrike = Math.round(longStrike * 1.10);
    const shortPremium = Math.round(currentPrice * 0.015 * 100) / 100;

    const bcsLegs: SimulatorLeg[] = [
      { action: "buy", type: "call", qty, strike: longStrike, premium: estPremium },
      { action: "sell", type: "call", qty, strike: shortStrike, premium: shortPremium },
    ];
    suggestions.push(
      buildSuggestion(
        {
          strategyName: "Bull Call Spread",
          riskLevel: "moderate",
          riskScore: 5,
          description: `Sell ${qty} call${qty > 1 ? "s" : ""} at $${shortStrike} to reduce cost basis and define risk.`,
          rationale:
            "Selling a higher-strike call reduces your net debit and defines your max profit. Converts a naked long call into a spread.",
          legs: bcsLegs,
          maxLossCoverage: "Max loss limited to net debit paid",
        },
        currentPrice,
      ),
    );
    warnings.push(`Naked long call on ${symbol} — 100% premium at risk`);
  } else if (isLong && optionType === "put") {
    // Long put — suggest selling lower strike to create bear put spread
    const longStrike = strike ?? Math.round(currentPrice);
    const shortStrike = Math.round(longStrike * 0.90);
    const shortPremium = Math.round(currentPrice * 0.015 * 100) / 100;

    const bpsLegs: SimulatorLeg[] = [
      { action: "buy", type: "put", qty, strike: longStrike, premium: estPremium },
      { action: "sell", type: "put", qty, strike: shortStrike, premium: shortPremium },
    ];
    suggestions.push(
      buildSuggestion(
        {
          strategyName: "Bear Put Spread",
          riskLevel: "moderate",
          riskScore: 5,
          description: `Sell ${qty} put${qty > 1 ? "s" : ""} at $${shortStrike} to reduce cost basis and define risk.`,
          rationale:
            "Selling a lower-strike put reduces your net debit and defines your max profit. Converts a naked long put into a spread.",
          legs: bpsLegs,
          maxLossCoverage: "Max loss limited to net debit paid",
        },
        currentPrice,
      ),
    );
    warnings.push(`Naked long put on ${symbol} — 100% premium at risk`);
  } else if (isLong) {
    // Option type unknown
    warnings.push(`Long option on ${symbol} — 100% premium at risk`);
  }

  return { suggestions, warnings };
}

/**
 * Main entry point: analyze an array of broker and/or manual positions
 * and return strategy suggestions for each.
 */
export function analyzePositions(
  positions: Array<BrokerPosition | ManualPosition>,
): PositionAnalysis[] {
  const results: PositionAnalysis[] = [];

  for (const pos of positions) {
    const symbol = pos.symbol;
    const qty = pos.qty;
    const side = pos.side;
    const avgEntry = pos.avgEntryPrice;
    const currentPrice = pos.currentPrice;
    const assetType = pos.assetType;

    // Extract option details from ManualPosition
    const optionType = "optionType" in pos ? pos.optionType : undefined;
    const strike = "strike" in pos ? pos.strike : undefined;

    let analysis: { suggestions: StrategySuggestion[]; warnings: string[] };

    if (assetType === "option") {
      analysis = analyzeOptionPosition(symbol, qty, side, currentPrice, optionType, strike);
    } else if (side === "short") {
      analysis = analyzeShortStock(symbol, qty, avgEntry, currentPrice);
    } else if (qty >= 100) {
      analysis = analyzeLongStock100Plus(symbol, qty, avgEntry, currentPrice);
    } else {
      analysis = analyzeLongStockUnder100(symbol, qty, avgEntry, currentPrice);
    }

    // Only include positions that have suggestions or warnings
    if (analysis.suggestions.length > 0 || analysis.warnings.length > 0) {
      results.push({
        symbol,
        position: { qty, side, avgEntryPrice: avgEntry, currentPrice, assetType },
        suggestions: analysis.suggestions.sort((a, b) => a.riskScore - b.riskScore),
        warnings: analysis.warnings,
      });
    }
  }

  return results;
}
