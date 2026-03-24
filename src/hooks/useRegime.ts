import { useCallback, useEffect, useRef, useState } from "react";
import { radonFetch } from "../api/radonClient";
import type { CriData } from "../api/types";

const CACHE_KEY = "sibt_regime_cache";
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 min — show stale while scanning

function loadCached(): CriData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_MAX_AGE_MS) return null;
    return data as CriData;
  } catch { return null; }
}

function saveCache(data: CriData) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
}

/**
 * Fetches regime/CRI data from Radon.
 * Strategy: show cached data immediately, then scan in background.
 * 1. Load localStorage cache → instant render
 * 2. POST /regime/scan in background → update when done
 * 3. Poll on interval after initial scan
 */
export function useRegime(enabled = true, pollIntervalMs = 60_000) {
  const [data, setData] = useState<CriData | null>(loadCached);
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
      saveCache(result);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Regime scan failed";
      // Don't show error if Radon is simply not available (hosted mode)
      const isRadonDown = msg.includes("Failed to fetch") || msg.includes("502") || msg.includes("405") || msg.includes("404") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED");
      if (isRadonDown) {
        setError("Radon API not connected. Regime data requires a local Radon instance. Configure in Settings > Connections.");
        // Stop polling — Radon isn't available
        scanningRef.current = false;
        setScanning(false);
        setLoading(false);
        return;
      } else {
        setError(msg);
      }
    } finally {
      scanningRef.current = false;
      setScanning(false);
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // If we have cached data, show it immediately and scan in background
    const cached = loadCached();
    if (cached) {
      setData(cached);
      setLoading(false);
      // Still trigger a background refresh
      triggerScan();
    } else {
      setLoading(true);
      triggerScan();
    }

    const timer = setInterval(triggerScan, pollIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs, triggerScan]);

  return { data, loading, scanning, error, refresh: triggerScan };
}
