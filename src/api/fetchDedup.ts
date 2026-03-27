/**
 * Fetch deduplication — if the same URL is requested multiple times
 * within the TTL window, reuse the in-flight or cached response
 * instead of making a duplicate network call.
 *
 * This prevents redundant API calls when multiple hooks/components
 * request the same data simultaneously (e.g., sector ETF quotes
 * from both useMarketScore and SectorHeatMap).
 */

interface CacheEntry {
  promise: Promise<Response>;
  expires: number;
}

const inflight = new Map<string, CacheEntry>();
const DEFAULT_TTL = 30_000; // 30 seconds

/**
 * Deduplicated fetch — same URL within TTL returns the same Promise.
 * Clones the response so multiple consumers can read the body.
 */
export function dedupFetch(
  url: string,
  init?: RequestInit,
  ttlMs = DEFAULT_TTL,
): Promise<Response> {
  // Only dedup GET requests (or requests without a body)
  const method = init?.method?.toUpperCase() ?? "GET";
  if (method !== "GET") return fetch(url, init);

  const key = url;
  const cached = inflight.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.promise.then((res) => res.clone());
  }

  const promise = fetch(url, init).then((res) => {
    // If the request failed, don't cache it
    if (!res.ok) {
      inflight.delete(key);
    }
    return res;
  });

  inflight.set(key, { promise, expires: Date.now() + ttlMs });

  // Cleanup old entries periodically
  if (inflight.size > 200) {
    const now = Date.now();
    for (const [k, v] of inflight) {
      if (now >= v.expires) inflight.delete(k);
    }
  }

  return promise.then((res) => res.clone());
}
