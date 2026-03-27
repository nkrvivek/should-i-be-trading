import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const PROD_BASE = "https://api.webull.com";
const TEST_BASE = "https://us-openapi-alb.uat.webullbroker.com";

// ── Allowed endpoints whitelist ─────────────────────────────────
const ALLOWED_ENDPOINTS = [
  "trade/account/list",
  "trade/account/{id}",
  "trade/account/{id}/positions",
  "trade/orders",
  "trade/place_order",
  "trade/cancel_order",
  "market/snapshot",
  "market/options/chains",
];

function isAllowedEndpoint(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.some((pattern) => {
    const regex = new RegExp("^" + pattern.replace(/\{[^}]+\}/g, "[^/]+") + "$");
    return regex.test(endpoint);
  });
}

// ── In-memory cache (per Deno isolate) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE_ENTRIES = 200;

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes("market/snapshot")) return 60 * 1000;      // 1 min
  if (endpoint.includes("options/chains")) return 5 * 60 * 1000;   // 5 min
  return 0; // no cache for positions/orders
}

// ── HMAC-SHA1 signing for Webull ────────────────────────────────
async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function sha1Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-1", encoder.encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function webullSign(
  method: string,
  urlPath: string,
  queryParams: Record<string, string>,
  body: string | undefined,
  appSecret: string,
  _nonce: string,
  _timestamp: string,
): Promise<string> {
  // Sort query params
  const sortedKeys = Object.keys(queryParams).sort();
  const queryString = sortedKeys.map((k) => `${k}=${queryParams[k]}`).join("&");

  // Body hash (empty string hash if no body)
  const bodyHash = body ? await sha1Hash(body) : "";

  // Build sign string: method + path + sorted query + body hash
  const parts = [method.toUpperCase(), urlPath];
  if (queryString) parts.push(queryString);
  if (bodyHash) parts.push(bodyHash);
  const signString = parts.join("\n");

  // Sign with appSecret + "&"
  const signingKey = appSecret + "&";
  return hmacSha1(signingKey, signString);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    await authenticateRequest(req);

    const appSecret = Deno.env.get("WEBULL_APP_SECRET");
    if (!appSecret) return errorResponse("Webull app secret not configured", 500, req);

    const reqBody = await req.json();
    const {
      endpoint,
      appKey,
      accessToken,
      mode,
      params,
      method: httpMethod = "GET",
      body: requestBody,
    } = reqBody as {
      endpoint: string;
      appKey: string;
      accessToken: string;
      mode?: string;
      params?: Record<string, string>;
      method?: string;
      body?: unknown;
    };

    if (!endpoint) return errorResponse("Missing 'endpoint'", 400, req);
    if (!appKey || !accessToken) return errorResponse("Missing appKey or accessToken", 400, req);

    // Validate input formats
    if (!/^[a-zA-Z0-9]{8,64}$/.test(appKey)) {
      return errorResponse("Invalid appKey format", 400, req);
    }
    if (!/^[a-zA-Z0-9_.-]{10,2048}$/.test(accessToken)) {
      return errorResponse("Invalid accessToken format", 400, req);
    }
    if (endpoint.includes("..") || endpoint.includes("//")) {
      return errorResponse("Invalid endpoint path", 400, req);
    }

    if (!isAllowedEndpoint(endpoint)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}`, 403, req);
    }

    // Check cache for GET requests
    const cacheKey = `${endpoint}?${JSON.stringify(params ?? {})}`;
    const ttl = getCacheTTL(endpoint);
    if (httpMethod === "GET" && ttl > 0) {
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return jsonResponse(cached.data, 200, req);
      }
    }

    const baseUrl = mode === "test" ? TEST_BASE : PROD_BASE;
    const urlPath = `/${endpoint}`;
    const queryParams = params ?? {};
    const bodyString = requestBody ? JSON.stringify(requestBody) : undefined;

    // Build signing components
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();

    const signature = await webullSign(
      httpMethod,
      urlPath,
      queryParams,
      bodyString,
      appSecret,
      nonce,
      timestamp,
    );

    // Build request URL with query params
    const queryString = new URLSearchParams(queryParams).toString();
    const requestUrl = queryString
      ? `${baseUrl}${urlPath}?${queryString}`
      : `${baseUrl}${urlPath}`;

    const fetchHeaders: Record<string, string> = {
      "x-app-key": appKey,
      "x-timestamp": timestamp,
      "x-signature-nonce": nonce,
      "x-signature": signature,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: fetchHeaders,
    };

    if ((httpMethod === "POST" || httpMethod === "PUT" || httpMethod === "DELETE") && bodyString) {
      fetchOptions.body = bodyString;
    }

    const response = await fetch(requestUrl, fetchOptions);
    if (!response.ok) {
      const text = await response.text();
      console.error(`Webull error (${response.status}):`, text);
      return errorResponse(`Webull API error: ${response.status}`, 502, req);
    }

    const data = await response.json();

    // Store in cache
    if (httpMethod === "GET" && ttl > 0) {
      if (cache.size >= MAX_CACHE_ENTRIES) {
        const entries = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires);
        for (let i = 0; i < entries.length / 2; i++) cache.delete(entries[i][0]);
      }
      cache.set(cacheKey, { data, expires: Date.now() + ttl });
    }

    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webull proxy error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
