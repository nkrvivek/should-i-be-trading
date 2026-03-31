/**
 * Combined social sentiment hook — fetches StockTwits, Reddit, and FinTwit
 * data in parallel, computes a unified social score.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getStockTwitsSentiment, getTrendingSymbols } from "../api/stocktwitsClient";
import { searchRedditForTicker } from "../api/redditClient";
import { exaSearch } from "../api/exaClient";
import {
  computeSocialScore,
  type SocialSentimentData,
  type SocialScore,
  type FinTwitPost,
} from "../lib/socialScoring";
import type { TrendingSymbol } from "../api/stocktwitsClient";

interface SocialSentimentResult {
  data: {
    sentiment: SocialSentimentData;
    score: SocialScore;
    trending: TrendingSymbol[];
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const cache = new Map<string, { data: SocialSentimentResult["data"]; expires: number }>();

const BULLISH_KEYWORDS = ["buy", "bull", "calls", "moon", "long", "breakout", "rally"];
const BEARISH_KEYWORDS = ["sell", "bear", "puts", "short", "crash", "dump", "drop"];

export function useSocialSentiment(symbol: string | null): SocialSentimentResult {
  const [data, setData] = useState<SocialSentimentResult["data"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (force = false) => {
      if (!symbol) {
        setData(null);
        setError(null);
        return;
      }

      const key = symbol.toUpperCase();

      // Check cache
      if (!force) {
        const cached = cache.get(key);
        if (cached && Date.now() < cached.expires) {
          setData(cached.data);
          return;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        // Fetch all sources in parallel
        const [stocktwitsResult, redditResult, exaResult, trendingResult] =
          await Promise.allSettled([
            getStockTwitsSentiment(key),
            searchRedditForTicker(key),
            exaSearch(`$${key} stock twitter fintwit`, 8).catch(() => ({ results: [] })),
            getTrendingSymbols(),
          ]);

        const stocktwits =
          stocktwitsResult.status === "fulfilled" ? stocktwitsResult.value : null;
        const redditPosts =
          redditResult.status === "fulfilled" ? redditResult.value : [];
        const exaResults =
          exaResult.status === "fulfilled" ? exaResult.value : { results: [] };
        const trending =
          trendingResult.status === "fulfilled" ? trendingResult.value : [];

        // Build sentiment data
        const sentiment: SocialSentimentData = {};

        if (stocktwits) {
          sentiment.stocktwits = stocktwits;
        }

        if (redditPosts.length > 0) {
          let bullishCount = 0;
          let bearishCount = 0;
          for (const post of redditPosts) {
            const text = `${post.title} ${post.selftext}`.toLowerCase();
            const isBullish = BULLISH_KEYWORDS.some((kw) => text.includes(kw));
            const isBearish = BEARISH_KEYWORDS.some((kw) => text.includes(kw));
            if (isBullish && !isBearish) bullishCount++;
            else if (isBearish && !isBullish) bearishCount++;
            // neutral posts (neither or both) are not counted
          }
          sentiment.reddit = {
            mentions: redditPosts.length,
            bullishCount,
            bearishCount,
            posts: redditPosts,
          };
        }

        if (exaResults.results.length > 0) {
          const finTwitPosts: FinTwitPost[] = exaResults.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.text,
            publishedDate: r.publishedDate,
          }));
          // relevanceScore = average exa score (0-1 range)
          const avgScore =
            exaResults.results.reduce((sum, r) => sum + (r.score ?? 0), 0) /
            exaResults.results.length;
          sentiment.fintwit = {
            posts: finTwitPosts,
            relevanceScore: Math.min(1, avgScore),
          };
        }

        // Bail if this request was superseded by a newer one
        if (controller.signal.aborted) return;

        const score = computeSocialScore(sentiment);

        const result = { sentiment, score, trending };
        cache.set(key, { data: result, expires: Date.now() + CACHE_TTL });
        setData(result);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to fetch social data");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [symbol],
  );

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refresh };
}
