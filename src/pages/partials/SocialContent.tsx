/**
 * Social sentiment content — SOCIAL tab on the Research page.
 * Fetches StockTwits, Reddit, and FinTwit data for a given ticker.
 */

import { useState, useEffect } from "react";
import { getProfile } from "../../api/fmpClient";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getEdgeHeaders } from "../../api/edgeHeaders";
import { dedupFetch } from "../../api/fetchDedup";
import { UpgradePrompt } from "../../components/shared/UpgradePrompt";
import { SentimentGauge } from "../../components/social/SentimentGauge";
import { SocialFeed } from "../../components/social/SocialFeed";
import { TrendingTickers } from "../../components/social/TrendingTickers";
import { TradeVerdictBadgeWithScore } from "../../components/trading/TradeVerdictBadge";
import { useSocialSentiment } from "../../hooks/useSocialSentiment";
import { useTrendingSymbols } from "../../hooks/useTrendingSymbols";

interface TickerQuote {
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function SocialContent() {
  const effectiveTier = useAuthStore((s) => s.effectiveTier);
  const tier = effectiveTier();
  const [ticker, setTicker] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const { data, loading, error, refresh } = useSocialSentiment(activeTicker);
  const { data: trendingTickers } = useTrendingSymbols();
  const [quote, setQuote] = useState<TickerQuote | null>(null);

  // Fetch company profile + quote when ticker changes
  useEffect(() => {
    if (!activeTicker || !isSupabaseConfigured()) return;
    let cancelled = false;
    const ticker = activeTicker;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    async function fetchQuote() {
      const headers = await getEdgeHeaders();
      try {
        // Fetch Finnhub quote + FMP profile in parallel
        const [qRes, pRes] = await Promise.allSettled([
          dedupFetch(`${supabaseUrl}/functions/v1/finnhub?endpoint=quote&symbol=${ticker}`, { headers }, 60_000),
          getProfile(ticker),
        ]);

        const q = qRes.status === "fulfilled" && qRes.value.ok ? await qRes.value.json() : null;
        const profile = pRes.status === "fulfilled" ? pRes.value[0] ?? null : null;

        if (!cancelled && q?.c) {
          setQuote({
            name: profile?.companyName ?? ticker,
            price: q.c,
            change: q.d ?? 0,
            changePercent: q.dp ?? 0,
          });
        }
      } catch { /* non-critical */ }
    }

    fetchQuote();
    return () => { cancelled = true; };
  }, [activeTicker]);

  if (!hasFeature(tier, "social_sentiment")) {
    return <UpgradePrompt feature="social_sentiment" inline />;
  }

  const handleSearch = () => {
    const t = ticker.trim().toUpperCase();
    if (t) {
      setQuote(null);
      setActiveTicker(t);
    }
  };

  const handleTrendingSelect = (symbol: string) => {
    setTicker(symbol);
    setQuote(null);
    setActiveTicker(symbol);
  };

  return (
    <div data-testid="social-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              background: "var(--bg-panel-raised)",
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

      {/* Ticker Info Bar */}
      {activeTicker && quote && (
        <div data-testid="social-ticker-bar" style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {activeTicker}
          </span>
          <TradeVerdictBadgeWithScore
            symbol={activeTicker}
            inputs={data ? { socialScore: data.score.overall } : undefined}
          />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
            {quote.name}
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            ${quote.price.toFixed(2)}
          </span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: quote.changePercent >= 0 ? "var(--positive)" : "var(--negative)",
          }}>
            {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%)
            {quote.changePercent >= 0 ? " ▲" : " ▼"}
          </span>
        </div>
      )}

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
          <div data-testid="social-results" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

        </>
      )}

      {/* Trending */}
      {trendingTickers.length > 0 && (
        <div
          data-testid="social-trending"
          style={{
            padding: 16,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
          }}
        >
          <TrendingTickers tickers={trendingTickers} onSelect={handleTrendingSelect} />
        </div>
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
