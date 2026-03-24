import { useCallback, useEffect, useRef, useState } from "react";
import type { InsiderTransaction, InsiderActivitySummary, InsiderSignal } from "../api/types";
import { fetchInsiderTransactions as fetchInsiderViaEdge } from "../api/freeDataClient";
import { getCredential } from "../lib/credentials";
import { isSupabaseConfigured } from "../lib/supabase";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
const INITIAL_DELAY_MS = 8000; // Wait 8s for sector/score fetches to finish first

type CacheEntry = { data: InsiderActivitySummary; ts: number };
const cache = new Map<string, CacheEntry>();

function classifySignal(buyValue: number, sellValue: number): { signal: InsiderSignal; score: number } {
  const total = buyValue + sellValue;
  if (total === 0) return { signal: "NEUTRAL", score: 0 };

  const buyRatio = buyValue / total;
  const sellRatio = sellValue / total;
  const score = Math.round((buyRatio - sellRatio) * 100);

  if (score >= 40) return { signal: "HEAVY_BUYING", score };
  if (score >= 10) return { signal: "NET_BUYING", score };
  if (score <= -40) return { signal: "HEAVY_SELLING", score };
  if (score <= -10) return { signal: "NET_SELLING", score };
  return { signal: "NEUTRAL", score };
}

function processTransactions(symbol: string, raw: InsiderTransaction[]): InsiderActivitySummary {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = raw.filter((t) => t.transactionDate >= cutoffStr);

  let totalBuys = 0, totalSells = 0, buyValue = 0, sellValue = 0;

  for (const t of recent) {
    const value = Math.abs(t.change) * (t.transactionPrice || 0);
    // P = Purchase, S = Sale, M = Exercise, F = Tax, A = Award, G = Gift
    if (t.transactionCode === "P" || (t.transactionCode !== "S" && t.transactionCode !== "M" && t.transactionCode !== "F" && t.transactionCode !== "A" && t.transactionCode !== "G" && t.change > 0)) {
      totalBuys++;
      buyValue += value;
    } else if (t.transactionCode === "S" || t.transactionCode === "F") {
      totalSells++;
      sellValue += value;
    }
    // M (exercise), A (award), G (gift) are excluded from buy/sell classification
  }

  const { signal, score } = classifySignal(buyValue, sellValue);

  return {
    symbol,
    transactions: recent,
    totalBuys,
    totalSells,
    netShares: recent.reduce((sum, t) => sum + t.change, 0),
    netValue: buyValue - sellValue,
    buyValue,
    sellValue,
    signal,
    signalScore: score,
    period: "90d",
    lastUpdated: new Date().toISOString(),
  };
}

export function useInsiderTrading(symbol: string | null, enabled = true) {
  const [data, setData] = useState<InsiderActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!symbol || !enabled) return;

    // Check cache
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setData(cached.data);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);

    try {
      let transactions: InsiderTransaction[] = [];

      // Strategy 1: Direct Finnhub API (local dev with VITE_FINNHUB_API_KEY)
      const directKey = getCredential("finnhub");
      if (directKey) {
        const res = await fetch(
          `/finnhub-api/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&token=${directKey}`,
          { signal: ctrl.signal },
        );

        if (!res.ok) {
          if (res.status === 429) throw new Error("Finnhub rate limit — try again in 60 seconds.");
          if (res.status === 403) throw new Error("Invalid Finnhub API key");
          throw new Error(`Finnhub error: ${res.status}`);
        }

        const json = await res.json();
        transactions = (json.data ?? []).map((t: Record<string, unknown>) => ({
          ...t,
          filingDate: (t.filingDate as string) ?? "",
          officerTitle: (t.officerTitle as string) ?? "",
        }));
      }
      // Strategy 2: Supabase Edge Function (production, server-side Finnhub key)
      else if (isSupabaseConfigured()) {
        try {
          const edgeData = await fetchInsiderViaEdge(symbol);
          transactions = edgeData.map((t) => ({
            ...t,
            transactionCode: (t as Record<string, unknown>).transactionCode as string ?? t.transactionType ?? "",
            filingDate: (t as Record<string, unknown>).filingDate as string ?? "",
            officerTitle: (t as Record<string, unknown>).officerTitle as string ?? "",
          }));
        } catch (edgeErr) {
          const msg = edgeErr instanceof Error ? edgeErr.message : "Edge function error";
          // Auto-retry once after a delay (likely rate limited)
          if (!isRetry && retryCountRef.current < 2) {
            retryCountRef.current++;
            setLoading(false);
            setTimeout(() => fetchData(true), 5000);
            return;
          }
          throw new Error(msg.includes("429") || msg.includes("rate")
            ? "Finnhub rate limit. Try refreshing in 60 seconds."
            : `Insider data: ${msg}`);
        }
      } else {
        throw new Error("Configure Supabase or add a Finnhub API key in Settings.");
      }

      const summary = processTransactions(symbol, transactions);
      cache.set(symbol, { data: summary, ts: Date.now() });
      setData(summary);
      setError(null);
      retryCountRef.current = 0;
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Failed to fetch insider data");
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled]);

  useEffect(() => {
    // Delay initial fetch to avoid Finnhub rate limits from concurrent dashboard calls
    const hasDirectKey = !!getCredential("finnhub");
    const delay = hasDirectKey ? 0 : INITIAL_DELAY_MS;

    const timer = setTimeout(() => fetchData(), delay);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refresh: () => fetchData(false) };
}
