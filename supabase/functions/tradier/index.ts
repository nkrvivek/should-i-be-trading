import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * Tradier API proxy edge function.
 *
 * Proxies requests to Tradier's sandbox/production API for options chains,
 * quotes, and expirations. Server-side API key keeps it secure.
 *
 * Usage:
 *   POST /functions/v1/tradier
 *   Body: { "endpoint": "chain", "symbol": "AAPL", "expiration": "2026-04-17" }
 *
 * Supported endpoints:
 *   - quote        — Stock quote (last price, change, volume)
 *   - expirations  — Available option expiration dates for a symbol
 *   - chain        — Full options chain for a symbol + expiration
 *   - strikes      — Available strikes for a symbol + expiration
 *
 * Requires secret: TRADIER_API_KEY
 * Optional secret: TRADIER_SANDBOX (set to "true" to use sandbox)
 */

const PROD_BASE = "https://api.tradier.com/v1";
const SANDBOX_BASE = "https://sandbox.tradier.com/v1";

// ── In-memory cache ────────────────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();

function getCacheTTL(endpoint: string): number {
  if (endpoint === "expirations") return 24 * 3600 * 1000; // 1 day
  if (endpoint === "strikes") return 6 * 3600 * 1000; // 6 hours
  if (endpoint === "chain") return 5 * 60 * 1000; // 5 min (prices change)
  if (endpoint === "quote") return 60 * 1000; // 1 min
  return 5 * 60 * 1000;
}

// ── Handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TRADIER_API_KEY");
    if (!apiKey) {
      return errorResponse(
        "TRADIER_API_KEY not configured. Get a free API key at https://developer.tradier.com and run: supabase secrets set TRADIER_API_KEY=your_key",
        500,
      );
    }

    const useSandbox = Deno.env.get("TRADIER_SANDBOX") === "true";
    const BASE = useSandbox ? SANDBOX_BASE : PROD_BASE;

    const body = await req.json();
    const { endpoint, symbol, expiration } = body as {
      endpoint: string;
      symbol?: string;
      expiration?: string;
    };

    if (!endpoint) {
      return errorResponse("Missing 'endpoint' in request body", 400);
    }

    let url: string;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };

    switch (endpoint) {
      case "quote": {
        if (!symbol) return errorResponse("'quote' requires a 'symbol'", 400);
        url = `${BASE}/markets/quotes?symbols=${encodeURIComponent(symbol.toUpperCase())}`;
        break;
      }
      case "expirations": {
        if (!symbol) return errorResponse("'expirations' requires a 'symbol'", 400);
        url = `${BASE}/markets/options/expirations?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
        break;
      }
      case "chain": {
        if (!symbol) return errorResponse("'chain' requires a 'symbol'", 400);
        if (!expiration) return errorResponse("'chain' requires an 'expiration' (YYYY-MM-DD)", 400);
        url = `${BASE}/markets/options/chains?symbol=${encodeURIComponent(symbol.toUpperCase())}&expiration=${expiration}&greeks=true`;
        break;
      }
      case "strikes": {
        if (!symbol) return errorResponse("'strikes' requires a 'symbol'", 400);
        if (!expiration) return errorResponse("'strikes' requires an 'expiration' (YYYY-MM-DD)", 400);
        url = `${BASE}/markets/options/strikes?symbol=${encodeURIComponent(symbol.toUpperCase())}&expiration=${expiration}`;
        break;
      }
      default:
        return errorResponse(`Unknown endpoint: ${endpoint}. Valid: quote, expirations, chain, strikes`, 400);
    }

    // Check cache
    const cacheKey = url;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse({ data: cached.data, cached: true });
    }

    // Fetch from Tradier
    const res = await fetch(url, { headers });

    if (res.status === 401) {
      return errorResponse("Tradier API key is invalid. Check your TRADIER_API_KEY secret.", 401);
    }
    if (res.status === 429) {
      return errorResponse("Tradier rate limit reached. Try again in a moment.", 429);
    }
    if (!res.ok) {
      const text = await res.text();
      console.error(`Tradier error (${res.status}):`, text);
      return errorResponse(`Tradier API error: ${res.status}`, 502);
    }

    const data = await res.json();

    // Cache the response
    cache.set(cacheKey, { data, expires: Date.now() + getCacheTTL(endpoint) });

    // Prune old cache entries
    if (cache.size > 200) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (val.expires < now) cache.delete(key);
      }
    }

    return jsonResponse({ data, cached: false });
  } catch (err) {
    console.error("Tradier proxy error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});
