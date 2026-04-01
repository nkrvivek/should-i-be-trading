import { useState } from "react";
import { useTradeJournal } from "../../hooks/useTradeJournal";
import type { TradeJournalEntry } from "../../lib/strategy/types";

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel, #fff)",
  border: "1px solid var(--border-dim, #e2e8f0)",
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
};

const headerStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary, #64748b)",
  marginBottom: 12,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
};

const reviewFieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const reviewLabelStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const reviewInputStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 13,
  padding: "8px 10px",
  border: "1px solid var(--border-dim)",
  borderRadius: 6,
  background: "var(--bg-panel-raised, #f8fafc)",
  color: "var(--text-primary)",
};

export function JournalPanel() {
  const { entries, stats, closeTrade, deleteTrade, updateTrade } = useTradeJournal();
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [exitPriceInput, setExitPriceInput] = useState("");
  const [executionQuality, setExecutionQuality] = useState<"A" | "B" | "C">("B");
  const [thesisOutcome, setThesisOutcome] = useState<"worked" | "mixed" | "failed">("mixed");
  const [nextAction, setNextAction] = useState("Keep on watchlist");
  const [reviewNotes, setReviewNotes] = useState("");

  const startReview = (entry: TradeJournalEntry) => {
    setReviewingId(entry.id);
    setExitPriceInput(entry.exit?.price?.toString() ?? "");
    setExecutionQuality(entry.review?.executionQuality ?? "B");
    setThesisOutcome(entry.review?.thesisOutcome ?? "mixed");
    setNextAction(entry.review?.nextAction ?? "Keep on watchlist");
    setReviewNotes(entry.review?.notes ?? "");
  };

  const saveReview = () => {
    if (!reviewingId) return;
    const trimmedExit = exitPriceInput.trim();
    if (trimmedExit) {
      const parsed = Number(trimmedExit);
      if (Number.isFinite(parsed) && parsed > 0) {
        closeTrade(reviewingId, parsed);
      }
    }
    updateTrade(reviewingId, {
      review: {
        executionQuality,
        thesisOutcome,
        nextAction,
        notes: reviewNotes.trim(),
        reviewedAt: new Date().toISOString(),
      },
    });
    setReviewingId(null);
    setExitPriceInput("");
    setReviewNotes("");
  };

  const activeReviewEntry = reviewingId ? entries.find((entry) => entry.id === reviewingId) ?? null : null;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "TOTAL TRADES", value: String(stats.totalTrades) },
          { label: "WIN RATE", value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? "var(--signal-core)" : "var(--fault)" },
          { label: "AVG P&L", value: fmt(stats.avgPnl), color: stats.avgPnl >= 0 ? "var(--signal-core)" : "var(--fault)" },
          { label: "TOTAL P&L", value: fmt(stats.totalPnl), color: stats.totalPnl >= 0 ? "var(--signal-core)" : "var(--fault)" },
        ].map((m) => (
          <div key={m.label} style={panelStyle}>
            <div style={headerStyle}>{m.label}</div>
            <div style={{ ...monoStyle, fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={headerStyle}>Post-Trade Review</div>
        {activeReviewEntry ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Close the loop on <strong style={{ color: "var(--text-primary)" }}>{activeReviewEntry.ticker}</strong>. Record how the trade actually played out so the next setup benefits from it.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Exit Price</span>
                <input value={exitPriceInput} onChange={(e) => setExitPriceInput(e.target.value)} placeholder="Optional if already closed" style={reviewInputStyle} />
              </label>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Execution</span>
                <select value={executionQuality} onChange={(e) => setExecutionQuality(e.target.value as "A" | "B" | "C")} style={reviewInputStyle}>
                  <option value="A">A - matched the plan</option>
                  <option value="B">B - acceptable</option>
                  <option value="C">C - sloppy</option>
                </select>
              </label>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Thesis Outcome</span>
                <select value={thesisOutcome} onChange={(e) => setThesisOutcome(e.target.value as "worked" | "mixed" | "failed")} style={reviewInputStyle}>
                  <option value="worked">Worked</option>
                  <option value="mixed">Mixed</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Next Action</span>
                <select value={nextAction} onChange={(e) => setNextAction(e.target.value)} style={reviewInputStyle}>
                  <option>Keep on watchlist</option>
                  <option>Trade smaller next time</option>
                  <option>Only simulate next time</option>
                  <option>Retire this setup for now</option>
                </select>
              </label>
            </div>
            <label style={reviewFieldStyle}>
              <span style={reviewLabelStyle}>Review Notes</span>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="What confirmed the trade, what invalidated it, and what you would change next time."
                style={{ ...reviewInputStyle, resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={saveReview} style={{ ...monoStyle, fontSize: 12, fontWeight: 700, padding: "8px 12px", border: "1px solid var(--signal-core)", borderRadius: 6, background: "rgba(5, 173, 152, 0.12)", color: "var(--signal-core)", cursor: "pointer" }}>
                SAVE REVIEW
              </button>
              <button onClick={() => setReviewingId(null)} style={{ ...monoStyle, fontSize: 12, fontWeight: 700, padding: "8px 12px", border: "1px solid var(--border-dim)", borderRadius: 6, background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Pick any open or recently closed trade below to log execution quality, thesis outcome, and the next action. This is meant to be fast enough that you actually do it.
          </div>
        )}
      </div>

      {!entries.length ? (
        <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>
          No trades logged yet. Trades will be recorded automatically when you execute through a connected brokerage, or add them manually.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {["Date", "Ticker", "Strategy", "Dir", "Entry", "Exit", "P&L", "Score", "Status", ""].map((h) => (
                <th key={h} style={{ ...headerStyle, padding: "8px 10px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{new Date(e.date).toLocaleDateString()}</td>
                <td style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>{e.ticker}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.strategy}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: e.direction === "bullish" ? "var(--signal-core)" : "var(--fault)" }}>{e.direction}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(e.entry.price)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.exit ? fmt(e.exit.price) : "---"}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: (e.pnl ?? 0) >= 0 ? "var(--signal-core)" : "var(--fault)" }}>
                  {e.pnl != null ? `${fmt(e.pnl)} (${pct(e.pnlPercent ?? 0)})` : "---"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.marketScoreAtEntry}/100</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, background: e.status === "open" ? "#dbeafe" : e.status === "closed" ? "#dcfce7" : "#f1f5f9", color: e.status === "open" ? "#2563eb" : e.status === "closed" ? "#16a34a" : "#64748b" }}>
                    {e.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", display: "flex", gap: 4 }}>
                  <button onClick={() => startReview(e)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--signal-core)", color: "var(--signal-core)", borderRadius: 4, background: "none", cursor: "pointer" }}>
                    {e.status === "open" ? "REVIEW" : "EDIT"}
                  </button>
                  <button onClick={() => deleteTrade(e.id)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}>DEL</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
