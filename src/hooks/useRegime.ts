import { useCallback, useEffect, useRef, useState } from "react";
import { radonFetch } from "../api/radonClient";
import type { CriData } from "../api/types";

/**
 * Fetches regime/CRI data from Radon via POST /regime/scan.
 * The scan can take 60-120s on cold start. Polls on interval after.
 */
export function useRegime(enabled = true, pollIntervalMs = 60_000) {
  const [data, setData] = useState<CriData | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanningRef = useRef(false);

  const triggerScan = useCallback(async () => {
    if (!enabled || scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);

    try {
      const result = await radonFetch<CriData>("/regime/scan", {
        method: "POST",
        timeout: 120_000,
      });
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regime scan failed");
    } finally {
      scanningRef.current = false;
      setScanning(false);
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    setLoading(true);
    triggerScan();

    const timer = setInterval(triggerScan, pollIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs, triggerScan]);

  return { data, loading, scanning, error, refresh: triggerScan };
}
