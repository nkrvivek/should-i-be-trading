import { useCallback, useEffect, useState } from "react";
import { radonPost } from "../api/radonClient";
import type { DiscoverData } from "../api/types";

export function useDiscover(enabled = true, pollIntervalMs = 300_000) {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const result = await radonPost<DiscoverData>("/discover", undefined, 120_000);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discover failed");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetch();
    const timer = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, fetch, pollIntervalMs]);

  return { data, loading, error, refresh: fetch };
}
