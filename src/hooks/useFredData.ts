import { useCallback, useEffect, useState } from "react";
import { fetchYieldCurve, fetchFredSeries, type FredObservation } from "../api/freeDataClient";

export function useYieldCurve() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const curve = await fetchYieldCurve();
      if (!signal?.aborted) { setData(curve); setError(null); }
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Failed to fetch yield curve");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  return { data, loading, error, refresh: load };
}

export function useFredSeries(seriesId: string, limit = 30) {
  const [data, setData] = useState<FredObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const obs = await fetchFredSeries(seriesId, limit);
      if (!signal?.aborted) { setData(obs); setError(null); }
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Failed to fetch FRED data");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [seriesId, limit]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  return { data, loading, error, refresh: load };
}
