/**
 * Reddit API client — proxied through Supabase edge function to avoid CORS.
 * Uses dedupFetch for caching. Returns empty arrays on failure.
 */

import { dedupFetch } from "./fetchDedup";
import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";
import type { RedditPost } from "../lib/socialScoring";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
    if (!isSupabaseConfigured()) return [];
    const headers = await getEdgeHeaders();
    const res = await dedupFetch(
      `${SUPABASE_URL}/functions/v1/proxy-social?source=reddit&action=search&symbol=${encodeURIComponent(ticker.toUpperCase())}`,
      { headers },
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
    if (!isSupabaseConfigured()) return [];
    const headers = await getEdgeHeaders();
    const res = await dedupFetch(
      `${SUPABASE_URL}/functions/v1/proxy-social?source=reddit&action=hot&subreddit=${encodeURIComponent(subreddit)}&limit=${limit}`,
      { headers },
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
