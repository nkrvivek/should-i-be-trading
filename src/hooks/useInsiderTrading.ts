import { useCallback, useEffect, useRef, useState } from "react";
import type { InsiderTransaction, InsiderActivitySummary, InsiderSignal } from "../api/types";
import { getCredential } from "../lib/credentials";
import { hasUWToken, fetchUWInsiderByTicker } from "../api/uwClient";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

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

function processUWTransactions(symbol: string, raw: { amount: number; price: string | null; stock_price: string | null; transaction_code: string; owner_name: string; transaction_date: string; filing_date?: string; officer_title?: string; sector?: string; security_title?: string; is_10b5_1?: boolean }[]): InsiderActivitySummary {
  let totalBuys = 0, totalSells = 0, buyValue = 0, sellValue = 0;
  const transactions: InsiderTransaction[] = [];

  for (const t of raw) {
    const price = parseFloat(t.price ?? "0") || parseFloat(t.stock_price ?? "0") || 0;
    const shares = Math.abs(t.amount);
    const value = shares * price;

    if (t.transaction_code === "P" || t.amount > 0) {
      totalBuys++;
      buyValue += value;
    } else if (t.transaction_code === "S" || t.transaction_code === "D" || t.amount < 0) {
      totalSells++;
      sellValue += value;
    }

    transactions.push({
      symbol,
      name: t.owner_name,
      share: shares,
      change: t.amount,
      transactionDate: t.transaction_date,
      filingDate: t.filing_date ?? "",
      transactionType: t.transaction_code === "P" ? "P - Purchase" : "S - Sale",
      transactionCode: t.transaction_code,
      transactionPrice: price,
      officerTitle: t.officer_title ?? "",
      sector: t.sector ?? "",
      securityTitle: t.security_title ?? "",
      is10b51: t.is_10b5_1 ?? false,
    });
  }

  const { signal, score } = classifySignal(buyValue, sellValue);

  return {
    symbol,
    transactions,
    totalBuys,
    totalSells,
    netShares: raw.reduce((sum, t) => sum + t.amount, 0),
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

    // For per-ticker lookups, prefer Finnhub (returns individual transactions with names/prices).
    // UW ticker-flow returns aggregated daily data without insider names.
    // Finnhub:
    const apiKey = getCredential("finnhub");
    if (!apiKey) {
      setError("No insider data source. Add UW token (recommended) or Finnhub key in Settings.");
      setLoading(false);
      return;
    }

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
      const transactions: InsiderTransaction[] = (json.data ?? []).map((t: Record<string, unknown>) => ({
        ...t,
        filingDate: (t.filingDate as string) ?? "",
        officerTitle: (t.officerTitle as string) ?? "",
      }));
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
