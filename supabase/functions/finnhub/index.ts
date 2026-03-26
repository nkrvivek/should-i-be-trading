import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

// ── In-memory cache (per Deno isolate) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

function getCacheTTL(endpoint: string): number {
  // Quote data — short cache (1 min)
  if (endpoint === "quote") return 60 * 1000;
  // Metrics/fundamentals — medium cache (15 min)
  if (endpoint === "stock/metric") return 15 * 60 * 1000;
  // News — medium cache (5 min)
  if (endpoint.includes("news")) return 5 * 60 * 1000;
  // Insider transactions — longer cache (1 hour)
  if (endpoint.includes("insider")) return 60 * 60 * 1000;
  // Calendar events — cache 6 hours
  if (endpoint.includes("calendar")) return 6 * 60 * 60 * 1000;
  // Default: 5 min
  return 5 * 60 * 1000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!apiKey) return errorResponse("FINNHUB_API_KEY not configured", 500);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) return errorResponse("Missing 'endpoint' parameter");

    const params = new URLSearchParams({ token: apiKey });
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint") params.set(key, value);
    }

    // ── Check cache ─────────────────────────────────────────────
    const cacheKey = `${endpoint}?${params.toString()}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse(cached.data);
    }

    // ── Fetch from Finnhub ──────────────────────────────────────
    const response = await fetch(`${FINNHUB_BASE}/${endpoint}?${params}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`Finnhub error (${response.status}):`, text);
      // Don't cache errors
      return errorResponse(`Finnhub API error: ${response.status}`, 502);
    }
    const data = await response.json();

    // ── Store in cache ──────────────────────────────────────────
    if (cache.size >= MAX_CACHE_ENTRIES) {
      // Evict oldest entries
      const entries = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires);
      for (let i = 0; i < entries.length / 2; i++) cache.delete(entries[i][0]);
    }
    cache.set(cacheKey, { data, expires: Date.now() + getCacheTTL(endpoint) });

    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Finnhub error", 500);
  }
});
