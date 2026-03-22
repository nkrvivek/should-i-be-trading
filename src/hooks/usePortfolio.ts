import { useCallback, useEffect, useState } from "react";
import { radonPost } from "../api/radonClient";
import type { PortfolioData } from "../api/types";

export function usePortfolio(pollIntervalMs = 60_000) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await radonPost<PortfolioData>("/portfolio/sync", undefined, 30_000);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portfolio sync failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetch, pollIntervalMs]);

  return { data, loading, error, refresh: fetch };
}
