import { useCallback, useEffect, useRef, useState } from "react";
import { radonPost } from "../api/radonClient";
import type { CriData } from "../api/types";
import { getTodayET } from "../lib/marketHours";
import { isCriDataStale } from "../lib/criStaleness";

export function useRegime(enabled = true, pollIntervalMs = 60_000) {
  const [data, setData] = useState<CriData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mtimeRef = useRef(0);

  const fetchRegime = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const result = await radonPost<CriData>("/regime/scan", undefined, 120_000);
      setData(result);
      mtimeRef.current = Date.now();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regime scan failed");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchRegime();

    const timer = setInterval(() => {
      if (data && !isCriDataStale(data, mtimeRef.current, getTodayET())) return;
      fetchRegime();
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs, fetchRegime, data]);

  return { data, loading, error, refresh: fetchRegime };
}
