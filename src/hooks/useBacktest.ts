/**
 * Backtest Hook — Generates simulated historical signals using real SPY data from FRED.
 *
 * Strategy: "Only trade on TRADE days" vs buy-and-hold SPY.
 * Market scores are computed from VIX + SPY momentum (real FRED data).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { getEdgeHeaders } from "../api/edgeHeaders";

export type DailyReturn = {
  date: string;
  signal: string;
  spyClose: number;
  spyChange: number;
  vix: number;
  marketScore: number;
};

export type BacktestResult = {
  period: string;
  totalDays: number;
  tradeDays: number;
  cautionDays: number;
  noTradeDays: number;
  sibtReturn: number;
  buyHoldReturn: number;
  outperformance: number;
  maxDrawdown: number;
  winRate: number;
  avgWinDay: number;
  avgLoseDay: number;
  dailyReturns: DailyReturn[];
  equityCurve: { date: string; sibt: number; buyHold: number }[];
};

async function fetchFredSeries(seriesId: string, limit: number): Promise<{ date: string; value: number }[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Backtest data unavailable. Please sign in for automatic access.");

  const headers = await getEdgeHeaders();
  const res = await fetch(`${supabaseUrl}/functions/v1/fred?series_id=${seriesId}&limit=${limit + 20}&sort_order=desc`, {
    headers,
  });

  if (!res.ok) throw new Error(`FRED fetch failed: ${res.status}`);
  const data = await res.json();

  // FRED returns { observations: [{ date, value }] } or similar
  const observations = data.observations || data;
  if (!Array.isArray(observations)) return [];

  return observations
    .filter((o: { value: string }) => o.value !== ".")
    .map((o: { date: string; value: string }) => ({
      date: o.date,
      value: parseFloat(o.value),
    }))
    .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
}

function computeMarketScore(vix: number, spyMomentum5d: number, spyMomentum20d: number): number {
  // VIX score: lower = better
  let vixScore: number;
  if (vix < 15) vixScore = 90;
  else if (vix < 20) vixScore = 75;
  else if (vix < 25) vixScore = 55;
  else if (vix < 30) vixScore = 35;
  else if (vix < 35) vixScore = 20;
  else vixScore = 10;

  // Momentum score: positive momentum = better
  const momScore = Math.min(100, Math.max(0, 50 + spyMomentum5d * 20));
  const trendScore = Math.min(100, Math.max(0, 50 + spyMomentum20d * 10));

  // Weighted composite
  return Math.round(vixScore * 0.35 + momScore * 0.35 + trendScore * 0.3);
}

function signalFromScore(score: number): string {
  if (score >= 70) return "TRADE";
  if (score >= 55) return "CAUTION";
  return "NO_TRADE";
}

export function useBacktest(period: "3M" | "6M" | "1Y" = "3M") {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataAvailable, setDataAvailable] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const periodDays = period === "3M" ? 63 : period === "6M" ? 126 : 252;

  const fetchBacktest = useCallback(async () => {
    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // Fetch SPY (SP500) and VIX from FRED
      const [spyData, vixData] = await Promise.all([
        fetchFredSeries("SP500", periodDays + 25),
        fetchFredSeries("VIXCLS", periodDays + 25),
      ]);

      if (controller.signal.aborted) return;

      if (spyData.length < 20 || vixData.length < 20) {
        setDataAvailable(false);
        setResult(null);
        setLoading(false);
        return;
      }

      // Build a VIX lookup by date
      const vixMap = new Map(vixData.map((d) => [d.date, d.value]));

      // Take the last N+20 SPY entries (need lookback for momentum)
      const spySlice = spyData.slice(-(periodDays + 22));

      // Compute daily returns and signals
      const dailyReturns: DailyReturn[] = [];

      for (let i = 20; i < spySlice.length; i++) {
        const today = spySlice[i];
        const yesterday = spySlice[i - 1];
        const fiveDayAgo = spySlice[i - 5];
        const twentyDayAgo = spySlice[i - 20];

        const dayChange = ((today.value - yesterday.value) / yesterday.value) * 100;
        const mom5d = ((today.value - fiveDayAgo.value) / fiveDayAgo.value) * 100;
        const mom20d = ((today.value - twentyDayAgo.value) / twentyDayAgo.value) * 100;

        const vix = vixMap.get(today.date) ?? 20;
        const score = computeMarketScore(vix, mom5d, mom20d);
        const signal = signalFromScore(score);

        dailyReturns.push({
          date: today.date,
          signal,
          spyClose: today.value,
          spyChange: Math.round(dayChange * 100) / 100,
          vix,
          marketScore: score,
        });
      }

      // Limit to requested period
      const trimmed = dailyReturns.slice(-periodDays);

      if (controller.signal.aborted) return;

      if (trimmed.length < 10) {
        setDataAvailable(false);
        setResult(null);
        setLoading(false);
        return;
      }

      // Compute backtest metrics
      let tradeDays = 0, cautionDays = 0, noTradeDays = 0;
      let tradeWins = 0, tradeLosses = 0;
      let totalTradeWinPct = 0, totalTradeLossPct = 0;
      let sibtCumulative = 100, buyHoldCumulative = 100;
      let sibtPeak = 100, maxDrawdown = 0;
      const equityCurve: { date: string; sibt: number; buyHold: number }[] = [];

      for (const day of trimmed) {
        const dayReturn = day.spyChange / 100;
        buyHoldCumulative *= (1 + dayReturn);

        if (day.signal === "TRADE") {
          tradeDays++;
          sibtCumulative *= (1 + dayReturn);
          if (dayReturn > 0) { tradeWins++; totalTradeWinPct += day.spyChange; }
          else { tradeLosses++; totalTradeLossPct += day.spyChange; }
        } else if (day.signal === "CAUTION") {
          cautionDays++;
          sibtCumulative *= (1 + dayReturn * 0.5);
        } else {
          noTradeDays++;
        }

        if (sibtCumulative > sibtPeak) sibtPeak = sibtCumulative;
        const dd = ((sibtCumulative - sibtPeak) / sibtPeak) * 100;
        if (dd < maxDrawdown) maxDrawdown = dd;

        equityCurve.push({
          date: day.date,
          sibt: Math.round(sibtCumulative * 100) / 100,
          buyHold: Math.round(buyHoldCumulative * 100) / 100,
        });
      }

      const sibtReturn = ((sibtCumulative - 100) / 100) * 100;
      const buyHoldReturn = ((buyHoldCumulative - 100) / 100) * 100;
      const totalTradeDays = tradeWins + tradeLosses;

      if (controller.signal.aborted) return;

      setResult({
        period,
        totalDays: trimmed.length,
        tradeDays,
        cautionDays,
        noTradeDays,
        sibtReturn: Math.round(sibtReturn * 100) / 100,
        buyHoldReturn: Math.round(buyHoldReturn * 100) / 100,
        outperformance: Math.round((sibtReturn - buyHoldReturn) * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        winRate: totalTradeDays > 0 ? Math.round((tradeWins / totalTradeDays) * 100) : 0,
        avgWinDay: tradeWins > 0 ? Math.round((totalTradeWinPct / tradeWins) * 100) / 100 : 0,
        avgLoseDay: tradeLosses > 0 ? Math.round((totalTradeLossPct / tradeLosses) * 100) / 100 : 0,
        dailyReturns: trimmed,
        equityCurve,
      });
      setDataAvailable(true);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [period, periodDays]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { result, loading, error, dataAvailable, refresh: fetchBacktest };
}
