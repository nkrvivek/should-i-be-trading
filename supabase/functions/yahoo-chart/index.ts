import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * Yahoo Finance Chart proxy — avoids CORS issues from browser.
 *
 * No API key needed. Yahoo Finance chart API is free.
 *
 * Usage:
 *   GET /functions/v1/yahoo-chart?endpoint=v8/finance/chart/AAPL&range=1y&interval=1d
 */

const YAHOO_BASE = "https://query1.finance.yahoo.com";

// Simple in-memory cache (per Deno isolate)
const cache = new Map<string, { data: unknown; expires: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");

    if (!endpoint || !endpoint.startsWith("v8/finance/chart/")) {
      return errorResponse("Invalid endpoint. Use: v8/finance/chart/{SYMBOL}", 400);
    }

    // Build Yahoo URL with all query params except 'endpoint'
    const yahooUrl = new URL(`${YAHOO_BASE}/${endpoint}`);
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint") {
        yahooUrl.searchParams.set(key, value);
      }
    }

    // Check cache (15 min for daily, 2 min for intraday)
    const cacheKey = yahooUrl.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse(cached.data);
    }

    const res = await fetch(yahooUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SIBT/1.0)",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Yahoo error (${res.status}):`, text.slice(0, 200));
      return errorResponse(`Yahoo Finance error: ${res.status}`, 502);
    }

    const data = await res.json();

    // Cache: 15 min for daily+, 2 min for intraday
    const interval = url.searchParams.get("interval") || "1d";
    const ttl = ["1m", "5m", "15m", "30m"].includes(interval)
      ? 2 * 60 * 1000
      : 15 * 60 * 1000;
    cache.set(cacheKey, { data, expires: Date.now() + ttl });

    // Prune old entries
    if (cache.size > 200) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (v.expires < now) cache.delete(k);
      }
    }

    return jsonResponse(data);
  } catch (err) {
    console.error("Yahoo chart proxy error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});
