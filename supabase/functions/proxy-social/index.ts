import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  jsonResponseWithHeaders,
} from "../_shared/rateLimit.ts";

/**
 * Social data proxy — fetches StockTwits and Reddit data server-side
 * to avoid CORS issues from direct browser calls.
 */

// In-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();
const MAX_CACHE = 200;

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  if (cache.size >= MAX_CACHE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

function getRateLimitConfig(source: string, action: string) {
  if (source === "stocktwits" && action === "trending") return { capacity: 45, refillMs: 60_000 };
  if (source === "reddit" && action === "hot") return { capacity: 45, refillMs: 60_000 };
  return { capacity: 90, refillMs: 60_000 };
}

function degradedPayload(
  payload: Record<string, unknown>,
  source: string,
  action: string,
  status: number,
  message: string,
) {
  return {
    ...payload,
    degraded: {
      source,
      action,
      status,
      message,
      ts: new Date().toISOString(),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const ctx = await authenticateRequest(req);

    const url = new URL(req.url);
    const source = url.searchParams.get("source"); // "stocktwits" or "reddit"
    const action = url.searchParams.get("action"); // "sentiment", "trending", "search", "hot"
    const symbol = url.searchParams.get("symbol");

    if (!source || !action) {
      return errorResponse("Missing source or action param", 400, req);
    }

    // ── StockTwits ──────────────────────────────────────
    if (source === "stocktwits") {
      if (action === "sentiment" && symbol) {
        const cacheKey = `st:sentiment:${symbol}`;
        const cached = getCached(cacheKey);
        if (cached) return jsonResponse(cached, 200, req);
        const rateLimit = consumeRateLimit({
          key: `${ctx.userId}:social:${source}:${action}`,
          ...getRateLimitConfig(source, action),
        });
        if (!rateLimit.allowed) {
          return jsonResponseWithHeaders(
            degradedPayload(
              { messages: [], symbol: null },
              source,
              action,
              429,
              "Edge rate limit reached. Try again shortly.",
            ),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }

        const res = await fetch(
          `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(symbol.toUpperCase())}.json`,
        );
        if (!res.ok) {
          return jsonResponseWithHeaders(
            degradedPayload({ messages: [], symbol: null }, source, action, res.status, "StockTwits sentiment unavailable"),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }
        const data = await res.json();
        setCache(cacheKey, data, 60_000); // 1 min
        return jsonResponseWithHeaders(data, 200, req, buildRateLimitHeaders(rateLimit));
      }

      if (action === "trending") {
        const cacheKey = "st:trending";
        const cached = getCached(cacheKey);
        if (cached) return jsonResponse(cached, 200, req);
        const rateLimit = consumeRateLimit({
          key: `${ctx.userId}:social:${source}:${action}`,
          ...getRateLimitConfig(source, action),
        });
        if (!rateLimit.allowed) {
          return jsonResponseWithHeaders(
            degradedPayload(
              { symbols: [] },
              source,
              action,
              429,
              "Edge rate limit reached. Try again shortly.",
            ),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }

        const res = await fetch("https://api.stocktwits.com/api/2/trending/symbols.json");
        if (!res.ok) {
          return jsonResponseWithHeaders(
            degradedPayload({ symbols: [] }, source, action, res.status, "StockTwits trending unavailable"),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }
        const data = await res.json();
        setCache(cacheKey, data, 120_000); // 2 min
        return jsonResponseWithHeaders(data, 200, req, buildRateLimitHeaders(rateLimit));
      }
    }

    // ── Reddit ───────────────────────────────────────────
    if (source === "reddit") {
      const subreddits = "wallstreetbets+stocks+options";

      if (action === "search" && symbol) {
        const cacheKey = `reddit:search:${symbol}`;
        const cached = getCached(cacheKey);
        if (cached) return jsonResponse(cached, 200, req);
        const rateLimit = consumeRateLimit({
          key: `${ctx.userId}:social:${source}:${action}`,
          ...getRateLimitConfig(source, action),
        });
        if (!rateLimit.allowed) {
          return jsonResponseWithHeaders(
            degradedPayload(
              { data: { children: [] } },
              source,
              action,
              429,
              "Edge rate limit reached. Try again shortly.",
            ),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }

        const res = await fetch(
          `https://www.reddit.com/r/${subreddits}/search.json?q=${encodeURIComponent(symbol)}&sort=new&limit=15&restrict_sr=on&raw_json=1`,
          { headers: { "User-Agent": "SIBT/1.0 (sibt.ai)" } },
        );
        if (!res.ok) {
          return jsonResponseWithHeaders(
            degradedPayload({ data: { children: [] } }, source, action, res.status, "Reddit search unavailable"),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }
        const data = await res.json();
        setCache(cacheKey, data, 120_000); // 2 min
        return jsonResponseWithHeaders(data, 200, req, buildRateLimitHeaders(rateLimit));
      }

      if (action === "hot") {
        const sub = url.searchParams.get("subreddit") || "wallstreetbets";
        const limit = url.searchParams.get("limit") || "20";
        const cacheKey = `reddit:hot:${sub}:${limit}`;
        const cached = getCached(cacheKey);
        if (cached) return jsonResponse(cached, 200, req);
        const rateLimit = consumeRateLimit({
          key: `${ctx.userId}:social:${source}:${action}`,
          ...getRateLimitConfig(source, action),
        });
        if (!rateLimit.allowed) {
          return jsonResponseWithHeaders(
            degradedPayload(
              { data: { children: [] } },
              source,
              action,
              429,
              "Edge rate limit reached. Try again shortly.",
            ),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }

        const res = await fetch(
          `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=${limit}&raw_json=1`,
          { headers: { "User-Agent": "SIBT/1.0 (sibt.ai)" } },
        );
        if (!res.ok) {
          return jsonResponseWithHeaders(
            degradedPayload({ data: { children: [] } }, source, action, res.status, "Reddit hot feed unavailable"),
            200,
            req,
            buildRateLimitHeaders(rateLimit),
          );
        }
        const data = await res.json();
        setCache(cacheKey, data, 120_000); // 2 min
        return jsonResponseWithHeaders(data, 200, req, buildRateLimitHeaders(rateLimit));
      }
    }

    return errorResponse(`Unknown source/action: ${source}/${action}`, 400, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Social proxy error";
    if (msg.includes("authentication") || msg.includes("token")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
