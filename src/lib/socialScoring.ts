/**
 * Social sentiment scoring — pure functions for computing a social score
 * from StockTwits, Reddit, and FinTwit (Twitter/X via Exa) data.
 */

export interface StockTwitsMessage {
  id: number;
  body: string;
  sentiment: "bullish" | "bearish" | null;
  username: string;
  createdAt: string;
}

export interface RedditPost {
  title: string;
  selftext: string;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  permalink: string;
  subreddit: string;
}

export interface FinTwitPost {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface SocialSentimentData {
  stocktwits?: {
    bullishPercent: number;
    bearishPercent: number;
    volume: number;
    messages: StockTwitsMessage[];
  };
  reddit?: {
    mentions: number;
    bullishCount: number;
    bearishCount: number;
    posts: RedditPost[];
  };
  fintwit?: {
    posts: FinTwitPost[];
    relevanceScore: number;
  };
}

export interface SocialScore {
  overall: number; // 0-100
  label: "VERY_BEARISH" | "BEARISH" | "NEUTRAL" | "BULLISH" | "VERY_BULLISH";
  confidence: number; // 0-1 based on data availability
  breakdown: { source: string; score: number; weight: number }[];
}

const BULLISH_KEYWORDS = [
  "buy", "bull", "calls", "moon", "long", "pump", "breakout",
  "undervalued", "upside", "rally", "squeeze", "rip", "green",
];

const BEARISH_KEYWORDS = [
  "sell", "bear", "puts", "short", "dump", "overvalued",
  "downside", "crash", "drop", "red", "tank", "fade",
];

function labelFromScore(score: number): SocialScore["label"] {
  if (score <= 20) return "VERY_BEARISH";
  if (score <= 40) return "BEARISH";
  if (score <= 60) return "NEUTRAL";
  if (score <= 80) return "BULLISH";
  return "VERY_BULLISH";
}

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function computeStockTwitsScore(data: SocialSentimentData["stocktwits"]): number | null {
  if (!data) return null;
  // bullishPercent directly maps to 0-100
  return Math.round(data.bullishPercent);
}

function computeRedditScore(data: SocialSentimentData["reddit"]): number | null {
  if (!data || data.posts.length === 0) return null;

  let bullishCount = 0;
  let bearishCount = 0;

  for (const post of data.posts) {
    const text = `${post.title} ${post.selftext}`;
    const isBullish = post.score > 50 && containsKeyword(text, BULLISH_KEYWORDS);
    const isBearish = post.score > 50 && containsKeyword(text, BEARISH_KEYWORDS);

    if (isBullish) bullishCount++;
    if (isBearish) bearishCount++;
  }

  const total = bullishCount + bearishCount;
  if (total === 0) return 50; // neutral if no clear signals
  return Math.round((bullishCount / total) * 100);
}

function computeFinTwitScore(data: SocialSentimentData["fintwit"]): number | null {
  if (!data || data.posts.length === 0) return null;

  let positiveCount = 0;
  for (const post of data.posts) {
    const text = `${post.title} ${post.snippet}`;
    if (containsKeyword(text, BULLISH_KEYWORDS)) positiveCount++;
  }

  // relevanceScore (0-1) * ratio of positive posts, scaled to 0-100
  const ratio = positiveCount / data.posts.length;
  return Math.round(data.relevanceScore * ratio * 100);
}

export function computeSocialScore(data: SocialSentimentData): SocialScore {
  const sources: { source: string; score: number | null; baseWeight: number }[] = [
    { source: "StockTwits", score: computeStockTwitsScore(data.stocktwits), baseWeight: 0.4 },
    { source: "Reddit", score: computeRedditScore(data.reddit), baseWeight: 0.3 },
    { source: "FinTwit", score: computeFinTwitScore(data.fintwit), baseWeight: 0.3 },
  ];

  const availableSources = sources.filter((s) => s.score !== null);
  const sourceCount = availableSources.length;
  const confidence = sourceCount / 3;

  if (sourceCount === 0) {
    return {
      overall: 50,
      label: "NEUTRAL",
      confidence: 0,
      breakdown: [],
    };
  }

  // Redistribute weights among available sources
  const totalBaseWeight = availableSources.reduce((sum, s) => sum + s.baseWeight, 0);
  const breakdown: SocialScore["breakdown"] = [];
  let overall = 0;

  for (const s of availableSources) {
    const weight = s.baseWeight / totalBaseWeight;
    const score = s.score!;
    overall += score * weight;
    breakdown.push({ source: s.source, score, weight: Math.round(weight * 100) / 100 });
  }

  overall = Math.round(overall);

  return {
    overall,
    label: labelFromScore(overall),
    confidence: Math.round(confidence * 100) / 100,
    breakdown,
  };
}
