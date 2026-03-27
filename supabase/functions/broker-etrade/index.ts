import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const PROD_BASE = "https://api.etrade.com";
const SANDBOX_BASE = "https://apisb.etrade.com";

// ── Allowed endpoints whitelist ─────────────────────────────────
const ALLOWED_ENDPOINTS = [
  "v1/accounts/list",
  "v1/accounts/{key}/balance",
  "v1/accounts/{key}/portfolio",
  "v1/accounts/{key}/orders",
  "v1/accounts/{key}/orders/preview",
  "v1/accounts/{key}/orders/place",
  "v1/market/quote/{symbols}",
  "v1/market/optionchains",
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
  if (endpoint.includes("market/quote")) return 60 * 1000;        // 1 min
  if (endpoint.includes("optionchains")) return 5 * 60 * 1000;    // 5 min
  return 0; // no cache for accounts/positions/orders
}

// ── OAuth 1.0a signing ──────────────────────────────────────────
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

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

async function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  tokenSecret: string,
): Promise<string> {
  // Add OAuth params
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...params,
  };

  // 1. Build sorted parameter string
  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  // 2. Build signature base string
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;

  // 3. Build signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  // 4. HMAC-SHA1 → base64
  const signature = await hmacSha1(signingKey, signatureBase);

  // Build Authorization header
  const authParams = sortedKeys
    .filter((k) => k.startsWith("oauth_"))
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${authParams}, oauth_signature="${percentEncode(signature)}"`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    await authenticateRequest(req);

    const consumerKey = Deno.env.get("ETRADE_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("ETRADE_CONSUMER_SECRET");
    if (!consumerKey || !consumerSecret) {
      return errorResponse("E*Trade consumer credentials not configured", 500, req);
    }

    const body = await req.json();
    const {
      endpoint,
      accountIdKey,
      oauthToken,
      oauthTokenSecret,
      mode,
      params,
      method: httpMethod = "GET",
      orderParams,
    } = body as {
      endpoint: string;
      accountIdKey?: string;
      oauthToken: string;
      oauthTokenSecret: string;
      mode?: string;
      params?: Record<string, string>;
      method?: string;
      orderParams?: unknown;
    };

    if (!endpoint) return errorResponse("Missing 'endpoint'", 400, req);
    if (!oauthToken || !oauthTokenSecret) {
      return errorResponse("Missing OAuth tokens", 400, req);
    }

    // Replace {key} placeholder with actual accountIdKey
    let resolvedEndpoint = endpoint;
    if (accountIdKey) {
      resolvedEndpoint = resolvedEndpoint.replace(/\{key\}/g, accountIdKey);
    }

    if (!isAllowedEndpoint(resolvedEndpoint)) {
      return errorResponse(`Endpoint not allowed: ${resolvedEndpoint}`, 403, req);
    }

    // Check cache for GET requests
    const cacheKey = `${resolvedEndpoint}?${JSON.stringify(params ?? {})}`;
    const ttl = getCacheTTL(resolvedEndpoint);
    if (httpMethod === "GET" && ttl > 0) {
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return jsonResponse(cached.data, 200, req);
      }
    }

    const baseUrl = mode === "sandbox" ? SANDBOX_BASE : PROD_BASE;
    const fullUrl = `${baseUrl}/${resolvedEndpoint}`;

    // Build query string for GET
    const queryParams = new URLSearchParams(params ?? {});
    const requestUrl = httpMethod === "GET" && queryParams.toString()
      ? `${fullUrl}?${queryParams}`
      : fullUrl;

    // OAuth params include the token
    const oauthInputParams: Record<string, string> = {
      oauth_token: oauthToken,
      ...(httpMethod === "GET" ? (params ?? {}) : {}),
    };

    const authHeader = await oauthSign(
      httpMethod,
      fullUrl,
      oauthInputParams,
      consumerKey,
      consumerSecret,
      oauthTokenSecret,
    );

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if ((httpMethod === "POST" || httpMethod === "PUT") && orderParams) {
      fetchOptions.body = JSON.stringify(orderParams);
    }

    const response = await fetch(requestUrl, fetchOptions);
    if (!response.ok) {
      const text = await response.text();
      console.error(`E*Trade error (${response.status}):`, text);
      return errorResponse(`E*Trade API error: ${response.status} - ${text}`, 502, req);
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
    const msg = e instanceof Error ? e.message : "E*Trade proxy error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
