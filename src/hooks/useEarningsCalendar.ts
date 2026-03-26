import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "../api/edgeHeaders";

export type AnalystConsensus = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
  signal: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
  buyPct: number; // 0-100
};

export type EpsSurprise = {
  quarter: number;
  year: number;
  actual: number;
  estimate: number;
  surprisePercent: number;
};

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
  analyst?: AnalystConsensus;
  epsSurprises?: EpsSurprise[];
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

      const today = new Date().toISOString().split("T")[0];
      const end = new Date(Date.now() + weeksAhead * 7 * 86400000).toISOString().split("T")[0];

      const headers = await getEdgeHeaders();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/finnhub?endpoint=calendar/earnings&from=${today}&to=${end}`,
        { headers },
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

      // Phase 2: Fetch analyst data for each unique ticker (batched, delayed)
      const uniqueSymbols = [...new Set(filtered.map((e) => e.symbol))];
      enrichWithAnalystData(uniqueSymbols, supabaseUrl, headers, filtered, setEarnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch earnings");
    } finally {
      setLoading(false);
    }
  }, [weeksAhead]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);
  return { earnings, loading, error, refresh: fetchEarnings };
}

function classifyConsensus(recs: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): AnalystConsensus {
  const total = recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell;
  if (total === 0) return { ...recs, total: 0, signal: "HOLD", buyPct: 50 };

  const buyPct = ((recs.strongBuy + recs.buy) / total) * 100;

  let signal: AnalystConsensus["signal"];
  if (buyPct >= 80) signal = "STRONG BUY";
  else if (buyPct >= 60) signal = "BUY";
  else if (buyPct >= 40) signal = "HOLD";
  else if (buyPct >= 20) signal = "SELL";
  else signal = "STRONG SELL";

  return { ...recs, total, signal, buyPct };
}

async function enrichWithAnalystData(
  symbols: string[],
  supabaseUrl: string,
  headers: Record<string, string>,
  entries: EarningsEntry[],
  setEarnings: (e: EarningsEntry[]) => void,
) {
  const analystMap = new Map<string, AnalystConsensus>();
  const surpriseMap = new Map<string, EpsSurprise[]>();

  // Batch 3 at a time with delays
  for (let i = 0; i < symbols.length; i += 3) {
    const batch = symbols.slice(i, i + 3);
    await Promise.all(batch.map(async (sym) => {
      try {
        // Analyst recommendations
        const recRes = await fetch(
          `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/recommendation&symbol=${sym}`,
          { headers },
        );
        if (recRes.ok) {
          const recs = await recRes.json();
          if (Array.isArray(recs) && recs.length > 0) {
            analystMap.set(sym, classifyConsensus(recs[0]));
          }
        }
      } catch { /* ignore */ }

      try {
        // EPS surprises (last 4 quarters)
        const epsRes = await fetch(
          `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/earnings&symbol=${sym}&limit=4`,
          { headers },
        );
        if (epsRes.ok) {
          const eps = await epsRes.json();
          if (Array.isArray(eps) && eps.length > 0) {
            surpriseMap.set(sym, eps.map((e: { quarter: number; year: number; actual: number; estimate: number; surprisePercent: number }) => ({
              quarter: e.quarter,
              year: e.year,
              actual: e.actual,
              estimate: e.estimate,
              surprisePercent: e.surprisePercent,
            })));
          }
        }
      } catch { /* ignore */ }
    }));

    if (i + 3 < symbols.length) await new Promise((r) => setTimeout(r, 2000));
  }

  // Merge analyst data into entries
  const enriched = entries.map((e) => ({
    ...e,
    analyst: analystMap.get(e.symbol),
    epsSurprises: surpriseMap.get(e.symbol),
  }));
  setEarnings(enriched);
}
