/**
 * Record Daily Score — Edge Function
 *
 * Records today's market score to historical_scores table.
 * Also supports backfill mode: computes scores for past trading days using FRED data.
 *
 * POST /record-daily-score
 *   { "backfill": true, "days": 252 }  — backfill last N trading days
 *   { }                                  — record today only
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FRED_API_KEY = Deno.env.get("FRED_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

// ── FRED Fetch ─────────────────────────────────────────────────────────

async function fredFetch(seriesId: string, limit = 5): Promise<{ date: string; value: number }[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.observations ?? [])
    .filter((o: { value: string }) => o.value !== ".")
    .map((o: { date: string; value: string }) => ({
      date: o.date,
      value: parseFloat(o.value),
    }));
}

// ── Scoring (simplified version of client-side scoring) ────────────────

function computeScore(vix: number, spyClose: number, spyPrev: number, tenYield: number): {
  score: number;
  signal: string;
} {
  let score = 50;

  // Volatility (25%)
  let volScore = 50;
  if (vix <= 12) volScore = 95;
  else if (vix <= 15) volScore = 90;
  else if (vix <= 18) volScore = 80;
  else if (vix <= 22) volScore = 65;
  else if (vix <= 25) volScore = 50;
  else if (vix <= 30) volScore = 35;
  else if (vix <= 35) volScore = 20;
  else volScore = 10;

  // Trend (20%) — simple: SPY above/below previous
  let trendScore = 50;
  const spyChange = spyPrev > 0 ? ((spyClose - spyPrev) / spyPrev) * 100 : 0;
  if (spyChange > 1) trendScore = 80;
  else if (spyChange > 0.3) trendScore = 65;
  else if (spyChange > -0.3) trendScore = 50;
  else if (spyChange > -1) trendScore = 35;
  else trendScore = 20;

  // Macro (10%)
  let macroScore = 60;
  if (tenYield > 5) macroScore = 40;
  else if (tenYield > 4.5) macroScore = 50;
  else if (tenYield < 3.5) macroScore = 75;

  // Simplified composite (no sector data in backfill)
  score = Math.round(volScore * 0.35 + trendScore * 0.35 + macroScore * 0.15 + 50 * 0.15);

  let signal = "CAUTION";
  if (score >= 80) signal = "TRADE";
  else if (score < 60) signal = "NO_TRADE";

  return { score, signal };
}

// ── Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const backfill = body.backfill === true;
    const days = Math.min(body.days ?? 252, 500);

    // Fetch FRED data
    const limit = backfill ? days : 5;
    const [vixData, spyData, yieldData] = await Promise.all([
      fredFetch("VIXCLS", limit),
      fredFetch("SP500", limit),
      fredFetch("DGS10", limit),
    ]);

    if (vixData.length === 0 || spyData.length === 0) {
      return new Response(
        JSON.stringify({ error: "FRED data unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build date-indexed maps
    const vixMap = new Map(vixData.map((d) => [d.date, d.value]));
    const spyMap = new Map(spyData.map((d) => [d.date, d.value]));
    const yieldMap = new Map(yieldData.map((d) => [d.date, d.value]));

    // Get all unique dates (trading days)
    const allDates = [...new Set([...vixMap.keys(), ...spyMap.keys()])].sort();

    const records: {
      date: string;
      market_score: number;
      signal: string;
      vix: number | null;
      spy_close: number | null;
      spy_change: number | null;
    }[] = [];

    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i];
      const vix = vixMap.get(date);
      const spy = spyMap.get(date);
      const tenY = yieldMap.get(date) ?? 4.0;

      if (vix === undefined || spy === undefined) continue;

      // Previous day SPY for daily change
      const prevDate = i > 0 ? allDates[i - 1] : null;
      const prevSpy = prevDate ? (spyMap.get(prevDate) ?? spy) : spy;
      const spyChange = prevSpy > 0 ? ((spy - prevSpy) / prevSpy) * 100 : 0;

      const { score, signal } = computeScore(vix, spy, prevSpy, tenY);

      records.push({
        date,
        market_score: score,
        signal,
        vix,
        spy_close: spy,
        spy_change: Math.round(spyChange * 100) / 100,
      });
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ message: "No records to insert", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert (on conflict do nothing — don't overwrite existing)
    const { error, count } = await supabase
      .from("historical_scores")
      .upsert(
        records.map((r) => ({
          date: r.date,
          market_score: r.market_score,
          signal: r.signal,
          vix: r.vix,
          spy_close: r.spy_close,
          spy_change: r.spy_change,
        })),
        { onConflict: "date", ignoreDuplicates: true },
      );

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        message: backfill ? `Backfilled ${records.length} trading days` : "Today's score recorded",
        count: records.length,
        latest: records[records.length - 1],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
