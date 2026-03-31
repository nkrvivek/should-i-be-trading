/**
 * Combined social sentiment hook — fetches StockTwits, Reddit, and FinTwit
 * data in parallel, computes a unified social score.
 *
 * Symbol-specific sentiment and global trending data are intentionally split so
 * switching tickers does not refetch the same trending payload repeatedly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getStockTwitsSentiment } from "../api/stocktwitsClient";
import { searchRedditForTicker } from "../api/redditClient";
import { exaSearch } from "../api/exaClient";
import {
  computeSocialScore,
  type SocialSentimentData,
  type SocialScore,
  type FinTwitPost,
} from "../lib/socialScoring";

interface SocialSentimentResult {
  data: {
    sentiment: SocialSentimentData;
    score: SocialScore;
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const cache = new Map<string, { data: SocialSentimentResult["data"]; expires: number }>();
const inflight = new Map<string, Promise<SocialSentimentResult["data"]>>();

export function getCachedSocialScore(symbol: string): SocialScore | null {
  const key = symbol.toUpperCase().trim();
  if (!key) return null;

  const cached = cache.get(key);
  if (!cached || Date.now() >= cached.expires) return null;

  return cached.data?.score ?? null;
}

const BULLISH_KEYWORDS = ["buy", "bull", "calls", "moon", "long", "breakout", "rally"];
const BEARISH_KEYWORDS = ["sell", "bear", "puts", "short", "crash", "dump", "drop"];

async function fetchSocialSentimentData(symbol: string, force = false): Promise<SocialSentimentResult["data"]> {
  const key = symbol.toUpperCase();

  if (!force) {
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
  }

  if (!force) {
    const pending = inflight.get(key);
    if (pending) {
      return pending;
    }
  }

  const request = (async () => {
    const [stocktwitsResult, redditResult, exaResult] = await Promise.allSettled([
      getStockTwitsSentiment(key),
      searchRedditForTicker(key),
      exaSearch(`$${key} stock twitter fintwit`, 8).catch(() => ({ results: [] })),
    ]);

    const stocktwits = stocktwitsResult.status === "fulfilled" ? stocktwitsResult.value : null;
    const redditPosts = redditResult.status === "fulfilled" ? redditResult.value : [];
    const exaResults = exaResult.status === "fulfilled" ? exaResult.value : { results: [] };

    const sentiment: SocialSentimentData = {};

    if (stocktwits) {
      sentiment.stocktwits = stocktwits;
    }

    if (redditPosts.length > 0) {
      let bullishCount = 0;
      let bearishCount = 0;
      for (const post of redditPosts) {
        const text = `${post.title} ${post.selftext}`.toLowerCase();
        const isBullish = BULLISH_KEYWORDS.some((keyword) => text.includes(keyword));
        const isBearish = BEARISH_KEYWORDS.some((keyword) => text.includes(keyword));
        if (isBullish && !isBearish) bullishCount++;
        else if (isBearish && !isBullish) bearishCount++;
      }
      sentiment.reddit = {
        mentions: redditPosts.length,
        bullishCount,
        bearishCount,
        posts: redditPosts,
      };
    }

    if (exaResults.results.length > 0) {
      const finTwitPosts: FinTwitPost[] = exaResults.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.text,
        publishedDate: result.publishedDate,
      }));

      const avgScore =
        exaResults.results.reduce((sum, result) => sum + (result.score ?? 0), 0) /
        exaResults.results.length;

      sentiment.fintwit = {
        posts: finTwitPosts,
        relevanceScore: Math.min(1, avgScore),
      };
    }

    const result = { sentiment, score: computeSocialScore(sentiment) };
    if (cache.size > 500) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (v.expires < now) cache.delete(k);
      }
    }
    cache.set(key, { data: result, expires: Date.now() + CACHE_TTL });
    return result;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, request);
  return request;
}

export function useSocialSentiment(symbol: string | null): SocialSentimentResult {
  const [data, setData] = useState<SocialSentimentResult["data"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(
    async (force = false) => {
      if (!symbol) {
        setData(null);
        setError(null);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setLoading(true);
      setError(null);

      try {
        const result = await fetchSocialSentimentData(symbol, force);
        if (requestIdRef.current !== requestId) return;
        setData(result);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Failed to fetch social data");
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [symbol],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh };
}
