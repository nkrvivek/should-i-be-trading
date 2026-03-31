import { useCallback, useEffect, useRef, useState } from "react";
import type { InsiderTransaction, InsiderActivitySummary, InsiderSignal } from "../api/types";
import { fetchInsiderTransactions as fetchInsiderViaEdge } from "../api/freeDataClient";
import { dedupFetch } from "../api/fetchDedup";
import { getCredential } from "../lib/credentials";
import { isSupabaseConfigured } from "../lib/supabase";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

type CacheEntry = { data: InsiderActivitySummary; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<InsiderActivitySummary>>();

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function getCachedInsiderData(symbol: string): InsiderActivitySummary | null {
  const key = normalizeSymbol(symbol);
  if (!key) return null;

  const cached = cache.get(key);
  return cached && Date.now() - cached.ts < CACHE_TTL_MS ? cached.data : null;
}

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

async function loadInsiderSummary(symbol: string): Promise<InsiderActivitySummary> {
  let transactions: InsiderTransaction[] = [];

  const directKey = getCredential("finnhub");
  if (directKey) {
    const res = await dedupFetch(
      `/finnhub-api/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&token=${directKey}`,
      undefined,
      CACHE_TTL_MS,
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
  } else if (isSupabaseConfigured()) {
    const edgeData = await fetchInsiderViaEdge(symbol);
    transactions = edgeData.map((t) => ({
      ...t,
      transactionCode: (t as Record<string, unknown>).transactionCode as string ?? t.transactionType ?? "",
      filingDate: (t as Record<string, unknown>).filingDate as string ?? "",
      officerTitle: (t as Record<string, unknown>).officerTitle as string ?? "",
    }));
  } else {
    throw new Error("Configure Supabase or add a Finnhub API key in Settings.");
  }

  const summary = processTransactions(symbol, transactions);
  cache.set(symbol, { data: summary, ts: Date.now() });
  return summary;
}

function getOrCreateInsiderRequest(symbol: string): Promise<InsiderActivitySummary> {
  const cached = getCachedInsiderData(symbol);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(symbol);
  if (existing) return existing;

  const request = loadInsiderSummary(symbol).finally(() => inflight.delete(symbol));
  inflight.set(symbol, request);
  return request;
}

export function useInsiderTrading(symbol: string | null, enabled = true) {
  const [data, setData] = useState<InsiderActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    const key = symbol ? normalizeSymbol(symbol) : "";
    if (!key || !enabled) return;

    const cached = getCachedInsiderData(key);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const summary = await getOrCreateInsiderRequest(key);
      if (ctrl.signal.aborted) return;
      setData(summary);
      setError(null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Failed to fetch insider data");
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
    }
  }, [symbol, enabled]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
