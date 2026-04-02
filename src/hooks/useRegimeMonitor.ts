/**
 * Market Regime & Fragility Monitor — Data Hook
 *
 * Fetches FRED + Finnhub data and computes regime scores.
 * Uses a shared single-flight loader so duplicate hook mounts do not rescan in parallel.
 */

import { useState, useEffect, useCallback } from "react";
import { computeRegimeMonitor, type RegimeMonitorResult, type RegimeInputs } from "../lib/regimeScoring";
import { computeSMA } from "../lib/marketScoring";
import { getCredential } from "../lib/credentials";
import { useMarketHours } from "./useMarketHours";
import { finnhubFetch, fredFetchSeries } from "../api/dataFetchers";

const CACHE_KEY = "sibt_regime_monitor";
const CACHE_TTL = 3 * 60_000; // 3 min during market hours
const CLOSED_CACHE_TTL = 30 * 60_000; // 30 min when closed

type FinnhubQuote = { c: number; dp: number; pc: number; o: number; h: number; l: number };

let memoryRegime: { data: RegimeMonitorResult; ts: number } | null = null;
let inflightRegimePromise: Promise<{ data: RegimeMonitorResult; ts: number } | null> | null = null;

function isMarketActive(status: string): boolean {
  return status === "OPEN" || status === "PRE_MARKET" || status === "AFTER_HOURS";
}

function readCachedRegime(): { data: RegimeMonitorResult; ts: number } | null {
  if (memoryRegime) return memoryRegime;
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: RegimeMonitorResult; ts?: number };
    if (!parsed?.data || typeof parsed.ts !== "number") return null;
    memoryRegime = { data: parsed.data, ts: parsed.ts };
    return memoryRegime;
  } catch {
    return null;
  }
}

function writeCachedRegime(snapshot: { data: RegimeMonitorResult; ts: number }) {
  memoryRegime = snapshot;

  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore cache write failures
  }
}

function getFreshCachedRegime(maxAgeMs: number): { data: RegimeMonitorResult; ts: number } | null {
  const cached = readCachedRegime();
  if (!cached) return null;
  return Date.now() - cached.ts < maxAgeMs ? cached : null;
}

export function getCachedRegimeMonitor(): RegimeMonitorResult | null {
  return getFreshCachedRegime(CLOSED_CACHE_TTL)?.data ?? null;
}

async function fetchFreshRegimeMonitor(): Promise<{ data: RegimeMonitorResult; ts: number }> {
  const apiKey = getCredential("finnhub") ?? undefined;

  const [
    vixSeries,
    sp500Series,
    hySpreadSeries,
    dgs2Series,
    dgs10Series,
    vix3mSeries,
  ] = await Promise.all([
    fredFetchSeries("VIXCLS", 5),
    fredFetchSeries("SP500", 250),
    fredFetchSeries("BAMLH0A0HYM2", 5),
    fredFetchSeries("DGS2", 5),
    fredFetchSeries("DGS10", 5),
    fredFetchSeries("VXVCLS", 5),
  ]);

  const vix = vixSeries[0];
  const vixPrev = vixSeries[1];
  const hySpread = hySpreadSeries[0];
  const twoYearYield = dgs2Series[0];
  const tenYearYield = dgs10Series[0];
  const vix3m = vix3mSeries[0];

  let spxPrice: number | undefined;
  let spxSma200: number | undefined;
  if (sp500Series.length > 0) {
    spxPrice = sp500Series[0];
    const chronological = [...sp500Series].reverse();
    spxSma200 = computeSMA(chronological, 200);
  }

  const [spyQuote, rspQuote] = await Promise.all([
    finnhubFetch<FinnhubQuote>("quote", { symbol: "SPY" }, apiKey).catch((err) => { console.warn("[useRegimeMonitor] SPY quote fetch failed:", err); return null; }),
    finnhubFetch<FinnhubQuote>("quote", { symbol: "RSP" }, apiKey).catch((err) => { console.warn("[useRegimeMonitor] RSP quote fetch failed:", err); return null; }),
  ]);

  await new Promise((resolve) => setTimeout(resolve, 500));

  const [hygQuote, tltQuote] = await Promise.all([
    finnhubFetch<FinnhubQuote>("quote", { symbol: "HYG" }, apiKey).catch((err) => { console.warn("[useRegimeMonitor] HYG quote fetch failed:", err); return null; }),
    finnhubFetch<FinnhubQuote>("quote", { symbol: "TLT" }, apiKey).catch((err) => { console.warn("[useRegimeMonitor] TLT quote fetch failed:", err); return null; }),
  ]);

  if (spyQuote?.c) spxPrice = spyQuote.c;

  const sectors = ["XLK", "XLF", "XLV", "XLY", "XLP", "XLE", "XLI", "XLB", "XLRE", "XLC", "XLU"];
  const sectorChanges: { symbol: string; change: number }[] = [];

  for (let i = 0; i < sectors.length; i += 4) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 500));

    const batch = sectors.slice(i, i + 4);
    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const quote = await finnhubFetch<FinnhubQuote>("quote", { symbol }, apiKey);
          return { symbol, change: quote.dp ?? 0 };
        } catch (err) {
          console.warn(`[useRegimeMonitor] sector ${symbol} fetch failed:`, err);
          return null;
        }
      }),
    );

    for (const result of results) {
      if (result) sectorChanges.push(result);
    }
  }

  const inputs: RegimeInputs = {
    spxPrice,
    spxSma200,
    hySpread,
    twoYearYield,
    tenYearYield,
    vix,
    vixPrev,
    vix3m,
    rspPrice: rspQuote?.c,
    spyPrice: spyQuote?.c,
    rspPrev: rspQuote?.pc,
    spyPrev: spyQuote?.pc,
    hygPrice: hygQuote?.c,
    tltPrice: tltQuote?.c,
    moveIndex: undefined,
    sectorChanges,
  };

  const snapshot = {
    data: computeRegimeMonitor(inputs),
    ts: Date.now(),
  };

  writeCachedRegime(snapshot);
  return snapshot;
}

async function loadRegimeMonitor(
  maxAgeMs: number,
  force = false,
): Promise<{ data: RegimeMonitorResult; ts: number } | null> {
  if (!force) {
    const cached = getFreshCachedRegime(maxAgeMs);
    if (cached) return cached;
  }

  if (inflightRegimePromise) {
    return inflightRegimePromise;
  }

  inflightRegimePromise = fetchFreshRegimeMonitor().finally(() => {
    inflightRegimePromise = null;
  });

  return inflightRegimePromise;
}

export function useRegimeMonitor() {
  const [regime, setRegime] = useState<RegimeMonitorResult | null>(() => getCachedRegimeMonitor());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useMarketHours();

  const refresh = useCallback(async (force = true) => {
    setLoading(true);
    setError(null);

    try {
      const snapshot = await loadRegimeMonitor(CACHE_TTL, force);
      setRegime(snapshot?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regime data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const maxAgeMs = isMarketActive(status) ? CACHE_TTL : CLOSED_CACHE_TTL;
    const cached = getFreshCachedRegime(maxAgeMs);

    if (cached) {
      setRegime(cached.data);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    void loadRegimeMonitor(maxAgeMs)
      .then((snapshot) => {
        if (!active) return;
        setRegime(snapshot?.data ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load regime data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  useEffect(() => {
    if (!isMarketActive(status)) return;

    const interval = setInterval(() => {
      void refresh(false);
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, [refresh, status]);

  return { regime, loading, error, refresh: () => refresh(true) };
}
