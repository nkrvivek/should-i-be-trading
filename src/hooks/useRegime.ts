import { useCallback, useEffect, useRef, useState } from "react";
import { radonFetch } from "../api/radonClient";
import type { CriData } from "../api/types";
import { getTodayET } from "../lib/marketHours";
import { isCriDataStale } from "../lib/criStaleness";

export function useRegime(enabled = true, pollIntervalMs = 60_000) {
  const [data, setData] = useState<CriData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mtimeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRegime = useCallback(async () => {
    if (!enabled) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await radonFetch<CriData>("/regime/scan", {
        method: "POST",
        timeout: 120_000,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setData(result);
        mtimeRef.current = Date.now();
        setError(null);
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "Regime scan failed");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchRegime();

    const timer = setInterval(() => {
      const currentData = data;
      if (currentData && !isCriDataStale(currentData, mtimeRef.current, getTodayET())) return;
      fetchRegime();
    }, pollIntervalMs);

    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [enabled, pollIntervalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refresh: fetchRegime };
}
