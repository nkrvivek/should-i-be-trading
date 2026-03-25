export interface StrategyRecommendation {
  id: string;
  ticker: string;
  strategy: "covered_call" | "cash_secured_put" | "bull_call_spread" | "bear_put_spread" | "iron_condor" | "long_stock";
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasoning: string;
  legs: StrategyLeg[];
  metrics: {
    maxProfit: number;
    maxLoss: number;
    breakeven: number;
    returnOnRisk: number;
    probabilityOfProfit: number;
    daysToExpiry: number;
  };
  signals: string[];
  risks: string[];
  createdAt: string;
}

export interface StrategyLeg {
  action: "buy" | "sell";
  type: "stock" | "call" | "put";
  qty: number;
  strike?: number;
  expiration?: string;
  premium?: number;
}

export interface TradeJournalEntry {
  id: string;
  date: string;
  ticker: string;
  strategy: string;
  direction: "bullish" | "bearish" | "neutral";
  entry: { price: number; date: string };
  exit?: { price: number; date: string };
  pnl?: number;
  pnlPercent?: number;
  status: "open" | "closed" | "expired";
  signals: string[];
  marketScoreAtEntry: number;
  verdictAtEntry: string;
  notes: string;
  broker?: string;
}

export interface CoveredCallOpportunity {
  symbol: string;
  sharesHeld: number;
  currentPrice: number;
  strike: number;
  expiration: string;
  premium: number;
  premiumYield: number;
  annualizedReturn: number;
  distanceOTM: number;
  dte: number;
}

export interface CSPOpportunity {
  symbol: string;
  currentPrice: number;
  strike: number;
  expiration: string;
  premium: number;
  premiumYield: number;
  annualizedReturn: number;
  cashRequired: number;
  distanceOTM: number;
  dte: number;
  insiderSignal?: string;
}

export interface WashSaleViolation {
  symbol: string;
  lossDate: string;
  lossAmount: number;
  repurchaseDate: string;
  repurchasePrice: number;
  disallowedLoss: number;
  adjustedBasis: number;
  daysApart: number;
}
