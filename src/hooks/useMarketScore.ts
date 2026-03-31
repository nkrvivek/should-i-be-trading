import { useState, useEffect, useCallback } from "react";
import { computeMarketScore, computeRSI, computeSMA, type MarketScore, type MarketInputs } from "../lib/marketScoring";
import { getCredential } from "../lib/credentials";
import { useMarketHours } from "./useMarketHours";
import { finnhubFetch, fredFetchSeries, fredFetchLatest } from "../api/dataFetchers";

const CACHE_KEY = "sibt_market_score";
const CACHE_TTL = 3 * 60_000; // 3 min during market hours
const CLOSED_CACHE_TTL = 30 * 60_000; // 30 min when closed
const REFRESH_DEDUP_MS = 60_000; // 1 min during live refreshes

type FinnhubQuote = { c: number; dp: number; pc: number; o: number; h: number; l: number };
type SectorChange = { symbol: string; change: number };

export interface CachedMarketScoreSnapshot {
  score: MarketScore;
  sectorChanges?: SectorChange[];
  ts: number;
}

let memorySnapshot: CachedMarketScoreSnapshot | null = null;
let inflightScorePromise: Promise<CachedMarketScoreSnapshot | null> | null = null;

function isMarketActive(status: string): boolean {
  return status === "OPEN" || status === "PRE_MARKET" || status === "AFTER_HOURS";
}

function readCachedMarketScore(): CachedMarketScoreSnapshot | null {
  if (memorySnapshot) return memorySnapshot;
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMarketScoreSnapshot;
    if (!parsed?.score || typeof parsed.ts !== "number") return null;
    memorySnapshot = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedMarketScore(snapshot: CachedMarketScoreSnapshot) {
  memorySnapshot = snapshot;

  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore cache write failures
  }
}

function getFreshCachedSnapshot(maxAgeMs: number): CachedMarketScoreSnapshot | null {
  const cached = readCachedMarketScore();
  if (!cached) return null;
  return Date.now() - cached.ts < maxAgeMs ? cached : null;
}

export function getCachedMarketScore(): CachedMarketScoreSnapshot | null {
  return getFreshCachedSnapshot(CLOSED_CACHE_TTL);
}

async function fetchFreshMarketScore(status: string): Promise<CachedMarketScoreSnapshot> {
  const apiKey = getCredential("finnhub") ?? undefined;
  const sectors = ["XLK", "XLF", "XLV", "XLY", "XLP", "XLE", "XLI", "XLB", "XLRE", "XLC", "XLU"];

  const [vixSeries, sp500Series, tenYearYield, dxy, spyQuote] = await Promise.all([
    fredFetchSeries("VIXCLS", 5),
    fredFetchSeries("SP500", 250),
    fredFetchLatest("DGS10"),
    fredFetchLatest("DTWEXBGS").catch(() => undefined),
    finnhubFetch<FinnhubQuote>("quote", { symbol: "SPY" }, apiKey).catch(() => null),
  ]);

  const vix = vixSeries.length > 0 ? vixSeries[0] : undefined;
  const vixPrev = vixSeries.length > 1 ? vixSeries[1] : undefined;

  let spySma20: number | undefined;
  let spySma50: number | undefined;
  let spySma200: number | undefined;
  let spyRsi14: number | undefined;
  let spyPrice: number | undefined;

  if (sp500Series.length > 0) {
    spyPrice = sp500Series[0];
    const chronological = [...sp500Series].reverse();
    spySma20 = computeSMA(chronological, 20);
    spySma50 = computeSMA(chronological, 50);
    spySma200 = computeSMA(chronological, 200);
    spyRsi14 = computeRSI(chronological, 14);
  }

  if (spyQuote?.c) spyPrice = spyQuote.c;

  const sectorChanges: SectorChange[] = [];
  for (let i = 0; i < sectors.length; i += 4) {
    const batch = sectors.slice(i, i + 4);
    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const quote = await finnhubFetch<FinnhubQuote>("quote", { symbol }, apiKey);
          return { symbol, change: quote.dp ?? 0 };
        } catch {
          return null;
        }
      }),
    );

    for (const result of results) {
      if (result) sectorChanges.push(result);
    }

    if (i + 4 < sectors.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const inputs: MarketInputs = {
    vix,
    vixPrev,
    spyPrice,
    spyChange: spyQuote?.dp ?? undefined,
    spySma20,
    spySma50,
    spySma200,
    spyRsi14,
    sectorChanges: sectorChanges.length > 0 ? sectorChanges : undefined,
    tenYearYield,
    dxy: dxy ?? undefined,
    marketOpen: isMarketActive(status),
  };

  const snapshot = {
    score: computeMarketScore(inputs),
    sectorChanges,
    ts: Date.now(),
  } satisfies CachedMarketScoreSnapshot;

  writeCachedMarketScore(snapshot);
  return snapshot;
}

async function loadMarketScore(
  status: string,
  { force = false, freshnessMs = CLOSED_CACHE_TTL }: { force?: boolean; freshnessMs?: number } = {},
): Promise<CachedMarketScoreSnapshot | null> {
  if (!force) {
    const cached = getFreshCachedSnapshot(freshnessMs);
    if (cached) return cached;
  }

  if (inflightScorePromise) {
    return inflightScorePromise;
  }

  inflightScorePromise = fetchFreshMarketScore(status).finally(() => {
    inflightScorePromise = null;
  });

  return inflightScorePromise;
}

export function useMarketScore() {
  const [score, setScore] = useState<MarketScore | null>(() => getCachedMarketScore()?.score ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useMarketHours();

  const refresh = useCallback(
    async (force = true) => {
      setLoading(true);
      setError(null);

      try {
        const snapshot = await loadMarketScore(status, {
          force,
          freshnessMs: REFRESH_DEDUP_MS,
        });
        setScore(snapshot?.score ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to compute market score");
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    let active = true;

    const cached = getFreshCachedSnapshot(isMarketActive(status) ? CACHE_TTL : CLOSED_CACHE_TTL);
    if (cached) {
      setScore(cached.score);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    void loadMarketScore(status, {
      freshnessMs: isMarketActive(status) ? CACHE_TTL : CLOSED_CACHE_TTL,
    })
      .then((snapshot) => {
        if (!active) return;
        setScore(snapshot?.score ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to compute market score");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "OPEN") return;

    const interval = setInterval(() => {
      void refresh(false);
    }, REFRESH_DEDUP_MS);

    return () => clearInterval(interval);
  }, [refresh, status]);

  return { score, loading, error, refresh: () => refresh(true) };
}
