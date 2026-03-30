import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * FINRA daily short volume proxy.
 *
 * Fetches and parses the CNMS short volume file from FINRA,
 * returning short ratio data per symbol.
 */

// ── In-memory cache (per Deno isolate) ──────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** Format date as YYYYMMDD */
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Format date as YYYY-MM-DD */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Get the most recent business day (skip weekends) */
function recentBusinessDay(from: Date = new Date()): Date {
  const d = new Date(from);
  // Start from yesterday (today's file usually isn't available until evening)
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

interface ShortVolumeRow {
  symbol: string;
  shortVolume: number;
  shortExemptVolume: number;
  totalVolume: number;
  shortRatio: number;
}

/** Parse the tab-delimited FINRA file */
function parseFinraFile(text: string): ShortVolumeRow[] {
  const lines = text.split("\n");
  const rows: ShortVolumeRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split("|");
    if (parts.length < 6) continue;

    const [, symbol, shortVol, shortExempt, totalVol] = parts;
    const shortVolume = parseInt(shortVol, 10);
    const totalVolume = parseInt(totalVol, 10);
    const shortExemptVolume = parseInt(shortExempt, 10);

    if (!symbol || isNaN(shortVolume) || isNaN(totalVolume) || totalVolume === 0) continue;

    rows.push({
      symbol: symbol.trim(),
      shortVolume,
      shortExemptVolume: isNaN(shortExemptVolume) ? 0 : shortExemptVolume,
      totalVolume,
      shortRatio: Math.round((shortVolume / totalVolume) * 1000) / 1000,
    });
  }

  return rows;
}

/** Try fetching the FINRA file for a given date, returns null on 404 */
async function fetchFinraFile(date: Date): Promise<{ text: string; date: Date } | null> {
  const url = `https://cdn.finra.org/equity/regsho/daily/CNMSshvol${fmt(date)}.txt`;
  const res = await fetch(url);
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  return { text: await res.text(), date };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    await authenticateRequest(req);

    const url = new URL(req.url);
    const symbolFilter = url.searchParams.get("symbol")?.toUpperCase() ?? null;

    // Determine candidate dates (most recent business day, then two prior)
    const d1 = recentBusinessDay();
    const d2 = new Date(d1); d2.setDate(d2.getDate() - 1);
    while (d2.getDay() === 0 || d2.getDay() === 6) d2.setDate(d2.getDate() - 1);
    const d3 = new Date(d2); d3.setDate(d3.getDate() - 1);
    while (d3.getDay() === 0 || d3.getDay() === 6) d3.setDate(d3.getDate() - 1);

    // Check cache
    const cacheKey = `finra:${fmt(d1)}`;
    const cached = cache.get(cacheKey);
    let allRows: ShortVolumeRow[];
    let fileDate: string;

    if (cached && Date.now() < cached.expires) {
      const c = cached.data as { rows: ShortVolumeRow[]; date: string };
      allRows = c.rows;
      fileDate = c.date;
    } else {
      // Try today's date first, then fallback
      let result = await fetchFinraFile(d1);
      if (!result) result = await fetchFinraFile(d2);
      if (!result) result = await fetchFinraFile(d3);

      if (!result) {
        return errorResponse("FINRA short volume data unavailable for recent dates", 502, req);
      }

      allRows = parseFinraFile(result.text);
      fileDate = isoDate(result.date);

      // Cache
      if (cache.size >= 10) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
        if (oldest) cache.delete(oldest[0]);
      }
      cache.set(cacheKey, { data: { rows: allRows, date: fileDate }, expires: Date.now() + CACHE_TTL });
    }

    // Filter or return top 100
    let data: ShortVolumeRow[];
    if (symbolFilter) {
      data = allRows.filter((r) => r.symbol === symbolFilter);
    } else {
      data = allRows
        .sort((a, b) => b.shortRatio - a.shortRatio)
        .slice(0, 100);
    }

    return jsonResponse({ date: fileDate, data }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FINRA error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
