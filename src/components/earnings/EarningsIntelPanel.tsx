import { useState } from "react";
import { useEarningsIntel, type EarningsHistoryEntry } from "../../hooks/useEarningsIntel";
import { EarningsSummaryPanel } from "../ai/EarningsSummaryPanel";

type Props = {
  symbol: string;
  quarter: number;
  year: number;
  earningsDate?: string;
  currentEpsEstimate?: number | null;
  currentRevEstimate?: number | null;
  onClose: () => void;
};

function formatPct(n: number | null, showSign = true): string {
  if (n == null) return "---";
  const sign = showSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function formatRevenue(n: number | null | undefined): string {
  if (n == null) return "---";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function formatEps(n: number | null | undefined): string {
  if (n == null) return "---";
  return `$${n.toFixed(2)}`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "var(--positive)" : score >= 40 ? "var(--warning)" : "var(--negative)";
  return (
    <div style={{
      width: "100%",
      height: 8,
      background: "var(--bg-base)",
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 8,
    }}>
      <div style={{
        width: `${score}%`,
        height: "100%",
        background: color,
        borderRadius: 4,
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function BiasTag({ bias }: { bias: "bullish" | "bearish" | "neutral" }) {
  const config = {
    bullish: { label: "BULLISH LEAN", bg: "rgba(16, 185, 129, 0.15)", color: "var(--positive)", border: "var(--positive)" },
    bearish: { label: "BEARISH LEAN", bg: "rgba(239, 68, 68, 0.15)", color: "var(--negative)", border: "var(--negative)" },
    neutral: { label: "NEUTRAL", bg: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "var(--warning)" },
  }[bias];

  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.border}`,
    }}>
      {config.label}
    </span>
  );
}

function HistoryRow({ entry }: { entry: EarningsHistoryEntry }) {
  const isBeat = (entry.surprisePercent ?? 0) > 0;
  const isMiss = (entry.surprisePercent ?? 0) < 0;
  const resultLabel = isBeat ? "BEAT" : isMiss ? "MISS" : "IN-LINE";
  const resultColor = isBeat ? "var(--positive)" : isMiss ? "var(--negative)" : "var(--text-muted)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 0",
      borderBottom: "1px solid var(--border-dim)",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
    }}>
      <span style={{ width: 70, color: "var(--text-muted)", flexShrink: 0 }}>
        Q{entry.quarter} {entry.year}
      </span>
      <span style={{ width: 90, color: resultColor, fontWeight: 600, flexShrink: 0 }}>
        {resultLabel} {formatPct(entry.surprisePercent)}
      </span>
      <span style={{
        width: 80,
        color: (entry.priceChange1d ?? 0) >= 0 ? "var(--positive)" : "var(--negative)",
        flexShrink: 0,
      }}>
        {(entry.priceChange1d ?? 0) >= 0 ? "\u25B2" : "\u25BC"} {formatPct(entry.priceChange1d)} (1d)
      </span>
      <span style={{
        width: 80,
        color: (entry.priceChange5d ?? 0) >= 0 ? "var(--positive)" : "var(--negative)",
        flexShrink: 0,
      }}>
        {(entry.priceChange5d ?? 0) >= 0 ? "\u25B2" : "\u25BC"} {formatPct(entry.priceChange5d)} (5d)
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        background: "var(--bg-panel-raised)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        padding: 12,
      }}>
        {children}
      </div>
    </div>
  );
}

export function EarningsIntelPanel({
  symbol,
  quarter,
  year,
  earningsDate,
  currentEpsEstimate,
  currentRevEstimate,
  onClose,
}: Props) {
  const { data, loading, error } = useEarningsIntel(symbol);
  const [showAiSummary, setShowAiSummary] = useState(false);

  if (showAiSummary) {
    return (
      <EarningsSummaryPanel
        symbol={symbol}
        quarter={quarter}
        year={year}
        earningsDate={earningsDate}
        onClose={() => setShowAiSummary(false)}
      />
    );
  }

  const scoreColor = data
    ? data.earningsScore >= 70
      ? "var(--positive)"
      : data.earningsScore >= 40
        ? "var(--warning)"
        : "var(--negative)"
    : "var(--text-muted)";

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      width: 520,
      height: "100vh",
      background: "var(--bg-panel)",
      borderLeft: "1px solid var(--border-dim)",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-dim)",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {symbol} — Q{quarter} {year} EARNINGS INTEL
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            SIBT Deterministic Analysis
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            padding: "4px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          CLOSE
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 40 }}>
            <div style={{
              width: 24, height: 24, border: "2px solid var(--border-dim)",
              borderTopColor: "var(--accent-bg)", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--signal-core)" }}>
              Fetching earnings intelligence...
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 16 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)", marginBottom: 12 }}>
              {error}
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* SIBT Earnings Score */}
            <Section title="SIBT Earnings Score">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 32,
                    fontWeight: 700,
                    color: scoreColor,
                  }}>
                    {data.earningsScore}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--text-muted)",
                  }}>
                    /100
                  </span>
                </div>
                <BiasTag bias={data.scoreBias} />
              </div>
              <ScoreBar score={data.earningsScore} />
            </Section>

            {/* Earnings History */}
            <Section title={`Earnings History (last ${data.history.length} quarters)`}>
              {data.history.map((entry, i) => (
                <HistoryRow key={`${entry.quarter}-${entry.year}-${i}`} entry={entry} />
              ))}
              {data.beatStreak > 0 && (
                <div style={{
                  marginTop: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--positive)",
                  fontWeight: 600,
                }}>
                  Beat streak: {data.beatStreak} quarter{data.beatStreak !== 1 ? "s" : ""} {"\u2713"}
                </div>
              )}
            </Section>

            {/* Post-Earnings Price Action */}
            <Section title="Post-Earnings Price Action">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Avg 1-day move:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{"\u00B1"}{data.avg1dMove.toFixed(1)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Avg 5-day move:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{"\u00B1"}{data.avg5dMove.toFixed(1)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>When BEAT: avg 1d</span>
                  <span style={{ color: "var(--positive)", fontWeight: 600 }}>{formatPct(data.avgPositiveSurpriseMove)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>When MISS: avg 1d</span>
                  <span style={{ color: "var(--negative)", fontWeight: 600 }}>{formatPct(data.avgNegativeSurpriseMove)}</span>
                </div>
              </div>
            </Section>

            {/* Insider Activity */}
            {(data.insiderBuys != null || data.insiderSells != null) && (
              <Section title="Insider Activity (90 days)">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: data.insiderSignal === "bullish"
                      ? "var(--positive)"
                      : data.insiderSignal === "bearish"
                        ? "var(--negative)"
                        : "var(--warning)",
                  }} />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {data.insiderBuys ?? 0} buy{(data.insiderBuys ?? 0) !== 1 ? "s" : ""}, {data.insiderSells ?? 0} sell{(data.insiderSells ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{"\u2192"}</span>
                  <span style={{
                    fontWeight: 600,
                    color: data.insiderSignal === "bullish"
                      ? "var(--positive)"
                      : data.insiderSignal === "bearish"
                        ? "var(--negative)"
                        : "var(--warning)",
                  }}>
                    {data.insiderSignal?.toUpperCase()} SIGNAL
                  </span>
                </div>
              </Section>
            )}

            {/* Estimates */}
            {(currentEpsEstimate != null || currentRevEstimate != null) && (
              <Section title="Estimates">
                <div style={{ display: "flex", gap: 24, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>EPS: </span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatEps(currentEpsEstimate)}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Revenue: </span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatRevenue(currentRevEstimate)}</span>
                  </div>
                </div>
              </Section>
            )}

            {/* AI Summary link — only for past earnings */}
            {earningsDate && new Date(earningsDate) <= new Date() && (
              <div style={{ textAlign: "center", marginTop: 8, marginBottom: 8 }}>
                <button
                  onClick={() => setShowAiSummary(true)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 4,
                    padding: "4px 12px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--info)",
                    cursor: "pointer",
                    opacity: 0.8,
                  }}
                >
                  AI SUMMARY
                </button>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{
              padding: "8px 0",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-muted)",
              fontStyle: "italic",
              borderTop: "1px solid var(--border-dim)",
              marginTop: 8,
            }}>
              SIBT Earnings Intelligence is data-driven analysis based on historical patterns. Past performance does not guarantee future results. Not investment advice.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
