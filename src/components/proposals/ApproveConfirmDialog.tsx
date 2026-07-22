import { ConfirmDialog } from "../shared/ConfirmDialog";
import type { Proposal } from "../../hooks/useProposals";
import { fmtUsdExact } from "../../lib/format";

type Props = {
  proposal: Proposal;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Approve confirmation — order summary + the required "real order" disclosure. */
export function ApproveConfirmDialog({ proposal, loading, onConfirm, onCancel }: Props) {
  const structureLabel = proposal.structure.replace(/_/g, " ");

  return (
    <ConfirmDialog
      title={`Approve ${proposal.ticker} ${structureLabel}?`}
      confirmLabel={loading ? "Placing…" : "Approve & place order"}
      disabled={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      body={
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="num-tabular" style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--font-mono)", fontSize: 13 }}>
            <div>Ticker: {proposal.ticker}</div>
            <div>Structure: {structureLabel}</div>
            <div>Qty: {proposal.qty}</div>
            {proposal.net_credit_usd != null && <div>Credit: {fmtUsdExact(proposal.net_credit_usd)}</div>}
            {proposal.max_loss_usd != null && <div>Max loss: {fmtUsdExact(proposal.max_loss_usd)}</div>}
            {proposal.collateral_usd != null && <div>Collateral: {fmtUsdExact(proposal.collateral_usd)}</div>}
          </div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            This places a real order.
          </div>
        </div>
      }
    />
  );
}
