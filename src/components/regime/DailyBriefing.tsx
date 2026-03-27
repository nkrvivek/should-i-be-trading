import { useState, useCallback, useMemo } from "react";
import { chatWithClaude } from "../../api/anthropicClient";
import { AiUsageBadge, useAiUsage } from "../ai/AiUsageBadge";
import { renderMarkdown } from "../../lib/renderMarkdown";
import type { CriData } from "../../api/types";
import type { TrafficLightVerdict } from "../../lib/trafficLight";
import type { MarketScore } from "../../lib/marketScoring";

type Props = {
  cri: CriData | null;
  verdict: TrafficLightVerdict;
  marketScore?: MarketScore | null;
};

/** Render a deterministic briefing directly as JSX — no markdown needed */
function DefaultBriefingContent({ verdict, marketScore }: { verdict: TrafficLightVerdict; marketScore: MarketScore }) {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const signal = verdict.signal;
  const score = marketScore.total;
  const window = marketScore.executionWindow;
  const weak = marketScore.categories.filter(c => c.score < 40);
  const strong = marketScore.categories.filter(c => c.score >= 70);
  const signalColor = signal === "TRADE" ? "var(--positive)" : signal === "NO_TRADE" ? "var(--negative)" : "var(--warning)";

  const sectionTitle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6, marginTop: 16,
  };
  const bodyText: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7,
  };

  let implication: string;
  if (signal === "TRADE") {
    implication = "Conditions are favorable for active trading. The execution window supports position entry with defined risk. Focus on high-conviction setups aligned with the current trend.";
  } else if (signal === "NO_TRADE") {
    implication = "Conditions are unfavorable for new positions. Consider preserving capital, tightening stops on existing positions, and waiting for the regime to improve. Cash is a position.";
  } else {
    implication = "Conditions are mixed. Reduce position sizes, favor defined-risk strategies, and be selective. Consider hedging existing exposure.";
  }

  return (
    <div>
      {/* Header */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        MARKET SNAPSHOT <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>— {date}</span>
      </div>

      {/* What's happening */}
      <div style={sectionTitle}>WHAT'S HAPPENING</div>
      <div style={bodyText}>
        The SIBT Score is <strong style={{ color: signalColor }}>{score}/100</strong> with
        a <strong>{window}%</strong> execution window.
        Signal: <strong style={{ color: signalColor }}>{signal.replace("_", " ")}</strong> at {verdict.confidence}% confidence.
        VIX regime: <strong>{verdict.vixRegime.label}</strong> — {verdict.vixRegime.detail}.
        {strong.length > 0 && <> Strength in {strong.map(c => `${c.name} (${c.score})`).join(", ")}.</>}
        {weak.length > 0 && <> Weakness in {weak.map(c => `${c.name} (${c.score})`).join(", ")}.</>}
      </div>

      {/* What it means */}
      <div style={sectionTitle}>WHAT IT MEANS</div>
      <div style={bodyText}>{implication}</div>

      {/* What to watch */}
      <div style={sectionTitle}>WHAT TO WATCH</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {marketScore.categories.map(cat => cat.detail ? (
          <div key={cat.name} style={bodyText}>
            <strong style={{ color: "var(--text-primary)" }}>{cat.name}:</strong> {cat.detail}
          </div>
        ) : null)}
        {verdict.reasons.length > 0 && (
          <div style={bodyText}>
            <strong style={{ color: "var(--text-primary)" }}>Key drivers:</strong> {verdict.reasons.slice(0, 3).join("; ")}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", marginTop: 12, borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
        This briefing is generated from live market data — not investment advice.
      </div>
    </div>
  );
}

export function DailyBriefing({ cri, verdict, marketScore }: Props) {
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiUsage = useAiUsage();
  const limitReached = !aiUsage.isOwnKey && aiUsage.used >= aiUsage.limit;

  const hasDefaultData = !!marketScore;

  const generateBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const systemPrompt = [
        "You are a market analyst writing a concise daily briefing for a retail trader.",
        "Format your response with exactly these 3 sections using markdown bold headers:",
        "",
        "**WHAT'S HAPPENING**",
        "One paragraph: current regime state in plain language with key numbers.",
        "",
        "**WHAT IT MEANS**",
        "One paragraph: implications for trading today. Be direct.",
        "",
        "**WHAT TO WATCH**",
        "One paragraph: key events, levels, or catalysts to monitor.",
        "",
        "Rules:",
        "- Be factual, specific, and concise. No fluff.",
        "- Use numbers from the data provided.",
        "- Do NOT use ## headings or horizontal rules.",
        "- Do NOT use emojis.",
        "- End with a single italic disclaimer: *This briefing is market context only — not investment advice.*",
        "- This is NOT investment advice — you're providing market context.",
      ].join("\n");

      const regimeLines = cri ? [
        "Current regime data:",
        `- CRI Score: ${(cri.cri?.score ?? 0).toFixed(1)} (${cri.cri?.level ?? "N/A"})`,
        `- VIX: ${cri.vix?.toFixed(1)} | VVIX: ${cri.vvix?.toFixed(1)} | VVIX/VIX: ${cri.vvix_vix_ratio?.toFixed(1)}`,
        `- COR1M: ${cri.cor1m?.toFixed(1)} (5d change: ${cri.cor1m_5d_change?.toFixed(1)})`,
        `- RVOL: ${cri.realized_vol?.toFixed(1)}%`,
        `- SPY: ${cri.spy?.toFixed(2)} | SPX distance from 100d MA: ${cri.spx_distance_pct?.toFixed(1)}%`,
        `- Crash trigger: ${cri.crash_trigger?.triggered ? "ACTIVE" : "inactive"}`,
        `- Market: ${cri.market_open ? "OPEN" : "CLOSED"}`,
      ] : marketScore ? [
        "Market Quality Score data:",
        `- Composite Score: ${marketScore.total}/100`,
        `- Execution Window: ${marketScore.executionWindow}%`,
        ...marketScore.categories.map((c) => `- ${c.name} (${(c.weight * 100).toFixed(0)}%): ${c.score}/100 — ${c.detail}`),
      ] : ["Regime data: unavailable"];

      const userPrompt = [
        `Generate a daily market briefing for ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`,
        "",
        `- Verdict: ${verdict.signal} (confidence: ${verdict.confidence}%)`,
        `- VIX Regime: ${verdict.vixRegime.label}`,
        ...regimeLines,
        "",
        `Verdict reasons: ${verdict.reasons.join("; ")}`,
      ].join("\n");

      const response = await chatWithClaude(
        [{ role: "user", content: userPrompt }],
        systemPrompt,
      );
      setAiBriefing(response.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  }, [cri, verdict, marketScore]);

  return (
    <div
      style={{
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          Daily Briefing
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AiUsageBadge />
          <button
            onClick={generateBriefing}
            disabled={loading || limitReached}
            style={{
              background: "none",
              border: "1px solid var(--signal-core)",
              borderRadius: 4,
              padding: "3px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--signal-core)",
              cursor: loading ? "default" : "pointer",
              opacity: loading || limitReached ? 0.5 : 1,
            }}
          >
            {loading ? "GENERATING..." : aiBriefing ? "REFRESH AI" : "ENHANCE WITH AI"}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
          Analyzing regime data and generating briefing...
        </div>
      )}

      {error && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
          {error}
        </div>
      )}

      {/* AI-enhanced briefing (markdown) */}
      {aiBriefing && (
        <div style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
        }}>
          {renderMarkdown(aiBriefing)}
        </div>
      )}

      {/* Default data-driven briefing (JSX, no markdown) */}
      {!aiBriefing && !loading && hasDefaultData && marketScore && (
        <DefaultBriefingContent verdict={verdict} marketScore={marketScore} />
      )}

      {/* No data state */}
      {!aiBriefing && !loading && !hasDefaultData && !error && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Waiting for market data to generate briefing...
        </div>
      )}
    </div>
  );
}
