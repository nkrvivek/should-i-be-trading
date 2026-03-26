/**
 * Record Daily Score — Edge Function
 *
 * Records today's market score to historical_scores table.
 * Also supports backfill mode: computes scores for past trading days using FRED data.
 *
 * ADMIN-ONLY: Requires ADMIN_SECRET header or authenticated admin user.
 *
 * POST /record-daily-score
 *   { "backfill": true, "days": 252 }  — backfill last N trading days
 *   { }                                  — record today only
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/auth.ts";

const FRED_API_KEY = Deno.env.get("FRED_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

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
  let volScore = 50;
  if (vix <= 12) volScore = 95;
  else if (vix <= 15) volScore = 90;
  else if (vix <= 18) volScore = 80;
  else if (vix <= 22) volScore = 65;
  else if (vix <= 25) volScore = 50;
  else if (vix <= 30) volScore = 35;
  else if (vix <= 35) volScore = 20;
  else volScore = 10;

  let trendScore = 50;
  const spyChange = spyPrev > 0 ? ((spyClose - spyPrev) / spyPrev) * 100 : 0;
  if (spyChange > 1) trendScore = 80;
  else if (spyChange > 0.3) trendScore = 65;
  else if (spyChange > -0.3) trendScore = 50;
  else if (spyChange > -1) trendScore = 35;
  else trendScore = 20;

  let macroScore = 60;
  if (tenYield > 5) macroScore = 40;
  else if (tenYield > 4.5) macroScore = 50;
  else if (tenYield < 3.5) macroScore = 75;

  const score = Math.round(volScore * 0.35 + trendScore * 0.35 + macroScore * 0.15 + 50 * 0.15);

  let signal = "CAUTION";
  if (score >= 80) signal = "TRADE";
  else if (score < 60) signal = "NO_TRADE";

  return { score, signal };
}

// ── Auth check ────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  // Check admin secret header
  const secret = req.headers.get("x-admin-secret");
  if (ADMIN_SECRET && secret === ADMIN_SECRET) return true;

  // Check service role key in Authorization header (for cron jobs)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY)) return true;

  return false;
}

// ── Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  // Admin-only endpoint
  if (!isAuthorized(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. This endpoint requires admin credentials." }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const backfill = body.backfill === true;
    const days = Math.min(body.days ?? 252, 500);

    const limit = backfill ? days : 5;
    const [vixData, spyData, yieldData] = await Promise.all([
      fredFetch("VIXCLS", limit),
      fredFetch("SP500", limit),
      fredFetch("DGS10", limit),
    ]);

    if (vixData.length === 0 || spyData.length === 0) {
      return new Response(
        JSON.stringify({ error: "FRED data unavailable" }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const vixMap = new Map(vixData.map((d) => [d.date, d.value]));
    const spyMap = new Map(spyData.map((d) => [d.date, d.value]));
    const yieldMap = new Map(yieldData.map((d) => [d.date, d.value]));

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
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase
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
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        message: backfill ? `Backfilled ${records.length} trading days` : "Today's score recorded",
        count: records.length,
        latest: records[records.length - 1],
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
