import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";

export type EarningsEntry = {
  date: string;
  symbol: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  hour: "bmo" | "amc" | "dmh" | ""; // before market open, after market close, during market hours
  quarter: number;
  year: number;
  sector?: string;
};

// Sector classification for major stocks
const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", GOOG: "Technology", GOOGL: "Technology",
  AMZN: "Consumer", META: "Technology", TSLA: "Consumer", AMD: "Technology", NFLX: "Communication",
  AVGO: "Technology", CRM: "Technology", ORCL: "Technology", ADBE: "Technology", INTC: "Technology",
  CSCO: "Technology", QCOM: "Technology", MU: "Technology", SNOW: "Technology", PLTR: "Technology",
  DELL: "Technology", APP: "Technology", SHOP: "Technology", NOW: "Technology", PANW: "Technology",
  JPM: "Financials", BAC: "Financials", GS: "Financials", MS: "Financials", WFC: "Financials",
  C: "Financials", BX: "Financials", KKR: "Financials", SCHW: "Financials", AXP: "Financials",
  V: "Financials", MA: "Financials", COF: "Financials",
  UNH: "Healthcare", JNJ: "Healthcare", LLY: "Healthcare", PFE: "Healthcare", ABBV: "Healthcare",
  MRK: "Healthcare", TMO: "Healthcare", ABT: "Healthcare", BMY: "Healthcare", AMGN: "Healthcare",
  XOM: "Energy", CVX: "Energy", COP: "Energy", SLB: "Energy", EOG: "Energy",
  DIS: "Communication", HD: "Consumer", MCD: "Consumer", NKE: "Consumer", SBUX: "Consumer",
  WMT: "Consumer", COST: "Consumer", TGT: "Consumer", LOW: "Consumer",
  CAT: "Industrials", BA: "Industrials", HON: "Industrials", UPS: "Industrials", RTX: "Industrials",
  NEE: "Utilities", SO: "Utilities", DUK: "Utilities",
  PG: "Consumer Staples", KO: "Consumer Staples", PEP: "Consumer Staples", PM: "Consumer Staples",
};

const MAJOR_TICKERS = new Set(Object.keys(SECTOR_MAP));

export function useEarningsCalendar(weeksAhead = 4) {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const today = new Date().toISOString().split("T")[0];
      const end = new Date(Date.now() + weeksAhead * 7 * 86400000).toISOString().split("T")[0];

      const res = await fetch(
        `${supabaseUrl}/functions/v1/finnhub?endpoint=calendar/earnings&from=${today}&to=${end}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
        },
      );

      if (!res.ok) throw new Error(`Finnhub ${res.status}`);

      const data = await res.json();
      const all = (data.earningsCalendar ?? []) as Array<{
        date: string; symbol: string; epsEstimate: number | null; epsActual: number | null;
        revenueEstimate: number | null; revenueActual: number | null;
        hour: string; quarter: number; year: number;
      }>;

      // Filter to major tickers only
      const filtered: EarningsEntry[] = all
        .filter((e) => MAJOR_TICKERS.has(e.symbol))
        .map((e) => ({
          ...e,
          hour: (e.hour || "") as EarningsEntry["hour"],
          sector: SECTOR_MAP[e.symbol] ?? "Other",
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setEarnings(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch earnings");
    } finally {
      setLoading(false);
    }
  }, [weeksAhead]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);
  return { earnings, loading, error, refresh: fetchEarnings };
}
