import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const FRED_BASE = "https://api.stlouisfed.org/fred";

// Allowed FRED endpoints
const ALLOWED_ENDPOINTS = new Set(["series/observations", "series", "releases"]);

// ── In-memory cache (per Deno isolate) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE_ENTRIES = 200;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — FRED data updates daily at most

// Allowed query params (excludes api_key, file_type, endpoint, series_id which are handled separately)
const ALLOWED_PARAMS = new Set([
  "observation_start", "observation_end", "frequency",
  "units", "sort_order", "limit", "offset",
  "realtime_start", "realtime_end", "order_by",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const apiKey = Deno.env.get("FRED_API_KEY");
    if (!apiKey) return errorResponse("FRED_API_KEY not configured", 500, req);

    const url = new URL(req.url);
    const seriesId = url.searchParams.get("series_id");
    const endpoint = url.searchParams.get("endpoint") ?? "series/observations";

    // Validate endpoint
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}`, 403, req);
    }

    if (!seriesId && endpoint === "series/observations") {
      return errorResponse("Missing series_id parameter", 400, req);
    }

    const params = new URLSearchParams();

    if (seriesId) params.set("series_id", seriesId);

    // Forward only whitelisted params
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "series_id" && key !== "endpoint" && ALLOWED_PARAMS.has(key)) {
        params.set(key, value);
      }
    }

    // Set controlled params AFTER user params to prevent override
    params.delete("api_key"); // Prevent user override
    params.delete("file_type"); // Always use JSON
    params.set("api_key", apiKey);
    params.set("file_type", "json");

    // Check cache
    const cacheKey = `${endpoint}:${params.toString()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return jsonResponse(cached.data, 200, req);
    }

    const response = await fetch(`${FRED_BASE}/${endpoint}?${params}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`FRED error (${response.status}):`, text);
      return errorResponse(`FRED API error: ${response.status}`, 502, req);
    }
    const data = await response.json();

    // Store in cache
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });

    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FRED error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
