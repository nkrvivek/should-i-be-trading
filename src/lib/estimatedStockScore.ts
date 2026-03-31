import { computeStockScore, type StockScore } from "./stockScore";

export interface StockMetricsSnapshot {
  symbol: string;
  currentPrice?: number | null;
  pe?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  eps?: number | null;
  revenueGrowthQuarterly?: number | null;
  profitMargin?: number | null;
  beta?: number | null;
}

export function estimateStockScoreFromMetrics(metrics: StockMetricsSnapshot): StockScore {
  return computeStockScore(metrics.symbol, {
    price: metrics.currentPrice ?? undefined,
    peRatio: metrics.pe ?? undefined,
    dividendYield: metrics.dividendYield ?? undefined,
    marketCap: metrics.marketCap ?? undefined,
    revenueGrowth: metrics.revenueGrowthQuarterly != null ? metrics.revenueGrowthQuarterly * 100 : undefined,
    netMargin: metrics.profitMargin ?? undefined,
    beta: metrics.beta ?? undefined,
  });
}
