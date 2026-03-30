/**
 * Combined hook for market activity data: actives, gainers, losers, short volume.
 * Fetches all in parallel with AbortController cleanup.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMostActive,
  getGainers,
  getLosers,
  getShortVolume,
  type ActiveStock,
  type ShortVolumeEntry,
} from "../api/marketActivityClient";

export interface MarketActivityData {
  actives: ActiveStock[];
  gainers: ActiveStock[];
  losers: ActiveStock[];
  shortVolume: ShortVolumeEntry[];
}

const CACHE_KEY = "sibt_market_activity_cache";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 min

function loadCached(): MarketActivityData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_MAX_AGE_MS) return null;
    return data as MarketActivityData;
  } catch {
    return null;
  }
}

function saveCache(data: MarketActivityData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function useMarketActivity(): {
  data: MarketActivityData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<MarketActivityData | null>(loadCached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [actives, gainers, losers, shortVolume] = await Promise.all([
        getMostActive().catch(() => [] as ActiveStock[]),
        getGainers().catch(() => [] as ActiveStock[]),
        getLosers().catch(() => [] as ActiveStock[]),
        getShortVolume().catch(() => [] as ShortVolumeEntry[]),
      ]);

      if (controller.signal.aborted) return;

      const result: MarketActivityData = { actives, gainers, losers, shortVolume };
      setData(result);
      saveCache(result);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to load market activity");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data) fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData, data]);

  return { data, loading, error, refresh: fetchData };
}
