/**
 * Hook that fetches earnings intelligence data for a given symbol.
 *
 * Data sources:
 * - Finnhub stock/earnings — past earnings with actual vs estimate
 * - FMP historical-price-full — daily prices around each earnings date
 * - Finnhub stock/insider-transactions — recent insider buys/sells
 */

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "../api/edgeHeaders";
import { getHistoricalPrice, type FmpHistoricalPrice } from "../api/fmpClient";

/* ─── Types ─────────────────────────────────────────── */

export type EarningsHistoryEntry = {
  date: string;
  quarter: number;
  year: number;
  epsEstimate: number | null;
  epsActual: number | null;
  surprisePercent: number | null;
  priceChange1d: number | null;
  priceChange5d: number | null;
};

export type EarningsIntelData = {
  symbol: string;
  history: EarningsHistoryEntry[];
  beatStreak: number;
  avgSurprise: number;
  avg1dMove: number;
  avg5dMove: number;
  avgPositiveSurpriseMove: number;
  avgNegativeSurpriseMove: number;
  earningsScore: number;
  scoreBias: "bullish" | "bearish" | "neutral";
  insiderSignal?: "bullish" | "bearish" | "neutral";
  insiderBuys?: number;
  insiderSells?: number;
  currentEpsEstimate?: number;
  currentRevEstimate?: number;
};

/* ─── Helpers ───────────────────────────────────────── */

function calcPriceChange(prices: FmpHistoricalPrice[], earningsDate: string, offset: number): number | null {
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  // Find the trading day on or just after earnings date
  const dayOfIdx = sorted.findIndex((p) => p.date >= earningsDate);
  if (dayOfIdx < 0) return null;

  const closeOnDay = sorted[dayOfIdx]?.close;
  const closeAfter = sorted[dayOfIdx + offset]?.close;
  if (closeOnDay == null || closeAfter == null || closeOnDay === 0) return null;
  return ((closeAfter - closeOnDay) / closeOnDay) * 100;
}

function calculateEarningsScore(
  history: EarningsHistoryEntry[],
  beatStreak: number,
  avgSurprise: number,
  insiderBuys: number,
  insiderSells: number,
): number {
  let score = 0;

  // 1. Beat streak: up to 25 points
  if (beatStreak >= 8) score += 25;
  else if (beatStreak >= 4) score += 15;
  else if (beatStreak >= 1) score += 8;

  // 2. Average surprise magnitude: up to 20 points
  const absSurprise = Math.abs(avgSurprise);
  if (absSurprise > 10) score += 20;
  else if (absSurprise > 5) score += 15;
  else if (absSurprise > 1) score += 10;
  else score += 5;

  // 3. Post-earnings price reaction consistency: up to 20 points
  // beat + positive 1d move = consistent
  const beats = history.filter((h) => (h.surprisePercent ?? 0) > 0);
  const consistentBeats = beats.filter((h) => (h.priceChange1d ?? 0) > 0).length;
  if (beats.length > 0) {
    const consistency = consistentBeats / beats.length;
    score += Math.round(consistency * 20);
  }

  // 4. Insider activity: up to 15 points
  const netInsider = insiderBuys - insiderSells;
  if (netInsider > 0) score += 15;
  else if (netInsider === 0) score += 8;
  // net selling = 0 points

  // 5. Analyst revision trend (inferred from estimates improving): up to 10 points
  const withEstimates = history.filter((h) => h.epsEstimate != null);
  if (withEstimates.length >= 2) {
    // Check if recent estimates are higher than older ones
    const recent = withEstimates.slice(0, 2);
    const older = withEstimates.slice(2, 4);
    if (older.length > 0) {
      const recentAvg = recent.reduce((s, h) => s + (h.epsEstimate ?? 0), 0) / recent.length;
      const olderAvg = older.reduce((s, h) => s + (h.epsEstimate ?? 0), 0) / older.length;
      if (recentAvg > olderAvg) score += 10;
      else if (recentAvg === olderAvg) score += 5;
    } else {
      score += 5;
    }
  }

  // 6. Recent momentum: up to 10 points
  const lastTwo = history.slice(0, 2);
  const lastTwoBeats = lastTwo.filter((h) => (h.surprisePercent ?? 0) > 0).length;
  if (lastTwoBeats === 2) score += 10;
  else if (lastTwoBeats === 1) score += 5;

  return Math.min(100, Math.max(0, score));
}

/* ─── Hook ──────────────────────────────────────────── */

