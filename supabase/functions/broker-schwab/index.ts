import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const SCHWAB_BASE = "https://api.schwabapi.com";

// ── Allowed endpoints whitelist ─────────────────────────────────
const ALLOWED_ENDPOINTS = new Set([
  "trader/v1/accounts/accountNumbers",
  "trader/v1/accounts/{hash}",
  "trader/v1/accounts/{hash}/orders",
  "marketdata/v1/chains",
  "marketdata/v1/quotes",
]);

// ── In-memory cache (per Deno isolate) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes("quotes")) return 60 * 1000; // 1 min
  if (endpoint.includes("chains")) return 5 * 60 * 1000; // 5 min
  return 0; // accounts, orders — no cache
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const body = await req.json();
    const { endpoint, accountHash, accessToken, params, method, orderBody } = body as {
      endpoint?: string;
      accountHash?: string;
      accessToken?: string;
      params?: Record<string, string>;
      method?: string;
      orderBody?: Record<string, unknown>;
    };

    if (!endpoint) return errorResponse("Missing 'endpoint'", 400, req);
    if (!accessToken) return errorResponse("Missing 'accessToken'", 400, req);

    // Validate endpoint against whitelist
    const endpointTemplate = endpoint.replace(/accounts\/[^/]+/, "accounts/{hash}");
    if (!ALLOWED_ENDPOINTS.has(endpointTemplate)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}`, 403, req);
    }

    // Replace {hash} with accountHash
    let resolvedEndpoint = endpoint;
    if (endpoint.includes("{hash}")) {
      if (!accountHash) return errorResponse("Missing 'accountHash' for account endpoint", 400, req);
      resolvedEndpoint = endpoint.replace("{hash}", accountHash);
    }

    // Build query params
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        searchParams.set(key, value);
      }
    }
    const queryString = searchParams.toString();
    const url = `${SCHWAB_BASE}/${resolvedEndpoint}${queryString ? `?${queryString}` : ""}`;

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
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    };

    // For POST (place order), send JSON body
    if (httpMethod === "POST" && orderBody) {
      (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(orderBody);
    }

    // ── Fetch from Schwab ───────────────────────────────────────
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      console.error(`Schwab error (${response.status}):`, text);
      return errorResponse(`Schwab API error: ${response.status}`, 502, req);
    }

    // DELETE responses may have no body
    if (httpMethod === "DELETE") {
      return jsonResponse({ success: true }, 200, req);
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

    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Schwab proxy error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
