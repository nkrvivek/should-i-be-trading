import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * FMP (Financial Modeling Prep) proxy edge function.
 *
 * Proxies requests to the FMP stable API with server-side API key.
 * Includes response caching to stay within 250 calls/day free tier.
 *
 * Usage:
 *   POST /functions/v1/fmp
 *   Body: { "endpoint": "profile", "symbol": "AAPL" }
 *
 * Supported endpoints:
 *   - profile          — Company overview (price, sector, market cap, description)
 *   - income-statement — Income statement (annual or quarterly)
 *   - balance-sheet    — Balance sheet (annual or quarterly)
 *   - cash-flow        — Cash flow statement
 *   - ratios-ttm       — Key financial ratios (trailing twelve months)
 *   - key-metrics-ttm  — Key metrics snapshot
 *   - analyst-estimates — Forward EPS/revenue estimates
 *   - price-target      — Analyst price target consensus
 *   - earnings          — Historical earnings for a symbol
 *   - screener          — Stock screener with filters
 *   - search            — Symbol/company name search
 *
 * Requires secret: FMP_API_KEY
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_V3_BASE = "https://financialmodelingprep.com/api/v3";

// ── Endpoint whitelist with allowed params ──────────────────────
// Most use the stable API; some (historical-price) are v3-only with symbol-in-path.
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
};

// ── Simple in-memory cache (per Deno isolate) ───────────────────
const cache = new Map<string, { data: unknown; expires: number }>();

function getCacheTTL(endpoint: string): number {
  // Financial statements change quarterly — cache longer
  if (["income-statement", "balance-sheet", "cash-flow"].includes(endpoint)) return 7 * 24 * 3600 * 1000; // 7 days
  if (["ratios", "ratios-ttm", "key-metrics", "key-metrics-ttm"].includes(endpoint)) return 24 * 3600 * 1000; // 1 day
  if (["profile"].includes(endpoint)) return 6 * 3600 * 1000; // 6 hours
  if (["analyst-estimates", "price-target", "price-target-summary"].includes(endpoint)) return 12 * 3600 * 1000; // 12 hours
  if (["earnings", "earnings-calendar"].includes(endpoint)) return 6 * 3600 * 1000; // 6 hours
  if (["historical-price"].includes(endpoint)) return 3600 * 1000; // 1 hour
  return 3600 * 1000; // 1 hour default
}

// ── Handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FMP_API_KEY");
    if (!apiKey) {
      return errorResponse("FMP_API_KEY not configured. Add it via: supabase secrets set FMP_API_KEY=your_key", 500);
    }

    const body = await req.json();
    const { endpoint, symbol, period, limit, ...extraParams } = body as {
      endpoint: string;
      symbol?: string;
      period?: string;
      limit?: number;
      [key: string]: unknown;
    };

    // Validate endpoint
    const config = ENDPOINTS[endpoint];
    if (!config) {
      return errorResponse(`Unknown endpoint: ${endpoint}. Valid: ${Object.keys(ENDPOINTS).join(", ")}`, 400);
    }

    if (config.requiresSymbol && !symbol) {
      return errorResponse(`Endpoint "${endpoint}" requires a symbol parameter`, 400);
    }

    // Build URL — some endpoints use v3 base + symbol in path
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

    // Date range params (earnings calendar + historical prices)
    if (endpoint === "earnings-calendar" || endpoint === "historical-price") {
      if (extraParams.from) url.searchParams.set("from", String(extraParams.from));
      if (extraParams.to) url.searchParams.set("to", String(extraParams.to));
    }

    // Check cache
    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return jsonResponse({ data: cached.data, cached: true });
    }

    // Fetch from FMP
    const res = await fetch(url.toString());

    if (res.status === 429) {
      return errorResponse("FMP daily rate limit reached (250 calls/day). Try again tomorrow.", 429);
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`FMP error (${res.status}):`, text);
      return errorResponse(`FMP API error: ${res.status}`, 502);
    }

    const data = await res.json();

    // Cache the response
    cache.set(cacheKey, { data, expires: Date.now() + getCacheTTL(endpoint) });

    // Prune old cache entries (keep under 500)
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (val.expires < now) cache.delete(key);
      }
    }

    return jsonResponse({ data, cached: false });
  } catch (err) {
    console.error("FMP proxy error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});
