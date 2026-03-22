import { useCallback, useEffect, useState } from "react";
import { fetchEconomicCalendar, type EconomicEvent } from "../api/freeDataClient";

export function useEconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEconomicCalendar();
      // Filter to high-impact US events
      setEvents(data.filter((e) => e.country === "US" && e.impact === "high"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { events, loading, error, refresh: fetch };
}
