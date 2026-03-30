/**
 * Social sentiment content — SOCIAL tab on the Research page.
 * Fetches StockTwits, Reddit, and FinTwit data for a given ticker.
 */

import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";
import { UpgradePrompt } from "../../components/shared/UpgradePrompt";
import { SentimentGauge } from "../../components/social/SentimentGauge";
import { SocialFeed } from "../../components/social/SocialFeed";
import { TrendingTickers } from "../../components/social/TrendingTickers";
import { useSocialSentiment } from "../../hooks/useSocialSentiment";

export default function SocialContent() {
  const effectiveTier = useAuthStore((s) => s.effectiveTier);
  const tier = effectiveTier();
  const [ticker, setTicker] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const { data, loading, error, refresh } = useSocialSentiment(activeTicker);

  if (!hasFeature(tier, "social_sentiment")) {
    return <UpgradePrompt feature="social_sentiment" />;
  }

  const handleSearch = () => {
    const t = ticker.trim().toUpperCase();
    if (t) setActiveTicker(t);
  };

  const handleTrendingSelect = (symbol: string) => {
    setTicker(symbol);
    setActiveTicker(symbol);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Social Sentiment
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-muted)",
              margin: "4px 0 0",
            }}
          >
            Real-time sentiment from StockTwits, Reddit, and FinTwit.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter ticker..."
            style={{
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              background: "var(--bg-surface, #1a1a2e)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              color: "var(--text-primary)",
              width: 140,
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: "6px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--accent-bg)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            SCAN
          </button>
          {activeTicker && (
            <button
              onClick={refresh}
              style={{
                padding: "6px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                background: "none",
                color: "var(--text-muted)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              REFRESH
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            padding: 24,
          }}
        >
          Scanning social sentiment for ${activeTicker}...
        </div>
      )}

      {error && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--red, #ef4444)",
            textAlign: "center",
            padding: 16,
            background: "rgba(239, 68, 68, 0.08)",
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Top row: gauge + score card */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Sentiment Gauge */}
            <div
              style={{
                padding: 16,
                background: "var(--bg-panel)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  margin: "0 0 12px",
                  textTransform: "uppercase",
                }}
              >
                Sentiment Gauge
              </h3>
              <SentimentGauge
                bullishPercent={data.sentiment.stocktwits?.bullishPercent ?? null}
                bearishPercent={data.sentiment.stocktwits?.bearishPercent ?? null}
                label="StockTwits"
              />
              {data.sentiment.reddit && (
                <div style={{ marginTop: 12 }}>
                  <SentimentGauge
                    bullishPercent={Math.round(
                      (data.sentiment.reddit.bullishCount /
                        Math.max(
                          1,
                          data.sentiment.reddit.bullishCount +
                            data.sentiment.reddit.bearishCount,
                        )) *
                        100,
                    )}
                    bearishPercent={Math.round(
                      (data.sentiment.reddit.bearishCount /
                        Math.max(
                          1,
                          data.sentiment.reddit.bullishCount +
                            data.sentiment.reddit.bearishCount,
                        )) *
                        100,
                    )}
                    label="Reddit"
                  />
                </div>
              )}
            </div>

            {/* Score Card */}
            <div
              style={{
                padding: 16,
                background: "var(--bg-panel)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  margin: "0 0 12px",
                  textTransform: "uppercase",
                }}
              >
                Social Score
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 36,
                    fontWeight: 700,
                    color: scoreColor(data.score.overall),
                  }}
                >
                  {data.score.overall}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: scoreColor(data.score.overall),
                  }}
                >
                  {data.score.label.replace("_", " ")}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Confidence: {Math.round(data.score.confidence * 100)}%
              </div>
              {data.score.breakdown.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {data.score.breakdown.map((b) => (
                    <div
                      key={b.source}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>{b.source}</span>
                      <span>
                        {b.score}/100 (w: {Math.round(b.weight * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feed */}
          <div
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-dim)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              Social Feed
            </div>
            <SocialFeed
              stocktwitsMessages={data.sentiment.stocktwits?.messages ?? []}
              redditPosts={data.sentiment.reddit?.posts ?? []}
            />
          </div>

          {/* Trending */}
          {data.trending.length > 0 && (
            <div
              style={{
                padding: 16,
                background: "var(--bg-panel)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
              }}
            >
              <TrendingTickers tickers={data.trending} onSelect={handleTrendingSelect} />
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!activeTicker && !loading && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-muted)",
            textAlign: "center",
            padding: 48,
          }}
        >
          Enter a ticker symbol above to scan social sentiment across StockTwits, Reddit, and FinTwit.
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score <= 20) return "var(--red, #ef4444)";
  if (score <= 40) return "var(--orange, #f97316)";
  if (score <= 60) return "var(--text-secondary)";
  if (score <= 80) return "var(--green, #22c55e)";
  return "var(--green, #22c55e)";
}
