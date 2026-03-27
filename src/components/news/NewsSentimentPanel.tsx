/**
 * News Sentiment Panel — market news feed with optional per-stock sentiment.
 *
 * Shows general market news or company-specific news from Finnhub.
 * Includes sentiment scores when available (bullish/bearish %, buzz ratio).
 */

import { useEffect, useMemo, useState } from "react";
import { Panel } from "../layout/Panel";
import { useMarketNews, type NewsItem, type SentimentData } from "../../hooks/useMarketNews";

export function NewsSentimentPanel() {
  const { news, sentiment, loading, error, fetchMarketNews, fetchCompanyNews } = useMarketNews();
  const [mode, setMode] = useState<"market" | "company">("market");
  const [ticker, setTicker] = useState("");
  const [category, setCategory] = useState("general");

  // Fetch market news on mount
  useEffect(() => {
    fetchMarketNews(category);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    if (mode === "company" && ticker.trim()) {
      fetchCompanyNews(ticker.trim());
    } else {
      fetchMarketNews(category);
    }
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
        }}
      >
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Market News & Sentiment
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Real-time news feed with sentiment analysis. Track market-moving headlines and per-stock media buzz.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
          <ToggleBtn active={mode === "market"} onClick={() => { setMode("market"); fetchMarketNews(category); }} label="MARKET" />
          <ToggleBtn active={mode === "company"} onClick={() => setMode("company")} label="COMPANY" />
        </div>

        {mode === "market" && (
          <div style={{ display: "flex", gap: 6 }}>
            {["general", "forex", "crypto", "merger"].map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); fetchMarketNews(cat); }}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: category === cat ? "#000" : "var(--text-muted)",
                  background: category === cat ? "var(--signal-core)" : "transparent",
                  border: `1px solid ${category === cat ? "var(--signal-core)" : "var(--border-dim)"}`,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {mode === "company" && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter ticker..."
              style={{
                padding: "6px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "var(--bg-base)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                outline: "none",
                width: 120,
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !ticker.trim()}
              style={{
                padding: "6px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 600,
                color: "#000",
                background: "var(--signal-core)",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "default" : "pointer",
                opacity: loading || !ticker.trim() ? 0.5 : 1,
              }}
            >
              SEARCH
            </button>
          </div>
        )}

        {/* Quick tickers */}
        {mode === "company" && (
          <div style={{ display: "flex", gap: 4 }}>
            {["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"].map((t) => (
              <button
                key={t}
                onClick={() => { setTicker(t); fetchCompanyNews(t); }}
                style={{
                  padding: "3px 8px", borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                  color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border-dim)", cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
          {error}
        </div>
      )}

      {/* Sentiment Card (company mode only) */}
      {sentiment && <SentimentCard data={sentiment} />}

      {/* News Feed */}
      <Panel title={`News Feed (${news.length} articles)`} loading={loading}>
        {news.length === 0 && !loading ? (
          <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            {mode === "company" ? "Enter a ticker to see company news." : "No news available."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {news.map((item) => (
              <NewsRow key={item.id || item.datetime + item.headline} item={item} />
            ))}
          </div>
        )}
      </Panel>

      <div style={{ padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border-dim)" }}>
        News data from Finnhub. Sentiment scores reflect media coverage analysis, not market direction predictions. Not investment advice.
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────── */

function SentimentCard({ data }: { data: SentimentData }) {
  const bullish = data.sentiment?.bullishPercent ?? 0;
  const bearish = data.sentiment?.bearishPercent ?? 0;
  const buzzRatio = data.buzz?.buzz ?? 0;
  const newsScore = data.companyNewsScore ?? 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <SentimentCell
        label="Bullish"
        value={`${(bullish * 100).toFixed(0)}%`}
        color={bullish > 0.5 ? "var(--positive)" : "var(--text-secondary)"}
      />
      <SentimentCell
        label="Bearish"
        value={`${(bearish * 100).toFixed(0)}%`}
        color={bearish > 0.5 ? "var(--negative)" : "var(--text-secondary)"}
      />
      <SentimentCell
        label="Buzz"
        value={`${buzzRatio.toFixed(2)}x`}
        color={buzzRatio > 1.5 ? "var(--warning)" : "var(--text-secondary)"}
        subtitle={`${data.buzz?.articlesInLastWeek ?? 0} articles/week`}
      />
      <SentimentCell
        label="News Score"
        value={newsScore.toFixed(2)}
        color={newsScore > 0.6 ? "var(--positive)" : newsScore < 0.4 ? "var(--negative)" : "var(--text-secondary)"}
        subtitle={`Sector avg: ${(data.sectorAverageNewsScore ?? 0).toFixed(2)}`}
      />
    </div>
  );
}

function SentimentCell({ label, value, color, subtitle }: { label: string; value: string; color: string; subtitle?: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border-dim)", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const time = new Date(item.datetime * 1000);
  const timeStr = time.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const isRecent = useMemo(() => Date.now() - item.datetime * 1000 < 3600000, [item.datetime]); // eslint-disable-line react-hooks/purity

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 12px",
        borderBottom: "1px solid var(--border-dim)",
        textDecoration: "none",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      {/* Thumbnail */}
      {item.image && (
        <div
          style={{
            width: 64,
            height: 48,
            borderRadius: 4,
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg-base)",
          }}
        >
          <img
            src={item.image}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {item.headline}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            {item.source}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isRecent ? "var(--signal-core)" : "var(--text-muted)" }}>
            {timeStr}
          </span>
          {item.related && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid var(--border-dim)", color: "var(--text-muted)" }}>
              {item.related}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: active ? "#000" : "var(--text-muted)",
        background: active ? "var(--signal-core)" : "var(--bg-panel-raised)",
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
