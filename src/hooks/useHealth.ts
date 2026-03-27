import { useCallback, useEffect, useState } from "react";
import { radonGet } from "../api/radonClient";
import type { HealthResponse } from "../api/types";

export function useHealth(intervalMs = 30_000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await radonGet<HealthResponse>("/health", 5000);
      setHealth(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Health check failed");
    }
  }, []);

  useEffect(() => {
    fetch(); // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setInterval(fetch, intervalMs);
    return () => clearInterval(timer);
  }, [fetch, intervalMs]);

  return { health, error, refresh: fetch };
}
