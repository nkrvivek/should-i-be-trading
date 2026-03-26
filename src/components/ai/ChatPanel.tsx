import { useState, useRef, useEffect } from "react";
import { chatWithClaude, getAiUsage, type ChatMessage } from "../../api/anthropicClient";
import { AiUsageBadge } from "./AiUsageBadge";
import { renderMarkdown } from "../../lib/renderMarkdown";
import type { CriData, PortfolioData } from "../../api/types";
import type { TrafficLightVerdict } from "../../lib/trafficLight";

type Props = {
  cri?: CriData | null;
  portfolio?: PortfolioData | null;
  verdict?: TrafficLightVerdict;
};

/** Quick-action prompt suggestions for the chat */
const QUICK_PROMPTS = [
  { label: "Market Outlook", prompt: "What's the current market outlook based on the regime data? Should I be trading today?" },
  { label: "Portfolio Risk", prompt: "Analyze my portfolio risk. Am I overexposed to any sector or direction? What should I hedge?" },
  { label: "Position Sizing", prompt: "Given the current regime and my portfolio, what's the ideal position sizing for a new trade?" },
  { label: "What to Buy", prompt: "Based on the current market regime (VIX, breadth, momentum), what types of strategies or sectors are best positioned right now?" },
  { label: "Hedging Ideas", prompt: "What hedges should I consider for my current portfolio given the market conditions?" },
  { label: "Regime Change", prompt: "Walk me through the regime indicators. Are we transitioning between states? What signs should I watch?" },
];

