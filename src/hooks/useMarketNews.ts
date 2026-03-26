/**
 * Hook for fetching market news from Finnhub.
 *
 * Supports general market news and per-stock company news.
 * Free tier: 60 calls/minute.
 */

import { useState, useCallback } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { getCredential } from "../lib/credentials";
import { getEdgeHeaders } from "../api/edgeHeaders";

/* ─── Types ─────────────────────────────────────────── */

export interface NewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface SentimentData {
  buzz: {
    articlesInLastWeek: number;
    weeklyAverage: number;
    buzz: number; // ratio
  };
  companyNewsScore: number;
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
  sentiment: {
    bearishPercent: number;
    bullishPercent: number;
  };
  symbol: string;
}

/* ─── Fetch Helpers ─────────────────────────────────── */

async function finnhubFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = getCredential("finnhub");

  const useEdge = !apiKey && isSupabaseConfigured();
  if (!apiKey && !useEdge) throw new Error("No Finnhub API key");

  let url: string;
  if (useEdge) {
    const qs = new URLSearchParams({ endpoint, ...params });
    url = `${supabaseUrl}/functions/v1/finnhub?${qs}`;
  } else {
    const qs = new URLSearchParams({ ...params, token: apiKey! });
    url = `https://finnhub.io/api/v1/${endpoint}?${qs}`;
  }

  const headers: Record<string, string> = useEdge ? await getEdgeHeaders() : {};

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Finnhub ${endpoint} failed: ${response.status}`);
  return response.json();
}

/* ─── Hook ──────────────────────────────────────────── */

export function useMarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch general market news */
  const fetchMarketNews = useCallback(async (category = "general") => {
    setLoading(true);
    setError(null);
    try {
      const data = await finnhubFetch<NewsItem[]>("news", { category });
      setNews(data.slice(0, 30));
      setSentiment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch company-specific news */
  const fetchCompanyNews = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const [newsData, sentimentData] = await Promise.all([
        finnhubFetch<NewsItem[]>("company-news", { symbol: symbol.toUpperCase(), from, to: today }),
        finnhubFetch<SentimentData>("news-sentiment", { symbol: symbol.toUpperCase() }).catch(() => null),
      ]);

      setNews(newsData.slice(0, 30));
      setSentiment(sentimentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  }, []);

  return { news, sentiment, loading, error, fetchMarketNews, fetchCompanyNews };
}
