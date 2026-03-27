/**
 * Hook to fetch and cache CFTC Commitments of Traders data.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getCotData, type CftcResponse } from "../api/cftcClient";
import { isSupabaseConfigured } from "../lib/supabase";

const CACHE_KEY = "sibt_cot_data";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours (weekly data, no rush)

export function useCotData(weeks = 12) {
  const [data, setData] = useState<CftcResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCot = useCallback(async (force = false) => {
    if (!isSupabaseConfigured()) return;

    // Check cache
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.expires > Date.now()) {
            setData(parsed.data);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await getCotData(weeks);
      if (controller.signal.aborted) return;
      setData(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: result,
        expires: Date.now() + CACHE_TTL,
      }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to fetch COT data");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [weeks]);

  useEffect(() => {
    fetchCot();
  }, [fetchCot]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { data, loading, error, refresh: () => fetchCot(true) };
}
