import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * Yahoo Finance Chart proxy — avoids CORS issues from browser.
 * No API key needed. Yahoo Finance chart API is free.
 * Requires user authentication to prevent abuse.
 */

const YAHOO_BASE = "https://query1.finance.yahoo.com";

// Strict endpoint validation: only allow chart endpoints with valid symbols
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,12}$/;

// Simple in-memory cache (per Deno isolate)
const cache = new Map<string, { data: unknown; expires: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");

    if (!endpoint || !endpoint.startsWith("v8/finance/chart/")) {
      return errorResponse("Invalid endpoint. Use: v8/finance/chart/{SYMBOL}", 400, req);
    }

    // Validate symbol portion to prevent path traversal
    const symbol = endpoint.replace("v8/finance/chart/", "");
    if (!symbol || !SYMBOL_RE.test(symbol)) {
      return errorResponse("Invalid symbol format", 400, req);
    }

    // Build Yahoo URL with allowed query params only
    const yahooUrl = new URL(`${YAHOO_BASE}/v8/finance/chart/${symbol}`);
    const allowedParams = ["range", "interval", "period1", "period2", "includePrePost"];
    for (const param of allowedParams) {
      const val = url.searchParams.get(param);
      if (val) yahooUrl.searchParams.set(param, val);
    }

    // Check cache
    const cacheKey = yahooUrl.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse(cached.data, 200, req);
    }

    const res = await fetch(yahooUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SIBT/1.0)",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Yahoo error (${res.status}):`, text.slice(0, 200));
      return errorResponse(`Yahoo Finance error: ${res.status}`, 502, req);
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

    return jsonResponse(data, 200, req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    console.error("Yahoo chart proxy error:", err);
    return errorResponse(msg, 500, req);
  }
});
