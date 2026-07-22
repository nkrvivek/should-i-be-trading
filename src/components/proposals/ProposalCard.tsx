import { useEffect, useState } from "react";
import type { Proposal, ProposalEvent, ActionState } from "../../hooks/useProposals";
import { Badge } from "../shared/Badge";
import { GateChipRow } from "./GateChipRow";
import { CouncilVerdict } from "./CouncilVerdict";
import { ApproveConfirmDialog } from "./ApproveConfirmDialog";
import { fmtUsdExact } from "../../lib/format";
import {
  formatCountdown,
  statusBadge,
  deriveGateChips,
  deriveCouncilSummary,
} from "../../lib/proposalUi";

const PENDING_STATUSES = new Set(["pending"]);
const MUTED_STATUSES = new Set(["expired", "cancelled"]);

type Props = {
  proposal: Proposal;
  actionState: ActionState | undefined;
  events: ProposalEvent[] | undefined;
  onApprove: () => void;
  onReject: () => void;
  onFetchEvents: () => void;
};

function daysToExpiry(expiry: string | null): number | null {
  if (!expiry) return null;
  const ms = new Date(expiry).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="num-tabular"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 600,
          color: tone === "positive" ? "var(--positive)" : tone === "negative" ? "var(--negative)" : "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ProposalCard({ proposal, actionState, events, onApprove, onReject, onFetchEvents }: Props) {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const badge = statusBadge(proposal.status);
  const gateChips = deriveGateChips(proposal.proposal_signals);
  const councilSummary = deriveCouncilSummary(proposal.council_verdict);
  const dte = daysToExpiry(proposal.expiry);
  const isPending = PENDING_STATUSES.has(proposal.status);
  const isMuted = MUTED_STATUSES.has(proposal.status);
  const isExecuting = proposal.status === "executing";
  const isFailed = proposal.status === "failed";
  const loading = actionState?.loading ?? false;

  useEffect(() => {
    if (isFailed && !events) onFetchEvents();
  }, [isFailed, events, onFetchEvents]);

  const failureDetail = isFailed
    ? events?.find((e) => e.event === "execution_failed" || e.event === "failed")?.detail
    : null;

  return (
    <div
      className="card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        opacity: isMuted ? 0.55 : 1,
      }}
    >
      {/* Hero: ticker + structure, status badge, countdown */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="heading-tight" style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
            {proposal.ticker}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            {proposal.structure.replace(/_/g, " ")}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <Badge label={badge.label} variant={badge.variant} />
          {!isMuted && proposal.status !== "executed" && (
            <span className="num-tabular" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              {isPending ? `expires in ${formatCountdown(proposal.expires_at)}` : formatCountdown(proposal.expires_at)}
            </span>
          )}
        </div>
      </div>

      {/* Numbers row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <StatTile label="Credit" value={proposal.net_credit_usd != null ? fmtUsdExact(proposal.net_credit_usd) : "—"} tone="positive" />
        <StatTile label="Max loss" value={proposal.max_loss_usd != null ? fmtUsdExact(proposal.max_loss_usd) : "—"} tone="negative" />
        <StatTile label="Collateral" value={proposal.collateral_usd != null ? fmtUsdExact(proposal.collateral_usd) : "—"} />
        <StatTile label="DTE" value={dte != null ? `${dte}d` : "—"} />
      </div>

      {/* Rationale */}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>{proposal.rationale}</p>

      {/* Gate chips */}
      <GateChipRow chips={gateChips} />

      {/* Council verdict */}
      {councilSummary && <CouncilVerdict summary={councilSummary} />}

      {/* Executing state */}
      {isExecuting && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <span className="spinner" aria-hidden="true" />
          Executing…
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(232, 93, 108, 0.1)",
            border: "1px solid var(--negative)",
            fontSize: 13,
            color: "var(--negative)",
          }}
        >
          {failureDetail && typeof failureDetail === "object" && "message" in failureDetail
            ? String((failureDetail as Record<string, unknown>).message)
            : "Execution failed. Detail not yet available."}
        </div>
      )}

      {/* Action error */}
      {actionState?.error && (
        <div style={{ fontSize: 12, color: "var(--negative)" }}>{actionState.error}</div>
      )}

      {/* Approve / Reject */}
      {isPending && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-sm"
            disabled={loading}
            onClick={() => setShowApproveConfirm(true)}
            style={{ background: "var(--accent-bg)", color: "var(--accent-text)" }}
          >
            Approve
          </button>
          <button
            className="btn btn-sm"
            disabled={loading}
            onClick={onReject}
            style={{ background: "transparent", color: "var(--negative)", border: "1px solid var(--negative)" }}
          >
            Reject
          </button>
        </div>
      )}

      {showApproveConfirm && (
        <ApproveConfirmDialog
          proposal={proposal}
          loading={loading}
          onCancel={() => setShowApproveConfirm(false)}
          onConfirm={() => {
            setShowApproveConfirm(false);
            onApprove();
          }}
        />
      )}
    </div>
  );
}
