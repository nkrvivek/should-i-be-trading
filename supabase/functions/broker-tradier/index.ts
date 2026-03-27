import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const PROD_BASE = "https://api.tradier.com/v1";
const SANDBOX_BASE = "https://sandbox.tradier.com/v1";

// ── Allowed endpoints whitelist ─────────────────────────────────
const ALLOWED_ENDPOINTS = new Set([
  "user/profile",
  "accounts/{id}/balances",
  "accounts/{id}/positions",
  "accounts/{id}/orders",
  "markets/options/chains",
  "markets/options/expirations",
  "markets/quotes",
]);

// ── In-memory cache (per Deno isolate) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes("quotes")) return 60 * 1000; // 1 min
  if (endpoint.includes("options/chains") || endpoint.includes("options/expirations")) return 5 * 60 * 1000; // 5 min
  return 0; // positions, orders, profile — no cache
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const body = await req.json();
    const { endpoint, accountId, apiToken, mode, params, method, orderParams } = body as {
      endpoint?: string;
      accountId?: string;
      apiToken?: string;
      mode?: string;
      params?: Record<string, string>;
      method?: string;
      orderParams?: Record<string, string>;
    };

    if (!endpoint) return errorResponse("Missing 'endpoint'", 400, req);
    if (!apiToken) return errorResponse("Missing 'apiToken'", 400, req);

    // Validate endpoint against whitelist
    const endpointTemplate = endpoint.replace(/accounts\/[^/]+/, "accounts/{id}");
    if (!ALLOWED_ENDPOINTS.has(endpointTemplate)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}`, 403, req);
    }

    // Replace {id} with accountId
    let resolvedEndpoint = endpoint;
    if (endpoint.includes("{id}")) {
      if (!accountId) return errorResponse("Missing 'accountId' for account endpoint", 400, req);
      resolvedEndpoint = endpoint.replace("{id}", accountId);
    }

    // Build base URL
    const baseUrl = mode === "live" ? PROD_BASE : SANDBOX_BASE;

    // Build query params
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        searchParams.set(key, value);
      }
    }
    const queryString = searchParams.toString();
    const url = `${baseUrl}/${resolvedEndpoint}${queryString ? `?${queryString}` : ""}`;

    // ── Check cache for GET requests ────────────────────────────
    const httpMethod = (method ?? "GET").toUpperCase();
    const cacheKey = `${resolvedEndpoint}?${queryString}`;
    const ttl = getCacheTTL(resolvedEndpoint);

    if (httpMethod === "GET" && ttl > 0) {
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return jsonResponse(cached.data, 200, req);
      }
    }

    // ── Build fetch options ─────────────────────────────────────
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    };

    // For POST (place order), send orderParams as form data
    if (httpMethod === "POST" && orderParams) {
      const formParams = new URLSearchParams();
      for (const [key, value] of Object.entries(orderParams)) {
        formParams.set(key, value);
      }
      (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOptions.body = formParams.toString();
    }

    // ── Fetch from Tradier ──────────────────────────────────────
    const response = await fetch(url, fetchOptions);

    // Build response headers, passing through rate limit info
    const responseHeaders: Record<string, string> = {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    };
    const rateLimitHeaders = ["x-ratelimit-allowed", "x-ratelimit-used", "x-ratelimit-available", "x-ratelimit-expiry"];
    for (const h of rateLimitHeaders) {
      const val = response.headers.get(h);
      if (val) responseHeaders[h] = val;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error(`Tradier error (${response.status}):`, text);
      return new Response(JSON.stringify({ error: `Tradier API error: ${response.status}`, detail: text }), {
        status: 502,
        headers: responseHeaders,
      });
    }

    const data = await response.json();

    // ── Store in cache ──────────────────────────────────────────
    if (httpMethod === "GET" && ttl > 0) {
      if (cache.size >= MAX_CACHE_ENTRIES) {
        const entries = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires);
        for (let i = 0; i < entries.length / 2; i++) cache.delete(entries[i][0]);
      }
      cache.set(cacheKey, { data, expires: Date.now() + ttl });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Tradier proxy error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
