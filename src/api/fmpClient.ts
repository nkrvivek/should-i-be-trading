/**
 * Client for the FMP (Financial Modeling Prep) edge function proxy.
 *
 * All requests go through the Supabase edge function which adds the API key
 * and caches responses to stay within the 250 calls/day free tier.
 */

import { isSupabaseConfigured } from "../lib/supabase";

async function fmpCall<T>(params: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("FMP requires Supabase. Configure VITE_SUPABASE_URL.");
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fmp`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `FMP request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}

/* ─── Types ─────────────────────────────────────────── */

export interface FmpProfile {
  symbol: string;
  companyName: string;
  price: number;
  marketCap: number;
  beta: number;
  change: number;
  changePercentage: number;
  volume: number;
  averageVolume: number;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  description: string;
  ceo: string;
  fullTimeEmployees: string;
  ipoDate: string;
  website: string;
  range: string;
  lastDividend: number;
  isEtf: boolean;
  isActivelyTrading: boolean;
}

export interface FmpIncomeStatement {
  date: string;
  symbol: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsDiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
  ebitda: number;
  operatingExpenses: number;
  researchAndDevelopmentExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
}

export interface FmpBalanceSheet {
  date: string;
  symbol: string;
  calendarYear: string;
  period: string;
  totalAssets: number;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  cashAndCashEquivalents: number;
  longTermDebt: number;
  shortTermDebt: number;
  totalDebt: number;
  netDebt: number;
  goodwill: number;
  intangibleAssets: number;
  inventory: number;
  totalInvestments: number;
}

export interface FmpRatiosTTM {
  peRatioTTM: number;
  pbRatioTTM: number;
  debtEquityRatioTTM: number;
  currentRatioTTM: number;
  quickRatioTTM: number;
  returnOnEquityTTM: number;
  returnOnAssetsTTM: number;
  grossProfitMarginTTM: number;
  operatingProfitMarginTTM: number;
  netProfitMarginTTM: number;
  freeCashFlowPerShareTTM: number;
  dividendYieldTTM: number;
  payoutRatioTTM: number;
  priceToSalesRatioTTM: number;
  priceToFreeCashFlowsRatioTTM: number;
  enterpriseValueOverEBITDATTM: number;
}

export interface FmpKeyMetricsTTM {
  marketCapTTM: number;
  revenuePerShareTTM: number;
  netIncomePerShareTTM: number;
  operatingCashFlowPerShareTTM: number;
  freeCashFlowPerShareTTM: number;
  peRatioTTM: number;
  priceToSalesRatioTTM: number;
  pbRatioTTM: number;
  evToSalesTTM: number;
  enterpriseValueOverEBITDATTM: number;
  debtToEquityTTM: number;
  debtToAssetsTTM: number;
  dividendYieldTTM: number;
  roeTTM: number;
  roicTTM: number;
}

export interface FmpAnalystEstimate {
  symbol: string;
  date: string;
  estimatedRevenueAvg: number;
  estimatedRevenueLow: number;
  estimatedRevenueHigh: number;
  estimatedEpsAvg: number;
  estimatedEpsLow: number;
  estimatedEpsHigh: number;
  numberAnalystsEstimatedRevenue: number;
  numberAnalystEstimatedEps: number;
}

export interface FmpPriceTarget {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMedian: number;
  targetConsensus: number;
}

export interface FmpEarnings {
  symbol: string;
  date: string;
  epsEstimated: number;
  epsActual: number | null;
  revenueEstimated: number;
  revenueActual: number | null;
}

/* ─── API Functions ─────────────────────────────────── */

export function getProfile(symbol: string): Promise<FmpProfile[]> {
  return fmpCall({ endpoint: "profile", symbol });
}

export function getIncomeStatement(symbol: string, period: "annual" | "quarter" = "annual", limit = 5): Promise<FmpIncomeStatement[]> {
  return fmpCall({ endpoint: "income-statement", symbol, period, limit });
}

export function getBalanceSheet(symbol: string, period: "annual" | "quarter" = "annual", limit = 5): Promise<FmpBalanceSheet[]> {
  return fmpCall({ endpoint: "balance-sheet", symbol, period, limit });
}

export function getRatiosTTM(symbol: string): Promise<FmpRatiosTTM[]> {
  return fmpCall({ endpoint: "ratios-ttm", symbol });
}

export function getKeyMetricsTTM(symbol: string): Promise<FmpKeyMetricsTTM[]> {
  return fmpCall({ endpoint: "key-metrics-ttm", symbol });
}

export function getAnalystEstimates(symbol: string, limit = 4): Promise<FmpAnalystEstimate[]> {
  return fmpCall({ endpoint: "analyst-estimates", symbol, limit });
}

export function getPriceTarget(symbol: string): Promise<FmpPriceTarget[]> {
  return fmpCall({ endpoint: "price-target", symbol });
}

export function getEarnings(symbol: string, limit = 8): Promise<FmpEarnings[]> {
  return fmpCall({ endpoint: "earnings", symbol, limit });
}

export function searchSymbol(query: string, limit = 10): Promise<Array<{ symbol: string; name: string; exchangeShortName: string }>> {
  return fmpCall({ endpoint: "search", query, limit });
}

/**
 * Fetch a complete fundamental snapshot for a ticker.
 * Bundles profile + ratios + key metrics + price target in parallel.
 * Uses ~4 API calls (cached server-side).
 */
export async function getFundamentalSnapshot(symbol: string) {
  const [profile, ratios, metrics, priceTarget] = await Promise.all([
    getProfile(symbol),
    getRatiosTTM(symbol),
    getKeyMetricsTTM(symbol),
    getPriceTarget(symbol).catch(() => [] as FmpPriceTarget[]),
  ]);

  return {
    profile: profile[0] ?? null,
    ratios: ratios[0] ?? null,
    metrics: metrics[0] ?? null,
    priceTarget: priceTarget[0] ?? null,
  };
}
