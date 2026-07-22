import { TerminalShell } from "../components/layout/TerminalShell";
import { ProposalCard } from "../components/proposals/ProposalCard";
import { useProposals } from "../hooks/useProposals";

export function ProposalsPage() {
  const { proposals, loading, error, approve, reject, actionState, eventsByProposal, fetchEvents } = useProposals();

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="heading-tight" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          Proposals
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: "var(--radius-sm)", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", fontSize: 13, color: "var(--negative)" }}>
            Couldn't load proposals: {error}
          </div>
        )}

        {loading && proposals.length === 0 && (
          <div className="skeleton-pulse" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Loading proposals…
          </div>
        )}

        {!loading && proposals.length === 0 && !error && (
          <div className="card" style={{ padding: 24, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            No proposals yet. Proposals appear here after your next scan finds a candidate that
            clears every gate — regime, factor, and signal confluence checks — and a rationale
            worth your review. Nothing to act on right now.
          </div>
        )}

        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            actionState={actionState[proposal.id]}
            events={eventsByProposal[proposal.id]}
            onApprove={() => approve(proposal)}
            onReject={() => reject(proposal)}
            onFetchEvents={() => fetchEvents(proposal.id)}
          />
        ))}
      </div>
    </TerminalShell>
  );
}
