/**
 * Combined social feed — StockTwits messages + Reddit posts in a scrollable list.
 * Sorted by recency with source badges and sentiment indicators.
 */

import type { StockTwitsMessage, RedditPost } from "../../lib/socialScoring";

interface SocialFeedProps {
  stocktwitsMessages: StockTwitsMessage[];
  redditPosts: RedditPost[];
}

interface FeedItem {
  type: "stocktwits" | "reddit";
  timestamp: number;
  data: StockTwitsMessage | RedditPost;
}

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SocialFeed({ stocktwitsMessages, redditPosts }: SocialFeedProps) {
  const items: FeedItem[] = [
    ...stocktwitsMessages.map((m) => ({
      type: "stocktwits" as const,
      timestamp: new Date(m.createdAt).getTime(),
      data: m,
    })),
    ...redditPosts.map((p) => ({
      type: "reddit" as const,
      timestamp: p.createdUtc * 1000,
      data: p,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (items.length === 0) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-muted)",
          padding: 16,
          textAlign: "center",
        }}
      >
        No social posts found for this ticker.
      </div>
    );
  }

  return (
    <div
      style={{
        maxHeight: 400,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {items.map((item, i) => (
        <div
          key={`${item.type}-${i}`}
          style={{
            padding: "8px 12px",
            background: "var(--bg-panel)",
            borderBottom: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Header row: source badge + author + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background:
                  item.type === "stocktwits"
                    ? "rgba(0, 149, 255, 0.15)"
                    : "rgba(255, 69, 0, 0.15)",
                color:
                  item.type === "stocktwits"
                    ? "var(--blue, #0095ff)"
                    : "var(--orange, #ff4500)",
                textTransform: "uppercase",
              }}
            >
              {item.type === "stocktwits" ? "ST" : "Reddit"}
            </span>

            {item.type === "stocktwits" && (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  @{(item.data as StockTwitsMessage).username}
                </span>
                {(item.data as StockTwitsMessage).sentiment && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background:
                        (item.data as StockTwitsMessage).sentiment === "bullish"
                          ? "rgba(34, 197, 94, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                      color:
                        (item.data as StockTwitsMessage).sentiment === "bullish"
                          ? "var(--green, #22c55e)"
                          : "var(--red, #ef4444)",
                    }}
                  >
                    {(item.data as StockTwitsMessage).sentiment?.toUpperCase()}
                  </span>
                )}
              </>
            )}

            {item.type === "reddit" && (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  u/{(item.data as RedditPost).author}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {(item.data as RedditPost).score} pts
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {(item.data as RedditPost).numComments} comments
                </span>
              </>
            )}

            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              {formatTimeAgo(item.timestamp)}
            </span>
          </div>

          {/* Body */}
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.type === "stocktwits"
              ? (item.data as StockTwitsMessage).body
              : (item.data as RedditPost).title}
          </div>
        </div>
      ))}
    </div>
  );
}