function buildSystemPrompt(cri: CriData | null, portfolio: PortfolioData | null, verdict?: TrafficLightVerdict): string {
  const parts = [
    "You are a market analysis assistant for the SIBT (Should I Be Trading?) terminal.",
    "You help retail traders make institutional-quality decisions by demystifying market signals.",
    "You have access to the current market regime data and portfolio positions below.",
    "Be concise, data-driven, and precise. Give actionable insights, not generic advice.",
    "When analyzing portfolios, consider: concentration risk, sector exposure, Greeks exposure,",
    "directional bias, and how positions interact with the current regime.",
    "",
    "Signal interpretation:",
    "- P/C Ratio: >2.0 BEARISH, 0.8-1.2 NEUTRAL, <0.5 BULLISH",
    "- Signal levels: Baseline -> Emerging -> Clear -> Strong -> Dislocated -> Extreme",
    "",
    `Current verdict: ${verdict?.signal ?? "UNKNOWN"} (confidence: ${verdict?.confidence ?? 0}%)`,
    `VIX regime: ${verdict?.vixRegime?.label ?? "N/A"} — ${verdict?.vixRegime?.detail ?? "No data"}`,
    `Reasons: ${verdict?.reasons?.join("; ") ?? "No data available"}`,
  ];

  if (cri) {
    parts.push(
      "",
      "--- REGIME DATA ---",
      `CRI: ${(cri.cri?.score ?? 0).toFixed(1)} (${cri.cri?.level ?? "N/A"})`,
      `VIX: ${cri.vix.toFixed(1)} | VVIX: ${cri.vvix.toFixed(1)} | VVIX/VIX: ${cri.vvix_vix_ratio.toFixed(1)}`,
      `COR1M: ${cri.cor1m.toFixed(1)} (5d chg: ${cri.cor1m_5d_change.toFixed(1)})`,
      `RVOL: ${cri.realized_vol.toFixed(1)}% | SPX dist from MA: ${cri.spx_distance_pct.toFixed(1)}%`,
      `Crash trigger: ${cri.crash_trigger.triggered ? "ACTIVE" : "inactive"}`,
      `Components — VIX: ${cri.cri?.components?.vix ?? 0}/25, VVIX: ${cri.cri?.components?.vvix ?? 0}/25, CORR: ${cri.cri?.components?.correlation ?? 0}/25, MOM: ${cri.cri?.components?.momentum ?? 0}/25`,
    );
  }

  if (portfolio) {
    parts.push(
      "",
      "--- PORTFOLIO OVERVIEW ---",
      `Bankroll: $${portfolio.bankroll.toLocaleString()}`,
      `Capital deployed: ${(portfolio.total_deployed_pct * 100).toFixed(1)}% ($${portfolio.total_deployed_dollars.toLocaleString()})`,
      `Remaining capacity: ${(portfolio.remaining_capacity_pct * 100).toFixed(1)}%`,
      `Position count: ${portfolio.position_count} (${portfolio.defined_risk_count} defined risk, ${portfolio.undefined_risk_count} undefined risk)`,
    );

    if (portfolio.account_summary) {
      const acct = portfolio.account_summary;
      parts.push(
        `Net liquidation: $${acct.net_liquidation?.toLocaleString() ?? "N/A"}`,
        `Buying power: $${acct.buying_power?.toLocaleString() ?? "N/A"}`,
        `Settled cash: $${acct.settled_cash?.toLocaleString() ?? "N/A"}`,
        `Daily P&L: $${acct.daily_pnl?.toLocaleString() ?? "N/A"}`,
        `Unrealized P&L: $${acct.unrealized_pnl?.toLocaleString() ?? "N/A"}`,
      );
    }

    // Individual positions detail
    if (portfolio.positions.length > 0) {
      parts.push("", "--- POSITIONS ---");
      for (const pos of portfolio.positions) {
        const pnl = pos.ib_daily_pnl != null ? ` | Day P&L: $${pos.ib_daily_pnl.toFixed(0)}` : "";
        const mv = pos.market_value != null ? ` | MktVal: $${pos.market_value.toFixed(0)}` : "";
        parts.push(
          `• ${pos.ticker} — ${pos.structure} (${pos.risk_profile}) | ${pos.direction} | ${pos.contracts} contracts | Entry: $${pos.entry_cost.toFixed(0)} | MaxRisk: ${pos.max_risk != null ? "$" + pos.max_risk.toFixed(0) : "undefined"}${mv}${pnl}${pos.expiry ? " | Exp: " + pos.expiry : ""}`,
        );
      }
    }
  }

  parts.push(
    "",
    "IMPORTANT: You are not a financial advisor. Frame responses as analysis and education,",
    "not recommendations. The user makes their own trading decisions.",
  );

  return parts.join("\n");
}

export function ChatPanel({ cri = null, portfolio = null, verdict }: Props) {
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
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              Ask about the current market regime, portfolio positioning, or any trading question.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => { setInput(qp.prompt); }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--info)",
                    background: "transparent",
                    border: "1px solid var(--info)",
                    cursor: "pointer",
                    opacity: 0.8,
                  }}
                >
                  {qp.label}
                </button>
              ))}
            </div>
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
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>
              {msg.role}
            </div>
            {msg.role === "assistant" ? (
              <div style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
                {renderMarkdown(msg.content)}
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && (
          <div style={{ padding: 8, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            Analyzing...
          </div>
        )}
        {error && (
          <div style={{ padding: 8, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input + usage badge */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(e); } }}
            placeholder={getAiUsage().used >= getAiUsage().limit && !getAiUsage().isOwnKey ? "Daily limit reached — add your API key in Settings" : "Ask about the market..."}
            disabled={loading || (getAiUsage().used >= getAiUsage().limit && !getAiUsage().isOwnKey)}
            style={{
              flex: 1,
              padding: "6px 12px",
              background: "var(--bg-panel-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !input.trim() || (getAiUsage().used >= getAiUsage().limit && !getAiUsage().isOwnKey)}
            style={{
              padding: "6px 16px",
              background: "var(--accent-bg)",
              border: "none",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--accent-text)",
              cursor: loading ? "default" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            SEND
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <AiUsageBadge />
        </div>
      </div>
    </div>
  );
}
