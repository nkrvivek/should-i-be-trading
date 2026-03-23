import { useCallback, useEffect, useRef, useState } from "react";
import type { InsiderTransaction, InsiderActivitySummary, InsiderSignal } from "../api/types";
import { getCredential } from "../lib/credentials";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

type CacheEntry = { data: InsiderActivitySummary; ts: number };
const cache = new Map<string, CacheEntry>();

function getApiKey(): string | null {
  return getCredential("finnhub");
}

function classifySignal(buyValue: number, sellValue: number): { signal: InsiderSignal; score: number } {
  const total = buyValue + sellValue;
  if (total === 0) return { signal: "NEUTRAL", score: 0 };

  const buyRatio = buyValue / total;
  const sellRatio = sellValue / total;

  // Score: -100 (all selling) to +100 (all buying)
  const score = Math.round((buyRatio - sellRatio) * 100);

  if (score >= 40) return { signal: "HEAVY_BUYING", score };
  if (score >= 10) return { signal: "NET_BUYING", score };
  if (score <= -40) return { signal: "HEAVY_SELLING", score };
  if (score <= -10) return { signal: "NET_SELLING", score };
  return { signal: "NEUTRAL", score };
}

function processTransactions(symbol: string, raw: InsiderTransaction[]): InsiderActivitySummary {
  // Filter to last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = raw.filter((t) => t.transactionDate >= cutoffStr);

  let totalBuys = 0;
  let totalSells = 0;
  let buyValue = 0;
  let sellValue = 0;

  for (const t of recent) {
    const value = Math.abs(t.change) * (t.transactionPrice || 0);
    if (t.transactionCode === "P" || t.change > 0) {
      totalBuys++;
      buyValue += value;
    } else if (t.transactionCode === "S" || t.change < 0) {
      totalSells++;
      sellValue += value;
    }
  }

  const { signal, score } = classifySignal(buyValue, sellValue);

  return {
    symbol,
    transactions: recent.slice(0, 50), // keep last 50 for display
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

  const fetchData = useCallback(async () => {
    if (!symbol || !enabled) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      setError("Finnhub API key not configured. Add it in Settings or .env (VITE_FINNHUB_API_KEY).");
      return;
    }

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
      const res = await fetch(
        `/finnhub-api/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
        { signal: ctrl.signal },
      );

      if (!res.ok) {
        if (res.status === 429) throw new Error("Finnhub rate limit — try again in a minute");
        if (res.status === 403) throw new Error("Invalid Finnhub API key");
        throw new Error(`Finnhub error: ${res.status}`);
      }

      const json = await res.json();
      const transactions: InsiderTransaction[] = json.data ?? [];
      const summary = processTransactions(symbol, transactions);

      cache.set(symbol, { data: summary, ts: Date.now() });
      setData(summary);
      setError(null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Failed to fetch insider data");
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
