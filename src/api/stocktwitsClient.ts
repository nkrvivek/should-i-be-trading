/**
 * StockTwits API client — fetches sentiment and trending data.
 * Uses dedupFetch for caching. Gracefully returns null on CORS/network errors.
 */

import { dedupFetch } from "./fetchDedup";
import type { StockTwitsMessage } from "../lib/socialScoring";

export interface StockTwitsSentimentResult {
  bullishPercent: number;
  bearishPercent: number;
  volume: number;
  messages: StockTwitsMessage[];
}

export interface TrendingSymbol {
  id: number;
  symbol: string;
  title: string;
  watchlistCount: number;
}

const BASE_URL = "https://api.stocktwits.com/api/2";

export async function getStockTwitsSentiment(
  symbol: string,
): Promise<StockTwitsSentimentResult | null> {
  try {
    const res = await dedupFetch(
      `${BASE_URL}/streams/symbol/${encodeURIComponent(symbol.toUpperCase())}.json`,
      undefined,
      60_000,
    );
    if (!res.ok) return null;

    const json = await res.json();
    const messages: StockTwitsMessage[] = (json.messages ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => ({
        id: m.id,
        body: m.body,
        sentiment: m.entities?.sentiment?.basic?.toLowerCase() ?? null,
        username: m.user?.username ?? "unknown",
        createdAt: m.created_at,
      }),
    );

    const withSentiment = messages.filter((m) => m.sentiment !== null);
    const bullishCount = withSentiment.filter((m) => m.sentiment === "bullish").length;
    const total = withSentiment.length;

    return {
      bullishPercent: total > 0 ? Math.round((bullishCount / total) * 100) : 50,
      bearishPercent: total > 0 ? Math.round(((total - bullishCount) / total) * 100) : 50,
      volume: messages.length,
      messages,
    };
  } catch {
    // CORS or network failure — graceful degradation
    return null;
  }
}

export async function getTrendingSymbols(): Promise<TrendingSymbol[]> {
  try {
    const res = await dedupFetch(`${BASE_URL}/trending/symbols.json`, undefined, 60_000);
    if (!res.ok) return [];

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.symbols ?? []).map((s: any) => ({
      id: s.id,
      symbol: s.symbol,
      title: s.title,
      watchlistCount: s.watchlist_count ?? 0,
    }));
  } catch {
    return [];
  }
}
