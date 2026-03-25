import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useBrokerStore } from "../../stores/brokerStore";
import { renderMarkdown } from "../../lib/renderMarkdown";
import { supabase } from "../../lib/supabase";

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const header: React.CSSProperties = { ...mono, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const panel: React.CSSProperties = { background: "var(--bg-panel, #fff)", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, padding: 16, marginBottom: 16 };

interface SignalContext {
  marketScore?: number;
  verdict?: string;
  positions?: { symbol: string; qty: number; side: string; currentPrice: number; unrealizedPL: number }[];
}

export default function StrategySuggester({ context }: { context?: SignalContext }) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { positions } = useBrokerStore();
  useAuthStore();

  const generate = async () => {
    setLoading(true);
    setError("");
    setResponse("");

    const positionSummary = (context?.positions ?? positions).map((p) =>
      `${p.symbol}: ${p.qty} shares ${p.side}, current $${p.currentPrice}, P&L $${p.unrealizedPL}`
    ).join("\n") || "No positions connected";

    const prompt = `You are SIBT's Strategy Suggester. Based on the current market signals and portfolio, suggest 2-3 specific, actionable trading strategies.

Current Market Context:
- Market Quality Score: ${context?.marketScore ?? "N/A"}/100
- Verdict: ${context?.verdict ?? "N/A"}

Current Portfolio:
${positionSummary}

For each strategy, provide:
1. **Strategy Name** (e.g., Covered Call on AAPL, Bull Put Spread on MSFT)
2. **Direction** (Bullish/Bearish/Neutral)
3. **Confidence** (Low/Medium/High)
4. **Setup**: Specific strikes, expirations, quantities
5. **Max Profit / Max Loss / Breakeven**
6. **Supporting Signals**: Which market signals support this trade
7. **Risks**: Key risk factors

Rules:
- Only suggest defined-risk strategies (no naked options)
- Prefer strategies that align with the current market regime
- If verdict is NO_TRADE, suggest only defensive/hedging strategies
- If verdict is CAUTION, suggest half-size or conservative setups
- Include at least one income strategy (covered call or CSP) if portfolio has eligible positions
- Be specific with numbers, not vague

IMPORTANT: This is educational analysis only, not investment advice.`;

    try {
      // Try direct API key first
      const apiKey = localStorage.getItem("sibt_anthropic_key") || import.meta.env.VITE_ANTHROPIC_API_KEY;

      if (apiKey) {
        const res = await fetch("/api/anthropic/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setResponse(data.content?.[0]?.text ?? "No response");
          setLoading(false);
          return;
        }
      }

      // Fall back to Supabase edge function
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token;
      if (!token) throw new Error("Sign in to use Strategy Suggester");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/proxy-anthropic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "x-user-token": token,
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setResponse(data.content?.[0]?.text ?? "No response");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Strategy generation failed");
    }
    setLoading(false);
  };

  return (
    <div style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={header}>Strategy Suggester</span>
          <span style={{ ...mono, fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>Claude-powered</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            ...mono, fontSize: 13, padding: "6px 16px",
            background: loading ? "var(--text-secondary)" : "var(--signal-core)",
            color: "#fff", border: "none", borderRadius: 4, cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "ANALYZING..." : "GENERATE STRATEGIES"}
        </button>
      </div>

      {/* Signal Context Summary */}
      {context && (
        <div style={{ display: "flex", gap: 16, marginBottom: 12, ...mono, fontSize: 13, color: "var(--text-secondary)" }}>
          {context.marketScore != null && <span>Score: {context.marketScore}/100</span>}
          {context.verdict && <span>Verdict: {context.verdict}</span>}
          <span>Positions: {(context.positions ?? positions).length}</span>
        </div>
      )}

      {error && <div style={{ color: "var(--fault)", ...mono, fontSize: 14, marginTop: 8 }}>{error}</div>}

      {!response && !loading && !error && (
        <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "16px 0" }}>
          Click "Generate Strategies" to get AI-powered trade recommendations based on your current market signals and portfolio.
        </div>
      )}

      {response && (
        <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7 }}>
          {renderMarkdown(response)}
        </div>
      )}

      <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)", marginTop: 12, borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
        Educational analysis only. Not investment advice. Always do your own research. hello@sibt.ai
      </div>
    </div>
  );
}
