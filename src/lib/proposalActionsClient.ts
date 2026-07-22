import { callEdgeFunction } from "./edgeFunction";

// WS3a owns the actual 'proposal-action' edge function (a separate branch —
// it does not exist in this worktree yet). This module only defines the
// client-side call shape it must satisfy: {proposalId, action}.

export type ProposalActionResult = {
  status?: string;
  [key: string]: unknown;
};

async function callProposalAction(
  proposalId: string,
  action: "approve" | "reject",
): Promise<ProposalActionResult> {
  return callEdgeFunction("proposal-action", { proposalId, action });
}

export function approveProposal(proposalId: string) {
  return callProposalAction(proposalId, "approve");
}

export function rejectProposal(proposalId: string) {
  return callProposalAction(proposalId, "reject");
}
