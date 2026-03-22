import { useState, useRef, useEffect } from "react";
import { chatWithClaude, type ChatMessage } from "../../api/anthropicClient";
import type { CriData, PortfolioData } from "../../api/types";
import type { TrafficLightVerdict } from "../../lib/trafficLight";

type Props = {
  cri: CriData | null;
  portfolio: PortfolioData | null;
  verdict: TrafficLightVerdict;
};

function buildSystemPrompt(cri: CriData | null, portfolio: PortfolioData | null, verdict: TrafficLightVerdict): string {
  const parts = [
    "You are a market analysis assistant for the SIBT (Should I Be Trading?) terminal.",
    "You have access to the current market regime data. Be concise, data-driven, and precise.",
    "Use the Radon signal interpretation framework:",
    "- P/C Ratio: >2.0 BEARISH, 0.8-1.2 NEUTRAL, <0.5 BULLISH",
    "- Signal semantics: Baseline -> Emerging -> Clear -> Strong -> Dislocated -> Extreme",
    "",
    `Current verdict: ${verdict.signal} (confidence: ${verdict.confidence}%)`,
    `VIX regime: ${verdict.vixRegime.label} — ${verdict.vixRegime.detail}`,
    `Reasons: ${verdict.reasons.join("; ")}`,
  ];

  if (cri) {
    parts.push(
      "",
      "--- REGIME DATA ---",
      `CRI: ${cri.cri.toFixed(1)} (${cri.cri_level})`,
      `VIX: ${cri.vix.toFixed(1)} | VVIX: ${cri.vvix.toFixed(1)} | VVIX/VIX: ${cri.vvix_vix_ratio.toFixed(1)}`,
      `COR1M: ${cri.cor1m.toFixed(1)} (5d chg: ${cri.cor1m_5d_change.toFixed(1)})`,
      `RVOL: ${cri.realized_vol.toFixed(1)}% | SPX dist from MA: ${cri.spx_distance_pct.toFixed(1)}%`,
      `Crash trigger: ${cri.crash_trigger.triggered ? "ACTIVE" : "inactive"}`,
      `Components — VIX: ${cri.components.vix}/25, VVIX: ${cri.components.vvix}/25, CORR: ${cri.components.correlation}/25, MOM: ${cri.components.momentum}/25`,
    );
  }

  if (portfolio) {
    parts.push(
      "",
      "--- PORTFOLIO ---",
      `Positions: ${portfolio.position_count} (${portfolio.defined_risk_count} defined, ${portfolio.undefined_risk_count} undefined)`,
      `Deployed: ${(portfolio.total_deployed_pct * 100).toFixed(1)}% ($${portfolio.total_deployed_dollars.toLocaleString()})`,
      `Remaining capacity: ${(portfolio.remaining_capacity_pct * 100).toFixed(1)}%`,
      `Bankroll: $${portfolio.bankroll.toLocaleString()}`,
    );
  }

  return parts.join("\n");
}

export function ChatPanel({ cri, portfolio, verdict }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await chatWithClaude(
        updated,
        buildSystemPrompt(cri, portfolio, verdict),
      );
      setMessages([...updated, { role: "assistant", content: response.content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
            Ask about the current market regime, portfolio positioning, or any trading question.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              background: msg.role === "user" ? "var(--bg-panel-raised)" : "var(--bg-panel)",
              border: msg.role === "assistant" ? "1px solid var(--border-dim)" : "none",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>
              {msg.role}
            </div>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ padding: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            Analyzing...
          </div>
        )}
        {error && (
          <div style={{ padding: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the market..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 12px",
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "6px 16px",
            background: "var(--accent-bg)",
            border: "none",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--accent-text)",
            cursor: loading ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
}
