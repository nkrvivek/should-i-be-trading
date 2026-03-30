/**
 * Reddit public JSON API client — no authentication needed.
 * Uses dedupFetch for caching. Returns empty arrays on failure.
 */

import { dedupFetch } from "./fetchDedup";
import type { RedditPost } from "../lib/socialScoring";

const TRADING_SUBREDDITS = "wallstreetbets+stocks+options";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePost(child: any): RedditPost {
  const d = child.data;
  return {
    title: d.title ?? "",
    selftext: d.selftext ?? "",
    author: d.author ?? "[deleted]",
    score: d.score ?? 0,
    numComments: d.num_comments ?? 0,
    createdUtc: d.created_utc ?? 0,
    permalink: d.permalink ?? "",
    subreddit: d.subreddit ?? "",
  };
}

export async function searchRedditForTicker(ticker: string): Promise<RedditPost[]> {
  try {
    const q = encodeURIComponent(ticker.toUpperCase());
    const res = await dedupFetch(
      `https://www.reddit.com/r/${TRADING_SUBREDDITS}/search.json?q=${q}&sort=new&limit=15&restrict_sr=on&raw_json=1`,
      undefined,
      120_000,
    );
    if (!res.ok) return [];

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data?.children ?? []).map((c: any) => parsePost(c));
  } catch {
    return [];
  }
}

export async function getHotRedditPosts(
  subreddit: string,
  limit = 10,
): Promise<RedditPost[]> {
  try {
    const res = await dedupFetch(
      `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}&raw_json=1`,
      undefined,
      120_000,
    );
    if (!res.ok) return [];

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data?.children ?? []).map((c: any) => parsePost(c));
  } catch {
    return [];
  }
}
