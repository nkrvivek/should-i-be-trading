import { useState } from "react";
import type { CouncilSummary } from "../../lib/proposalUi";
import { personaInitials } from "../../lib/proposalUi";

type Props = {
  summary: CouncilSummary;
};

/** Persona avatars + approve/reject tally, with expandable dissent reasons. */
export function CouncilVerdict({ summary }: Props) {
  const [expanded, setExpanded] = useState(false);
  const dissenters = summary.votes.filter((v) => v.vote === "reject" && v.reason);

  if (summary.votes.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {summary.votes.map((vote, idx) => (
          <div
            key={`${vote.persona}-${idx}`}
            title={`${vote.persona}: ${vote.vote}${vote.reason ? ` — ${vote.reason}` : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: "50%",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              background: vote.vote === "approve" ? "rgba(0, 214, 79, 0.15)" : "rgba(232, 93, 108, 0.15)",
              color: vote.vote === "approve" ? "var(--positive)" : "var(--negative)",
              border: `1px solid ${vote.vote === "approve" ? "var(--positive)" : "var(--negative)"}`,
            }}
          >
            {personaInitials(vote.persona)}
          </div>
        ))}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }} className="num-tabular">
          {summary.approveCount} approve · {summary.rejectCount} reject
        </span>
        {dissenters.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ height: 24, padding: "0 8px", fontSize: 11 }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide dissent" : `Dissent (${dissenters.length})`}
          </button>
        )}
      </div>

      {expanded && dissenters.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          {dissenters.map((vote, idx) => (
            <li key={`${vote.persona}-reason-${idx}`} style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{vote.persona}:</strong> {vote.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