export function useEarningsIntel(symbol: string): {
  data: EarningsIntelData | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<EarningsIntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntel = useCallback(async () => {
    if (!symbol || !isSupabaseConfigured()) return;
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getEdgeHeaders();

      // 1. Fetch earnings history from Finnhub (last 8 quarters)
      const earningsRes = await fetch(
        `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/earnings&symbol=${symbol}&limit=8`,
        { headers },
      );
      if (!earningsRes.ok) throw new Error(`Earnings fetch failed: ${earningsRes.status}`);
      const earningsRaw = await earningsRes.json();

      if (!Array.isArray(earningsRaw) || earningsRaw.length === 0) {
        throw new Error(`No earnings history found for ${symbol}`);
      }

      // Sort by date descending (most recent first)
      const sortedEarnings = earningsRaw
        .map((e: { period: string; quarter: number; year: number; actual: number | null; estimate: number | null; surprisePercent: number | null }) => ({
          date: e.period,
          quarter: e.quarter,
          year: e.year,
          epsActual: e.actual,
          epsEstimate: e.estimate,
          surprisePercent: e.surprisePercent,
        }))
        .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));

      // 2. Fetch historical prices from FMP for post-earnings moves
      // Get date range covering all earnings dates with buffer
      const oldestDate = sortedEarnings[sortedEarnings.length - 1]?.date;
      const newestDate = sortedEarnings[0]?.date;
      let prices: FmpHistoricalPrice[] = [];

      if (oldestDate && newestDate) {
        // Add buffer: 14 days before oldest, 14 days after newest
        const from = new Date(oldestDate + "T12:00:00");
        from.setDate(from.getDate() - 14);
        const to = new Date(newestDate + "T12:00:00");
        to.setDate(to.getDate() + 14);

        try {
          const priceData = await getHistoricalPrice(
            symbol,
            from.toISOString().split("T")[0],
            to.toISOString().split("T")[0],
          );
          prices = priceData?.historical ?? [];
        } catch {
          // Price data is optional — continue without it
        }
      }

      // 3. Calculate price changes for each earnings date
      const history: EarningsHistoryEntry[] = sortedEarnings.map(
        (e: { date: string; quarter: number; year: number; epsEstimate: number | null; epsActual: number | null; surprisePercent: number | null }) => ({
          date: e.date,
          quarter: e.quarter,
          year: e.year,
          epsEstimate: e.epsEstimate,
          epsActual: e.epsActual,
          surprisePercent: e.surprisePercent,
          priceChange1d: prices.length > 0 ? calcPriceChange(prices, e.date, 1) : null,
          priceChange5d: prices.length > 0 ? calcPriceChange(prices, e.date, 5) : null,
        }),
      );

      // 4. Fetch insider activity from Finnhub (last 90 days)
      let insiderBuys = 0;
      let insiderSells = 0;
      let insiderSignal: "bullish" | "bearish" | "neutral" = "neutral";

      try {
        const insiderRes = await fetch(
          `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/insider-transactions&symbol=${symbol}`,
          { headers },
        );
        if (insiderRes.ok) {
          const insiderData = await insiderRes.json();
          const transactions = insiderData?.data ?? [];
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          for (const tx of transactions) {
            const txDate = new Date(tx.transactionDate);
            if (txDate < ninetyDaysAgo) continue;
            // "P" = purchase, "S" = sale, "A" = acquisition (grant)
            if (tx.transactionCode === "P") insiderBuys++;
            else if (tx.transactionCode === "S") insiderSells++;
          }

          if (insiderBuys > insiderSells) insiderSignal = "bullish";
          else if (insiderSells > insiderBuys) insiderSignal = "bearish";
        }
      } catch {
        // Insider data is optional
      }

      // 5. Compute aggregates
      const beatsOnly = history.filter((h) => (h.surprisePercent ?? 0) > 0);
      const missesOnly = history.filter((h) => (h.surprisePercent ?? 0) < 0);

      // Beat streak: consecutive beats from most recent
      let beatStreak = 0;
      for (const h of history) {
        if ((h.surprisePercent ?? 0) > 0) beatStreak++;
        else break;
      }

      const avgSurprise =
        history.length > 0
          ? history.reduce((s, h) => s + (h.surprisePercent ?? 0), 0) / history.length
          : 0;

      const abs1dMoves = history.filter((h) => h.priceChange1d != null).map((h) => Math.abs(h.priceChange1d!));
      const abs5dMoves = history.filter((h) => h.priceChange5d != null).map((h) => Math.abs(h.priceChange5d!));

      const avg1dMove = abs1dMoves.length > 0 ? abs1dMoves.reduce((s, v) => s + v, 0) / abs1dMoves.length : 0;
      const avg5dMove = abs5dMoves.length > 0 ? abs5dMoves.reduce((s, v) => s + v, 0) / abs5dMoves.length : 0;

      const beatMoves = beatsOnly.filter((h) => h.priceChange1d != null).map((h) => h.priceChange1d!);
      const missMoves = missesOnly.filter((h) => h.priceChange1d != null).map((h) => h.priceChange1d!);

      const avgPositiveSurpriseMove = beatMoves.length > 0 ? beatMoves.reduce((s, v) => s + v, 0) / beatMoves.length : 0;
      const avgNegativeSurpriseMove = missMoves.length > 0 ? missMoves.reduce((s, v) => s + v, 0) / missMoves.length : 0;

      const earningsScore = calculateEarningsScore(history, beatStreak, avgSurprise, insiderBuys, insiderSells);
      const scoreBias: "bullish" | "bearish" | "neutral" =
        earningsScore >= 70 ? "bullish" : earningsScore < 40 ? "bearish" : "neutral";

      setData({
        symbol,
        history,
        beatStreak,
        avgSurprise,
        avg1dMove,
        avg5dMove,
        avgPositiveSurpriseMove,
        avgNegativeSurpriseMove,
        earningsScore,
        scoreBias,
        insiderSignal,
        insiderBuys,
        insiderSells,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch earnings intel");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  return { data, loading, error };
}
