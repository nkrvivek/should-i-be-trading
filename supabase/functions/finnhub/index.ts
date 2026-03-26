import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

// ── Allowed endpoints whitelist ─────────────────────────────────
const ALLOWED_ENDPOINTS = new Set([
  "quote", "stock/metric", "stock/peers", "stock/profile2",
  "stock/earnings", "stock/congressional-trading",
  "company-news", "calendar/earnings", "calendar/ipo",
  "stock/insider-transactions", "stock/insider-sentiment",
  "stock/recommendation", "stock/price-target",
  "news", "forex/rates",
]);

// ── Allowed query params whitelist ──────────────────────────────
const ALLOWED_PARAMS = new Set([
  "symbol", "from", "to", "resolution", "category",
  "exchange", "metric", "count",
]);

// ── In-memory cache (per Deno isolate) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

function getCacheTTL(endpoint: string): number {
  if (endpoint === "quote") return 60 * 1000;
  if (endpoint === "stock/metric") return 15 * 60 * 1000;
  if (endpoint.includes("news")) return 5 * 60 * 1000;
  if (endpoint.includes("insider")) return 60 * 60 * 1000;
  if (endpoint.includes("calendar")) return 6 * 60 * 60 * 1000;
  return 5 * 60 * 1000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!apiKey) return errorResponse("FINNHUB_API_KEY not configured", 500, req);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) return errorResponse("Missing 'endpoint' parameter", 400, req);

    // Validate endpoint against whitelist
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}`, 403, req);
    }

    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint" && ALLOWED_PARAMS.has(key)) params.set(key, value);
    }

    // ── Build cache key BEFORE adding secret token ──────────────
    const cacheKey = `${endpoint}?${params.toString()}`;

    // Now add the API token (after cache key is built)
    params.delete("token"); // Prevent user from overriding API token
    params.set("token", apiKey);
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse(cached.data, 200, req);
    }

    // ── Fetch from Finnhub ──────────────────────────────────────
    const response = await fetch(`${FINNHUB_BASE}/${endpoint}?${params}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`Finnhub error (${response.status}):`, text);
      return errorResponse(`Finnhub API error: ${response.status}`, 502, req);
    }
    const data = await response.json();

    // ── Store in cache ──────────────────────────────────────────
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const entries = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires);
      for (let i = 0; i < entries.length / 2; i++) cache.delete(entries[i][0]);
    }
    cache.set(cacheKey, { data, expires: Date.now() + getCacheTTL(endpoint) });

    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Finnhub error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
