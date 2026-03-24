/**
 * Backtest Hook — Fetches historical scores and computes backtesting results.
 *
 * Strategy: "Only trade on TRADE days" vs buy-and-hold SPY.
 * Computes cumulative returns, win rate, max drawdown.
 */

import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured } from "../lib/supabase";

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
  sibtReturn: number;           // % cumulative return following TRADE signals
  buyHoldReturn: number;        // % buy-and-hold return
  outperformance: number;       // sibt - buyHold
  maxDrawdown: number;          // worst peak-to-trough %
  winRate: number;              // % of TRADE days that were positive
  avgWinDay: number;            // avg % return on winning TRADE days
  avgLoseDay: number;           // avg % return on losing TRADE days
  dailyReturns: DailyReturn[];
  equityCurve: { date: string; sibt: number; buyHold: number }[];
};

export function useBacktest(period: "3M" | "6M" | "1Y" = "1Y") {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataAvailable, setDataAvailable] = useState(true);

  const periodDays = period === "3M" ? 63 : period === "6M" ? 126 : 252;

  const fetchBacktest = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${supabaseUrl}/rest/v1/historical_scores?select=date,market_score,signal,vix,spy_close,spy_change&order=date.asc&limit=${periodDays}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );

      if (!res.ok) throw new Error(`Failed to fetch historical data: ${res.status}`);

      const data: {
        date: string;
        market_score: number;
        signal: string;
        vix: number;
        spy_close: number;
        spy_change: number;
      }[] = await res.json();

      if (data.length < 10) {
        setDataAvailable(false);
        setResult(null);
        setLoading(false);
        return;
      }

      // Compute backtest
      const dailyReturns: DailyReturn[] = data.map((d) => ({
        date: d.date,
        signal: d.signal,
        spyClose: d.spy_close,
        spyChange: d.spy_change ?? 0,
        vix: d.vix,
        marketScore: d.market_score,
      }));

      let tradeDays = 0;
      let cautionDays = 0;
      let noTradeDays = 0;
      let tradeWins = 0;
      let tradeLosses = 0;
      let totalTradeWinPct = 0;
      let totalTradeLossPct = 0;

      // SIBT strategy: accumulate returns only on TRADE days
      let sibtCumulative = 100; // start with $100
      let buyHoldCumulative = 100;
      let sibtPeak = 100;
      let maxDrawdown = 0;

      const equityCurve: { date: string; sibt: number; buyHold: number }[] = [];

      for (const day of dailyReturns) {
        const dayReturn = day.spyChange / 100; // convert % to decimal

        // Buy and hold: always in the market
        buyHoldCumulative *= (1 + dayReturn);

        // SIBT strategy: only in the market on TRADE days
        if (day.signal === "TRADE") {
          tradeDays++;
          sibtCumulative *= (1 + dayReturn);
          if (dayReturn > 0) {
            tradeWins++;
            totalTradeWinPct += day.spyChange;
          } else {
            tradeLosses++;
            totalTradeLossPct += day.spyChange;
          }
        } else if (day.signal === "CAUTION") {
          cautionDays++;
          // Half-size on CAUTION days
          sibtCumulative *= (1 + dayReturn * 0.5);
        } else {
          noTradeDays++;
          // Flat on NO_TRADE days (0% return)
        }

        // Track drawdown
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

      setResult({
        period,
        totalDays: dailyReturns.length,
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
        dailyReturns,
        equityCurve,
      });
      setDataAvailable(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  }, [period, periodDays]);

  useEffect(() => {
    fetchBacktest();
  }, [fetchBacktest]);

  return { result, loading, error, dataAvailable, refresh: fetchBacktest };
}
