import { authenticateRequest, getUserCredential, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  errorResponseWithHeaders,
  jsonResponseWithHeaders,
} from "../_shared/rateLimit.ts";

const EXA_BASE = "https://api.exa.ai";
const ALLOWED_ENDPOINTS = ["/search", "/contents"];
const cache = new Map<string, { data: unknown; expires: number }>();

function getCacheTTL(endpoint: string): number {
  if (endpoint === "/search") return 2 * 60 * 1000;
  return 5 * 60 * 1000;
}

function getRateLimitConfig(endpoint: string) {
  if (endpoint === "/contents") return { capacity: 20, refillMs: 60_000 };
  return { capacity: 12, refillMs: 60_000 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const ctx = await authenticateRequest(req);
    const apiKey = await getUserCredential(ctx, "exa");

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") ?? "/search";

    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}. Valid: ${ALLOWED_ENDPOINTS.join(", ")}`, 403, req);
    }

    const body = await req.json();
    const cacheKey = `${ctx.userId}:${endpoint}:${JSON.stringify(body)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      const cachedData = cached.data as Record<string, unknown>;
      return jsonResponse({ ...cachedData, cached: true }, 200, req);
    }

    const rateLimit = consumeRateLimit({
      key: `${ctx.userId}:exa:${endpoint}`,
      ...getRateLimitConfig(endpoint),
    });
    if (!rateLimit.allowed) {
      return errorResponseWithHeaders(
        `Rate limit exceeded for Exa ${endpoint}. Try again shortly.`,
        429,
        req,
        buildRateLimitHeaders(rateLimit),
      );
    }

    const response = await fetch(`${EXA_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return errorResponseWithHeaders(
        `Exa upstream rate limit reached for ${endpoint}.`,
        429,
        req,
        {
          ...buildRateLimitHeaders(rateLimit),
          ...(retryAfter ? { "Retry-After": retryAfter } : {}),
        },
      );
    }

    if (!response.ok) {
      console.error(`Exa API error (${response.status})`);
      return errorResponseWithHeaders(
        `Exa API error: ${response.status}`,
        response.status >= 500 ? 502 : response.status,
        req,
        buildRateLimitHeaders(rateLimit),
      );
    }

    const data = await response.json();
    cache.set(cacheKey, { data, expires: Date.now() + getCacheTTL(endpoint) });

    if (cache.size > 200) {
      const now = Date.now();
      for (const [key, value] of cache) {
        if (value.expires < now) cache.delete(key);
      }
    }

    return jsonResponseWithHeaders({ ...data, cached: false }, 200, req, buildRateLimitHeaders(rateLimit));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return errorResponse(msg, msg.includes("credential") ? 403 : 500, req);
  }
});
