import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useBrokerStore } from "../../stores/brokerStore";
import { renderMarkdown } from "../../lib/renderMarkdown";
import { supabase } from "../../lib/supabase";
import type { SimulatorLeg } from "../../lib/strategy/payoff";
import type { StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const header: React.CSSProperties = { ...mono, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const panel: React.CSSProperties = { background: "var(--bg-panel, #fff)", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, padding: 16, marginBottom: 16 };

interface SignalContext {
  marketScore?: number;
  verdict?: string;
  positions?: { symbol: string; qty: number; side: string; currentPrice: number; unrealizedPL: number }[];
}

interface ParsedStrategy {
  ticker: string;
  legs: SimulatorLeg[];
}

interface Props {
  context?: SignalContext;
  onSimulate?: (ticker: string, price: number, legs: SimulatorLeg[]) => void;
  onExecute?: (symbol: string, price: number, suggestion: StrategySuggestion) => void;
  canExecute?: boolean;
}

export default function StrategySuggester({ context, onSimulate, onExecute, canExecute }: Props) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedStrategies, setParsedStrategies] = useState<ParsedStrategy[]>([]);
  const allPositions = useBrokerStore((s) => s.allPositions);
  const positions = allPositions();
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

For each strategy, format EXACTLY like this (use markdown headers and bullet lists):

## Strategy 1: [Name] on [TICKER]

- **Direction**: Bullish/Bearish/Neutral
- **Confidence**: Low/Medium/High
- **Setup**: Specific strikes, expirations, quantities

| Metric | Value |
|--------|-------|
| Max Profit | $X |
| Max Loss | $X |
| Breakeven | $X |

- **Supporting Signals**: Which market signals support this trade
- **Risks**: Key risk factors

After each strategy, include a JSON block wrapped in \`\`\`json fences with this exact format:
\`\`\`json
{"ticker": "AAPL", "legs": [{"action": "buy", "type": "call", "qty": 1, "strike": 185, "premium": 5.20}, {"action": "sell", "type": "call", "qty": 1, "strike": 195, "premium": 2.10}]}
\`\`\`

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
          const text = data.content?.[0]?.text ?? "No response";
          setResponse(text);
          setParsedStrategies(parseStrategyJsonBlocks(text));
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
      const text = data.content?.[0]?.text ?? "No response";
      setResponse(text);
      setParsedStrategies(parseStrategyJsonBlocks(text));
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
          {renderStrategySections(response, parsedStrategies, onSimulate, onExecute, canExecute)}
        </div>
      )}

      <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)", marginTop: 12, borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
        Educational analysis only. Not investment advice. Always do your own research. hello@sibt.ai
      </div>
    </div>
  );
}

function parseStrategyJsonBlocks(text: string): ParsedStrategy[] {
  const results: ParsedStrategy[] = [];
  const jsonBlocks = text.match(/```json\n([\s\S]*?)\n```/g);
  if (!jsonBlocks) return results;
  for (const block of jsonBlocks) {
    try {
      const jsonStr = block.replace(/```json\n/, "").replace(/\n```/, "");
      const parsed = JSON.parse(jsonStr);
      if (parsed.ticker && Array.isArray(parsed.legs)) {
        results.push({
          ticker: parsed.ticker,
          legs: parsed.legs.map((l: Record<string, unknown>) => ({
            action: l.action as "buy" | "sell",
            type: l.type as "call" | "put" | "stock",
            qty: Number(l.qty) || 1,
            strike: Number(l.strike) || 0,
            premium: Number(l.premium) || 0,
          })),
        });
      }
    } catch {
      // skip invalid JSON
    }
  }
  return results;
}

function renderStrategySections(
  text: string,
  parsedStrategies: ParsedStrategy[],
  onSimulate?: (ticker: string, price: number, legs: SimulatorLeg[]) => void,
  onExecute?: (symbol: string, price: number, suggestion: StrategySuggestion) => void,
  canExecute?: boolean,
) {
  // Split by ## Strategy headers
  const sections = text.split(/(?=## Strategy \d)/);
  let strategyIdx = 0;

  return sections.map((section, i) => {
    const isStrategySection = /^## Strategy \d/.test(section);
    const parsed = isStrategySection ? parsedStrategies[strategyIdx] : null;
    if (isStrategySection) strategyIdx++;

    // Strip JSON fences from rendered markdown
    const cleanSection = section.replace(/```json\n[\s\S]*?\n```/g, "");

    return (
      <div key={i}>
        {renderMarkdown(cleanSection)}
        {isStrategySection && parsed && (onSimulate || (onExecute && canExecute)) && (
          <div style={{ display: "flex", gap: 8, margin: "8px 0 16px", paddingLeft: 4 }}>
            {onSimulate && (
              <button
                onClick={() => {
                  // Use option strikes only (stock legs have strike=0)
                  const optionLegs = parsed.legs.filter((l) => l.strike > 0);
                  const underlyingPrice = optionLegs.length > 0
                    ? optionLegs.reduce((s, l) => s + l.strike, 0) / optionLegs.length
                    : 100;
                  onSimulate(parsed.ticker, underlyingPrice, parsed.legs);
                }}
                style={{
                  ...mono,
                  fontSize: 12,
                  padding: "5px 14px",
                  background: "var(--accent-bg)",
                  color: "var(--accent-text)",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                SIMULATE
              </button>
            )}
            {onExecute && canExecute && (
              <button
                onClick={() => {
                  const avgStrike = parsed.legs.reduce((s, l) => s + l.strike, 0) / parsed.legs.length;
                  const suggestion: StrategySuggestion = {
                    strategyName: `AI Strategy on ${parsed.ticker}`,
                    riskLevel: "moderate",
                    riskScore: 5,
                    description: `AI-suggested strategy on ${parsed.ticker}`,
                    rationale: "Claude-generated strategy suggestion",
                    legs: parsed.legs,
                    estimatedMaxProfit: "See analysis above",
                    estimatedMaxLoss: "See analysis above",
                    maxLossCoverage: "N/A",
                  };
                  onExecute(parsed.ticker, avgStrike || 100, suggestion);
                }}
                style={{
                  ...mono,
                  fontSize: 12,
                  padding: "5px 14px",
                  background: "var(--signal-core)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                EXECUTE
              </button>
            )}
          </div>
        )}
      </div>
    );
  });
}
