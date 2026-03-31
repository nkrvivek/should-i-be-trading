/**
 * Market Regime & Fragility Monitor — Data Hook
 *
 * Fetches FRED + Finnhub data and computes regime scores.
 * Follows useMarketScore.ts patterns: localStorage cache, auto-refresh, market hours awareness.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { computeRegimeMonitor, type RegimeMonitorResult, type RegimeInputs } from "../lib/regimeScoring";
import { computeSMA } from "../lib/marketScoring";
import { getCredential } from "../lib/credentials";
import { useMarketHours } from "./useMarketHours";
import { finnhubFetch, fredFetchSeries } from "../api/dataFetchers";

const CACHE_KEY = "sibt_regime_monitor";
const CACHE_TTL = 3 * 60_000; // 3 min during market hours
const CLOSED_CACHE_TTL = 30 * 60_000; // 30 min when closed

type FinnhubQuote = { c: number; dp: number; pc: number; o: number; h: number; l: number };

function readCachedRegime(): { data: RegimeMonitorResult; ts: number } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: RegimeMonitorResult; ts?: number };
    if (!parsed?.data || typeof parsed.ts !== "number") return null;
    return { data: parsed.data, ts: parsed.ts };
  } catch {
    return null;
  }
}

export function getCachedRegimeMonitor(): RegimeMonitorResult | null {
  const cached = readCachedRegime();
  if (!cached) return null;
  return Date.now() - cached.ts < CLOSED_CACHE_TTL ? cached.data : null;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useRegimeMonitor() {
  const [regime, setRegime] = useState<RegimeMonitorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useMarketHours();
  const fetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRegime = useCallback(async () => {
    if (fetchingRef.current) return;

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const apiKey = getCredential("finnhub") ?? undefined;

      // ── Phase 1: FRED data (all free, unlimited) ─────────────────

      const [
        vixSeries,       // VIXCLS: last 5 days
        sp500Series,     // SP500: 250 days for SMA200
        hySpreadSeries,  // BAMLH0A0HYM2: HY credit spread
        dgs2Series,      // DGS2: 2-year Treasury yield
        dgs10Series,     // DGS10: 10-year Treasury yield
        vix3mSeries,     // VXVCLS: 3-month VIX (VIX3M)
      ] = await Promise.all([
        fredFetchSeries("VIXCLS", 5),
        fredFetchSeries("SP500", 250),
        fredFetchSeries("BAMLH0A0HYM2", 5),
        fredFetchSeries("DGS2", 5),
        fredFetchSeries("DGS10", 5),
        fredFetchSeries("VXVCLS", 5),
      ]);

      if (controller.signal.aborted) return;

      // Parse FRED values (most recent first)
      const vix = vixSeries[0];
      const vixPrev = vixSeries[1];
      const hySpread = hySpreadSeries[0];
      const twoYearYield = dgs2Series[0];
      const tenYearYield = dgs10Series[0];
      const vix3m = vix3mSeries[0];

      // Compute SPX SMA200
      let spxPrice: number | undefined;
      let spxSma200: number | undefined;
      if (sp500Series.length > 0) {
        spxPrice = sp500Series[0];
        const chronological = [...sp500Series].reverse();
        spxSma200 = computeSMA(chronological, 200);
      }

      // ── Phase 2: Finnhub quotes (batched with delays) ───────────

      // Batch 1: SPY + RSP
      const [spyQuote, rspQuote] = await Promise.all([
        finnhubFetch<FinnhubQuote>("quote", { symbol: "SPY" }, apiKey).catch(() => null),
        finnhubFetch<FinnhubQuote>("quote", { symbol: "RSP" }, apiKey).catch(() => null),
      ]);

      if (controller.signal.aborted) return;

      // Small delay to avoid Finnhub rate limits
      await new Promise((r) => setTimeout(r, 500));

      if (controller.signal.aborted) return;

      // Batch 2: HYG + TLT
      const [hygQuote, tltQuote] = await Promise.all([
        finnhubFetch<FinnhubQuote>("quote", { symbol: "HYG" }, apiKey).catch(() => null),
        finnhubFetch<FinnhubQuote>("quote", { symbol: "TLT" }, apiKey).catch(() => null),
      ]);

      if (controller.signal.aborted) return;

      // Override SPX price with live SPY if available
      if (spyQuote?.c) spxPrice = spyQuote.c;

      // Sector data for breadth (reuse same Finnhub calls)
      const sectors = ["XLK", "XLF", "XLV", "XLY", "XLP", "XLE", "XLI", "XLB", "XLRE", "XLC", "XLU"];
      const sectorChanges: { symbol: string; change: number }[] = [];

      for (let i = 0; i < sectors.length; i += 4) {
        if (controller.signal.aborted) return;
        if (i > 0) await new Promise((r) => setTimeout(r, 500));
        if (controller.signal.aborted) return;
        const batch = sectors.slice(i, i + 4);
        const results = await Promise.all(
          batch.map(async (sym) => {
            try {
              const q = await finnhubFetch<FinnhubQuote>("quote", { symbol: sym }, apiKey);
              return { symbol: sym, change: q.dp ?? 0 };
            } catch {
              return null;
            }
          }),
        );
        for (const r of results) {
          if (r) sectorChanges.push(r);
        }
      }

      if (controller.signal.aborted) return;

      // ── Build inputs and compute ─────────────────────────────────

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
        moveIndex: undefined, // MOVE not available on Finnhub free tier; FSI uses VIX as proxy
        sectorChanges,
      };

      const result = computeRegimeMonitor(inputs);

      // Cache
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: result, ts: Date.now() }),
      );

      if (controller.signal.aborted) return;
      setRegime(result);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to load regime data");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  // Load from cache on mount
  useEffect(() => {
    const cached = readCachedRegime();
    if (cached) {
      const isOpen = status === "OPEN";
      const ttl = isOpen ? CACHE_TTL : CLOSED_CACHE_TTL;
      if (Date.now() - cached.ts < ttl) {
        setRegime(cached.data);
        return;
      }
    }
    fetchRegime();
  }, [fetchRegime, status]);

  // Auto-refresh during market hours — use ref to avoid interval recreation
  const fetchRegimeRef = useRef(fetchRegime);
  fetchRegimeRef.current = fetchRegime;

  useEffect(() => {
    if (status !== "OPEN") return;
    const interval = setInterval(() => fetchRegimeRef.current(), CACHE_TTL);
    return () => clearInterval(interval);
  }, [status]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { regime, loading, error, refresh: fetchRegime };
}
