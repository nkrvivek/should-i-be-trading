import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "../api/edgeHeaders";
import { dedupFetch } from "../api/fetchDedup";

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

// Cache enrichment data in localStorage to avoid refetching analyst/EPS data
const ENRICHMENT_CACHE_KEY = "sibt_earnings_enrichment";
const ENRICHMENT_CACHE_TTL = 60 * 60 * 1000; // 1 hour — analyst data doesn't change fast
const CALENDAR_CACHE_TTL = 15 * 60 * 1000;
const calendarCache = new Map<string, { data: EarningsEntry[]; expires: number }>();

function loadEnrichmentCache(): Map<string, { analyst?: AnalystConsensus; surprises?: EpsSurprise[]; ts: number }> {
  try {
    const raw = localStorage.getItem(ENRICHMENT_CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Array<[string, { analyst?: AnalystConsensus; surprises?: EpsSurprise[]; ts: number }]>;
    return new Map(parsed.filter(([, v]) => Date.now() - v.ts < ENRICHMENT_CACHE_TTL));
  } catch { return new Map(); }
}

function saveEnrichmentCache(cache: Map<string, { analyst?: AnalystConsensus; surprises?: EpsSurprise[]; ts: number }>) {
  try {
    localStorage.setItem(ENRICHMENT_CACHE_KEY, JSON.stringify([...cache.entries()]));
  } catch { /* ignore */ }
}

export function useEarningsCalendar(weeksRange = 4, direction: "upcoming" | "past" = "upcoming") {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const fetchEarnings = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const cacheKey = `${weeksRange}:${direction}`;
    const cached = calendarCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      setEarnings(cached.data);
      setError(null);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const today = new Date().toISOString().split("T")[0];
      let from: string;
      let to: string;

      if (direction === "past") {
        from = new Date(Date.now() - weeksRange * 7 * 86400000).toISOString().split("T")[0];
        to = today;
      } else {
        from = today;
        to = new Date(Date.now() + weeksRange * 7 * 86400000).toISOString().split("T")[0];
      }

      const headers = await getEdgeHeaders();
      const res = await dedupFetch(
        `${supabaseUrl}/functions/v1/finnhub?endpoint=calendar/earnings&from=${from}&to=${to}`,
        { headers },
        5 * 60_000,
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
        .sort((a, b) => direction === "past"
          ? b.date.localeCompare(a.date)  // newest-first for past
          : a.date.localeCompare(b.date)  // chronological for upcoming
        );

      if (requestRef.current !== requestId) return;
      setEarnings(filtered);

      // Phase 2: Fetch analyst data for each unique ticker (batched, delayed)
      const uniqueSymbols = [...new Set(filtered.map((e) => e.symbol))];
      enrichWithAnalystData(uniqueSymbols, supabaseUrl, headers, filtered, setEarnings, cacheKey, requestRef, requestId);
    } catch (e) {
      if (requestRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : "Failed to fetch earnings");
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [weeksRange, direction]);

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
  cacheKey: string,
  requestRef: React.MutableRefObject<number>,
  requestId: number,
) {
  const analystMap = new Map<string, AnalystConsensus>();
  const surpriseMap = new Map<string, EpsSurprise[]>();
  const enrichmentCache = loadEnrichmentCache();

  // Filter out symbols already in cache
  const uncached = symbols.filter((sym) => {
    const cached = enrichmentCache.get(sym);
    if (cached) {
      if (cached.analyst) analystMap.set(sym, cached.analyst);
      if (cached.surprises) surpriseMap.set(sym, cached.surprises);
      return false;
    }
    return true;
  });

  // Batch 3 at a time with delays — only for uncached symbols
  for (let i = 0; i < uncached.length; i += 3) {
    const batch = uncached.slice(i, i + 3);
    await Promise.all(batch.map(async (sym) => {
      try {
        const recRes = await dedupFetch(
          `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/recommendation&symbol=${sym}`,
          { headers },
          ENRICHMENT_CACHE_TTL,
        );
        if (recRes.ok) {
          const recs = await recRes.json();
          if (Array.isArray(recs) && recs.length > 0) {
            analystMap.set(sym, classifyConsensus(recs[0]));
          }
        }
      } catch { /* ignore */ }

      try {
        const epsRes = await dedupFetch(
          `${supabaseUrl}/functions/v1/finnhub?endpoint=stock/earnings&symbol=${sym}&limit=4`,
          { headers },
          ENRICHMENT_CACHE_TTL,
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

      // Cache the result
      enrichmentCache.set(sym, {
        analyst: analystMap.get(sym),
        surprises: surpriseMap.get(sym),
        ts: Date.now(),
      });
    }));

    if (requestRef.current !== requestId) return;
    if (i + 3 < uncached.length) await new Promise((r) => setTimeout(r, 2000));
  }

  // Persist cache
  saveEnrichmentCache(enrichmentCache);

  // Merge analyst data into entries
  const enriched = entries.map((e) => ({
    ...e,
    analyst: analystMap.get(e.symbol),
    epsSurprises: surpriseMap.get(e.symbol),
  }));
  if (requestRef.current !== requestId) return;
  calendarCache.set(cacheKey, { data: enriched, expires: Date.now() + CALENDAR_CACHE_TTL });
  setEarnings(enriched);
}
