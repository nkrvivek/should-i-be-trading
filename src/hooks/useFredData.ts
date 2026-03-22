import { useCallback, useEffect, useState } from "react";
import { fetchYieldCurve, fetchFredSeries, type FredObservation } from "../api/freeDataClient";

export function useYieldCurve() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const curve = await fetchYieldCurve();
      setData(curve);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch yield curve");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refresh: fetch };
}

export function useFredSeries(seriesId: string, limit = 30) {
  const [data, setData] = useState<FredObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const obs = await fetchFredSeries(seriesId, limit);
      setData(obs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch FRED data");
    } finally {
      setLoading(false);
    }
  }, [seriesId, limit]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refresh: fetch };
}
