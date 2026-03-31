import { useCallback, useEffect, useState } from "react";
import { getTrendingSymbols, type TrendingSymbol } from "../api/stocktwitsClient";

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

let trendingCache: { data: TrendingSymbol[]; expires: number } | null = null;
let inflightTrendingPromise: Promise<TrendingSymbol[]> | null = null;

function getFreshTrendingSymbols(): TrendingSymbol[] | null {
  if (!trendingCache || Date.now() >= trendingCache.expires) {
    return null;
  }

  return trendingCache.data;
}

async function loadTrendingSymbols(force = false): Promise<TrendingSymbol[]> {
  if (!force) {
    const cached = getFreshTrendingSymbols();
    if (cached) {
      return cached;
    }
  }

  if (!force && inflightTrendingPromise) {
    return inflightTrendingPromise;
  }

  inflightTrendingPromise = getTrendingSymbols()
    .then((data) => {
      trendingCache = { data, expires: Date.now() + CACHE_TTL };
      return data;
    })
    .finally(() => {
      inflightTrendingPromise = null;
    });

  return inflightTrendingPromise;
}

export function useTrendingSymbols(): {
  data: TrendingSymbol[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<TrendingSymbol[]>(() => getFreshTrendingSymbols() ?? []);
  const [loading, setLoading] = useState(() => getFreshTrendingSymbols() == null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback((force = false) => {
    setLoading(true);
    setError(null);

    void loadTrendingSymbols(force)
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load trending symbols");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (getFreshTrendingSymbols()) return;

    let active = true;

    void loadTrendingSymbols()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load trending symbols");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh: () => refresh(true),
  };
}
