import { useCallback, useEffect, useState, useRef } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "../api/edgeHeaders";

export type EconomicEvent = {
  date: string;
  event: string;
  country: string;
  impact: string;
  actual?: string;
  estimate?: string;
  source: "fred" | "finnhub_earnings" | "finnhub_economic";
};

const IMPORTANT_FRED_SERIES: Record<string, string> = {
  "Employment Situation": "high",
  "Consumer Price Index": "high",
  "FOMC": "high",
  "GDP": "high",
  "Retail Sales": "high",
  "Producer Price Index": "medium",
  "Industrial Production": "medium",
  "Housing Starts": "medium",
  "Personal Income": "medium",
  "Durable Goods": "medium",
  "Consumer Confidence": "medium",
  "ISM Manufacturing": "high",
  "ISM Non-Manufacturing": "high",
  "Unemployment": "high",
};

function classifyImpact(releaseName: string): string {
  for (const [keyword, impact] of Object.entries(IMPORTANT_FRED_SERIES)) {
    if (releaseName.toLowerCase().includes(keyword.toLowerCase())) return impact;
  }
  return "low";
}

export function useEconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCalendar = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getEdgeHeaders();

      if (controller.signal.aborted) return;

      const allEvents: EconomicEvent[] = [];

      // Source 1: FRED upcoming releases (always works, free)
      try {
        const today = new Date().toISOString().split("T")[0];
        const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
        const res = await fetch(
          `${supabaseUrl}/functions/v1/fred?endpoint=releases/dates&limit=100&sort_order=asc&include_release_dates_with_no_data=true&realtime_start=${today}&realtime_end=${nextMonth}`,
          { headers },
        );
        if (controller.signal.aborted) return;
        if (res.ok) {
          const data = await res.json();
          const releases = data.release_dates ?? [];
          for (const r of releases) {
            const impact = classifyImpact(r.release_name ?? "");
            if (impact !== "low") {
              allEvents.push({
                date: r.date,
                event: r.release_name,
                country: "US",
                impact,
                source: "fred",
              });
            }
          }
        }
      } catch { /* ignore */ }

      if (controller.signal.aborted) return;

      // Source 2: Finnhub earnings calendar (works on free tier)
      try {
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
        const res = await fetch(
          `${supabaseUrl}/functions/v1/finnhub?endpoint=calendar/earnings&from=${today}&to=${nextWeek}`,
          { headers },
        );
        if (controller.signal.aborted) return;
        if (res.ok) {
          const data = await res.json();
          const earnings = data.earningsCalendar ?? [];
          // Only include major tickers (market cap > likely large)
          const majorTickers = new Set([
            "AAPL", "MSFT", "NVDA", "GOOG", "GOOGL", "AMZN", "META", "TSLA", "AMD",
            "NFLX", "AVGO", "CRM", "ORCL", "ADBE", "JPM", "BAC", "GS", "MS",
            "UNH", "JNJ", "LLY", "PFE", "XOM", "CVX", "WMT", "HD", "DIS", "NKE",
          ]);
          for (const e of earnings) {
            if (majorTickers.has(e.symbol)) {
              allEvents.push({
                date: e.date,
                event: `${e.symbol} Earnings${e.epsEstimate ? ` (est: $${e.epsEstimate})` : ""}`,
                country: "US",
                impact: "high",
                estimate: e.epsEstimate?.toString(),
                source: "finnhub_earnings",
              });
            }
          }
        }
      } catch { /* ignore */ }

      if (controller.signal.aborted) return;

      // Sort by date
      allEvents.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(allEvents);
      setError(null);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to fetch calendar");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { events, loading, error, refresh: fetchCalendar };
}
