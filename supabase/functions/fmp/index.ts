import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  errorResponseWithHeaders,
  jsonResponseWithHeaders,
} from "../_shared/rateLimit.ts";

/**
 * FMP (Financial Modeling Prep) proxy edge function.
 *
 * Proxies requests to the FMP stable API with server-side API key.
 * Includes response caching to stay within 250 calls/day free tier.
 * Requires authentication.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_V3_BASE = "https://financialmodelingprep.com/api/v3";

// ── Endpoint whitelist with allowed params ──────────────────────
const ENDPOINTS: Record<string, { path: string; requiresSymbol: boolean; v3?: boolean; symbolInPath?: boolean }> = {
  "profile":            { path: "/profile",               requiresSymbol: true },
  "income-statement":   { path: "/income-statement",      requiresSymbol: true },
  "balance-sheet":      { path: "/balance-sheet-statement", requiresSymbol: true },
  "cash-flow":          { path: "/cash-flow-statement",   requiresSymbol: true },
  "ratios-ttm":         { path: "/ratios-ttm",            requiresSymbol: true },
  "ratios":             { path: "/ratios",                 requiresSymbol: true },
  "key-metrics-ttm":    { path: "/key-metrics-ttm",       requiresSymbol: true },
  "key-metrics":        { path: "/key-metrics",            requiresSymbol: true },
  "analyst-estimates":  { path: "/analyst-estimates",      requiresSymbol: true },
  "price-target":       { path: "/price-target-consensus", requiresSymbol: true },
  "price-target-summary": { path: "/price-target-summary", requiresSymbol: true },
  "earnings":           { path: "/earnings",               requiresSymbol: true },
  "earnings-calendar":  { path: "/earnings-calendar",      requiresSymbol: false },
  "screener":           { path: "/company-screener",       requiresSymbol: false },
  "search":             { path: "/search",                 requiresSymbol: false },
  "historical-price":   { path: "/historical-price-full",  requiresSymbol: true, v3: true, symbolInPath: true },
  "quote":              { path: "/quote",                  requiresSymbol: true, v3: true, symbolInPath: true },
  "actives":            { path: "/stock_market/actives",   requiresSymbol: false, v3: true, symbolInPath: false },
  "gainers":            { path: "/stock_market/gainers",   requiresSymbol: false, v3: true, symbolInPath: false },
  "losers":             { path: "/stock_market/losers",    requiresSymbol: false, v3: true, symbolInPath: false },
};

// ── Simple in-memory cache (per Deno isolate) ───────────────────
const cache = new Map<string, { data: unknown; expires: number }>();

function getCacheTTL(endpoint: string): number {
  if (["income-statement", "balance-sheet", "cash-flow"].includes(endpoint)) return 7 * 24 * 3600 * 1000;
  if (["ratios", "ratios-ttm", "key-metrics", "key-metrics-ttm"].includes(endpoint)) return 24 * 3600 * 1000;
  if (["profile"].includes(endpoint)) return 6 * 3600 * 1000;
  if (["analyst-estimates", "price-target", "price-target-summary"].includes(endpoint)) return 12 * 3600 * 1000;
  if (["earnings", "earnings-calendar"].includes(endpoint)) return 6 * 3600 * 1000;
  if (["historical-price"].includes(endpoint)) return 3600 * 1000;
  if (["quote"].includes(endpoint)) return 5 * 60 * 1000;
  if (["actives", "gainers", "losers"].includes(endpoint)) return 5 * 60 * 1000;
  return 3600 * 1000;
}

function getRateLimitConfig(endpoint: string) {
  if (["profile", "quote"].includes(endpoint)) return { capacity: 120, refillMs: 60_000 };
  if (["income-statement", "balance-sheet", "cash-flow", "historical-price"].includes(endpoint)) {
    return { capacity: 60, refillMs: 60_000 };
  }
  if (["screener", "search"].includes(endpoint)) return { capacity: 45, refillMs: 60_000 };
  return { capacity: 90, refillMs: 60_000 };
}

// ── Handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    const ctx = await authenticateRequest(req);

    const apiKey = Deno.env.get("FMP_API_KEY");
    if (!apiKey) {
      return errorResponse("FMP_API_KEY not configured", 500, req);
    }

    // Enforce request body size limit
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 50000) {
      return errorResponse("Request too large", 413, req);
    }

    const body = await req.json();
    const { endpoint, symbol, period, limit, ...extraParams } = body as {
      endpoint: string;
      symbol?: string;
      period?: string;
      limit?: number;
      [key: string]: unknown;
    };

    // Validate symbol format if provided
    const SYMBOL_RE = /^[A-Z0-9.]{1,10}$/;
    if (symbol && !SYMBOL_RE.test(symbol.toUpperCase())) {
      return errorResponse("Invalid symbol format", 400, req);
    }

    // Validate endpoint
    const config = ENDPOINTS[endpoint];
    if (!config) {
      return errorResponse(`Unknown endpoint: ${endpoint}. Valid: ${Object.keys(ENDPOINTS).join(", ")}`, 400, req);
    }

    if (config.requiresSymbol && !symbol) {
      return errorResponse(`Endpoint "${endpoint}" requires a symbol parameter`, 400, req);
    }

    // Build URL
    const base = config.v3 ? FMP_V3_BASE : FMP_BASE;
    const path = config.symbolInPath && symbol
      ? `${config.path}/${symbol.toUpperCase()}`
      : config.path;
    const url = new URL(`${base}${path}`);
    url.searchParams.set("apikey", apiKey);
    if (symbol && !config.symbolInPath) url.searchParams.set("symbol", symbol.toUpperCase());
    if (period) url.searchParams.set("period", period);
    if (limit) url.searchParams.set("limit", String(limit));

    // Screener: pass through filter params
    if (endpoint === "screener") {
      const allowedScreenerParams = [
        "marketCapMoreThan", "marketCapLowerThan",
        "priceMoreThan", "priceLowerThan",
        "betaMoreThan", "betaLowerThan",
        "volumeMoreThan", "volumeLowerThan",
        "dividendMoreThan", "dividendLowerThan",
        "sector", "industry", "country", "exchange",
        "isEtf", "isActivelyTrading",
      ];
      for (const param of allowedScreenerParams) {
        if (extraParams[param] != null) {
          url.searchParams.set(param, String(extraParams[param]));
        }
      }
    }

    // Search: pass query
    if (endpoint === "search" && extraParams.query) {
      url.searchParams.set("query", String(extraParams.query));
    }

    // Date range params
    if (endpoint === "earnings-calendar" || endpoint === "historical-price") {
      if (extraParams.from) url.searchParams.set("from", String(extraParams.from));
      if (extraParams.to) url.searchParams.set("to", String(extraParams.to));
    }

    // Build cache key WITHOUT the API key
    const cacheKey = `${endpoint}:${symbol || ""}:${period || ""}:${limit || ""}:${JSON.stringify(extraParams)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse({ data: cached.data, cached: true }, 200, req);
    }

    const rateLimit = consumeRateLimit({
      key: `${ctx.userId}:fmp:${endpoint}`,
      ...getRateLimitConfig(endpoint),
    });
    if (!rateLimit.allowed) {
      return errorResponseWithHeaders(
        `Rate limit exceeded for FMP ${endpoint}. Try again shortly.`,
        429,
        req,
        buildRateLimitHeaders(rateLimit),
      );
    }

    // Fetch from FMP
    const res = await fetch(url.toString());

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      return errorResponseWithHeaders(
        "FMP daily rate limit reached (250 calls/day). Try again tomorrow.",
        429,
        req,
        {
          ...buildRateLimitHeaders(rateLimit),
          ...(retryAfter ? { "Retry-After": retryAfter } : {}),
        },
      );
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`FMP error (${res.status}):`, text);
      return errorResponseWithHeaders(`FMP API error: ${res.status}`, 502, req, buildRateLimitHeaders(rateLimit));
    }

    const data = await res.json();

    // Cache the response
    cache.set(cacheKey, { data, expires: Date.now() + getCacheTTL(endpoint) });

    // Prune old cache entries
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (val.expires < now) cache.delete(key);
      }
    }

    return jsonResponseWithHeaders(
      { data, cached: false },
      200,
      req,
      buildRateLimitHeaders(rateLimit),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    console.error("FMP proxy error:", err);
    return errorResponse(msg, 500, req);
  }
});
