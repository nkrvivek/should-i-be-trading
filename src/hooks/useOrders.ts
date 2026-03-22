import { useCallback, useEffect, useState } from "react";
import { radonPost } from "../api/radonClient";
import type { OrdersData } from "../api/types";

export function useOrders(pollIntervalMs = 30_000) {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await radonPost<OrdersData>("/orders/refresh", undefined, 30_000);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Orders refresh failed");
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
