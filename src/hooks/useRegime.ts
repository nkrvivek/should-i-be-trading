import { useCallback, useEffect, useRef, useState } from "react";
import { radonFetch, radonGet } from "../api/radonClient";
import type { CriData } from "../api/types";

/**
 * Two-phase regime data loading:
 * 1. Fast: try GET cached CRI data from disk (instant)
 * 2. Background: POST to trigger fresh scan if stale (60-120s)
 *
 * This means the dashboard renders immediately with cached data,
 * then updates when the fresh scan completes.
 */
export function useRegime(enabled = true, pollIntervalMs = 60_000) {
  const [data, setData] = useState<CriData | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mtimeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Phase 1: Try to load cached CRI data (fast, no scan)
  const loadCached = useCallback(async () => {
    if (!enabled) return;
    try {
      // Radon serves cached cri.json via a quick GET to the regime endpoint
      // If no GET endpoint exists, we fall through to the scan
      const cached = await radonGet<CriData>("/regime/scan", 5_000);
      if (cached && cached.cri) {
        setData(cached);
        mtimeRef.current = Date.now();
        setError(null);
        return true;
      }
    } catch {
      // GET not available or no cached data — that's fine, we'll scan
    }
    return false;
  }, [enabled]);

  // Phase 2: Trigger a fresh scan (slow, 60-120s)
  const triggerScan = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setScanning(true);
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
        setScanning(false);
        setLoading(false);
      }
    }
  }, [enabled]);

  // Initial load: cached first, then scan if needed
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      const hasCached = await loadCached();

      if (cancelled) return;

      // If we got cached data, show it immediately
      // Then check if it's stale and trigger background scan
      if (hasCached) {
        setLoading(false);
        // Background scan if stale
        triggerScan();
      } else {
        // No cached data — must wait for scan
        triggerScan();
      }
    }

    init();

    // Periodic refresh
    const timer = setInterval(() => {
      triggerScan();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [enabled, pollIntervalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, scanning, error, refresh: triggerScan };
}
