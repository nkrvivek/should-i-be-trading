import { getCorsHeaders } from "./auth.ts";

type Bucket = {
  tokens: number;
  updatedAt: number;
};

type ConsumeRateLimitOptions = {
  key: string;
  capacity: number;
  refillMs: number;
  cost?: number;
};

type RateLimitResult = {
  allowed: boolean;
  capacity: number;
  remaining: number;
  retryAfterSec: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;
const RATE_LIMIT_EXPOSE_HEADERS = "x-ai-used, x-ai-limit, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After";

export function consumeRateLimit(options: ConsumeRateLimitOptions): RateLimitResult {
  const { key, capacity, refillMs, cost = 1 } = options;
  const now = Date.now();
  const refillRate = capacity / refillMs;
  const existing = buckets.get(key);
  const bucket = existing
    ? {
        tokens: Math.min(capacity, existing.tokens + (now - existing.updatedAt) * refillRate),
        updatedAt: now,
      }
    : {
        tokens: capacity,
        updatedAt: now,
      };

  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    buckets.set(key, bucket);
    pruneBuckets(now);

    return {
      allowed: true,
      capacity,
      remaining: Math.floor(bucket.tokens),
      retryAfterSec: 0,
      resetAt: now,
    };
  }

  const deficit = cost - bucket.tokens;
  const msUntilAvailable = Math.ceil(deficit / refillRate);
  buckets.set(key, bucket);
  pruneBuckets(now);

  return {
    allowed: false,
    capacity,
    remaining: Math.floor(bucket.tokens),
    retryAfterSec: Math.max(1, Math.ceil(msUntilAvailable / 1000)),
    resetAt: now + msUntilAvailable,
  };
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.capacity),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfterSec > 0 ? { "Retry-After": String(result.retryAfterSec) } : {}),
  };
}

export function jsonResponseWithHeaders(
  data: unknown,
  status: number,
  req: Request,
  headers: Record<string, string> = {},
): Response {
  const corsHeaders = getCorsHeaders(req);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Access-Control-Expose-Headers": RATE_LIMIT_EXPOSE_HEADERS,
      ...headers,
    },
  });
}

export function errorResponseWithHeaders(
  message: string,
  status: number,
  req: Request,
  headers: Record<string, string> = {},
): Response {
  return jsonResponseWithHeaders({ error: message }, status, req, headers);
}

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > 15 * 60 * 1000) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_BUCKETS) return;

  const oldest = [...buckets.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  for (let i = 0; i < oldest.length / 4; i += 1) {
    buckets.delete(oldest[i][0]);
  }
}
