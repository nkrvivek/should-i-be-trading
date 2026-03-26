import { useState } from "react";
import { chatWithClaude } from "../../api/anthropicClient";
import { AiUsageBadge, useAiUsage } from "./AiUsageBadge";
import { exaSearch } from "../../api/exaClient";
import { EARNINGS_SUMMARY_PROMPT } from "../../api/earningsPrompts";
import { renderMarkdown } from "../../lib/renderMarkdown";

type Props = {
  symbol: string;
  quarter: number;
  year: number;
  onClose: () => void;
};

type Stage = "idle" | "searching" | "reading" | "summarizing" | "done" | "error";

export function EarningsSummaryPanel({ symbol, quarter, year, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const aiUsage = useAiUsage();
  const limitReached = !aiUsage.isOwnKey && aiUsage.used >= aiUsage.limit;

  const handleSummarize = async () => {
    setStage("searching");
    setError(null);
    setSummary(null);

    try {
      // Step 1: Find transcript via Exa
      const searchQuery = `${symbol} Q${quarter} ${year} earnings call transcript`;
      const searchResults = await exaSearch(searchQuery, 3, 5000);

      if (searchResults.results.length === 0) {
        setError("No earnings transcript found. The transcript may not be available yet.");
        setStage("error");
        return;
      }

      const bestResult = searchResults.results[0];
      setSourceUrl(bestResult.url);
      setStage("reading");

      // Step 2: Use the transcript text from Exa
      const transcriptText = bestResult.text;
      if (!transcriptText || transcriptText.length < 100) {
        setError("Transcript text too short or unavailable. Try again later.");
        setStage("error");
        return;
      }

      setStage("summarizing");

      // Step 3: Summarize with Claude
      const response = await chatWithClaude(
        [{
          role: "user",
          content: `Summarize this ${symbol} Q${quarter} ${year} earnings information:\n\n${transcriptText.slice(0, 12000)}`,
        }],
        EARNINGS_SUMMARY_PROMPT,
      );

      setSummary(response.content);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarization failed");
      setStage("error");
    }
  };

  const stageLabels: Record<Stage, string> = {
    idle: "",
    searching: "Finding transcript...",
    reading: "Reading transcript...",
    summarizing: "Summarizing with Claude...",
    done: "",
    error: "",
  };

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
            {symbol} — Q{quarter} {year}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              AI Earnings Summary
            </span>
            <AiUsageBadge />
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
        {stage === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 40 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              Search for and summarize the {symbol} Q{quarter} {year} earnings call transcript using AI.
            </div>
            <button
              onClick={handleSummarize}
              disabled={limitReached}
              style={{
                padding: "8px 24px",
                background: "var(--accent-bg)",
                border: "none",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-text)",
                cursor: "pointer",
                opacity: limitReached ? 0.4 : 1,
              }}
            >
              {limitReached ? "AI LIMIT REACHED" : "SUMMARIZE EARNINGS"}
            </button>
          </div>
        )}

        {(stage === "searching" || stage === "reading" || stage === "summarizing") && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 40 }}>
            <div style={{
              width: 24, height: 24, border: "2px solid var(--border-dim)",
              borderTopColor: "var(--accent-bg)", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--signal-core)" }}>
              {stageLabels[stage]}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {stage === "error" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)", marginBottom: 12 }}>
              {error}
            </div>
            <button
              onClick={handleSummarize}
              style={{
                padding: "6px 16px",
                background: "var(--bg-panel-raised)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              RETRY
            </button>
          </div>
        )}

        {stage === "done" && summary && (
          <div>
            {sourceUrl && (
              <div style={{
                padding: "6px 10px",
                marginBottom: 12,
                background: "var(--bg-panel-raised)",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}>
                Source:{" "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--signal-core)", textDecoration: "none" }}
                >
                  {new URL(sourceUrl).hostname}
                </a>
              </div>
            )}
            <div style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
            }}>
              {renderMarkdown(summary)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
