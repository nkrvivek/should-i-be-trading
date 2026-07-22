import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { approveProposal, rejectProposal } from "../lib/proposalActionsClient";

export type ProposalLeg = {
  action: string;
  right?: string;
  strike?: number;
  expiry?: string;
  occ_symbol?: string;
  qty?: number;
};

export type Proposal = {
  id: string;
  user_id: string;
  ticker: string;
  structure: string;
  legs: ProposalLeg[];
  qty: number;
  expiry: string | null;
  net_credit_usd: number | null;
  max_loss_usd: number | null;
  collateral_usd: number | null;
  rationale: string;
  proposal_signals: unknown;
  council_verdict: unknown;
  status: string;
  approved_at: string | null;
  approved_via: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // 'mode' is a new column owned by the backend branch (default 'paper').
  // Rows fetched before that migration lands won't carry it — normalizeMode
  // below defaults missing/unrecognized values to 'paper', the safer read
  // (never mistake an old row for a live order).
  mode: "paper" | "live";
};

function normalizeMode(value: unknown): "paper" | "live" {
  return value === "live" ? "live" : "paper";
}

function normalizeProposal(row: Record<string, unknown>): Proposal {
  return { ...row, mode: normalizeMode(row.mode) } as Proposal;
}

export type ProposalEvent = {
  id: number;
  proposal_id: string;
  user_id: string;
  event: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type ActionState = { loading: boolean; error: string | null };

export function useProposals() {
  const { user } = useAuthStore();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const [eventsByProposal, setEventsByProposal] = useState<Record<string, ProposalEvent[]>>({});

  const fetchProposals = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    const { data, error: fetchError } = await supabase
      .from("proposals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setError(null);
    if (data) setProposals(data.map(normalizeProposal));
  }, [user]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetchProposals().finally(() => setLoading(false));
  }, [fetchProposals]);

  // Realtime: proposals are written by service_role (edge functions) only —
  // status transitions (approved -> executing -> executed/failed, or a fresh
  // scan inserting new pending rows) arrive here, not from our own writes.
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel("proposals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "proposals", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = normalizeProposal(payload.new as Record<string, unknown>);
          setProposals((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "proposals", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = normalizeProposal(payload.new as Record<string, unknown>);
          setProposals((prev) => prev.map((p) => (p.id === row.id ? row : p)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "proposals", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const oldRow = payload.old as Partial<Proposal>;
          if (!oldRow.id) return;
          setProposals((prev) => prev.filter((p) => p.id !== oldRow.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchEvents = useCallback(
    async (proposalId: string) => {
      if (!user || !isSupabaseConfigured()) return;
      const { data } = await supabase
        .from("proposal_events")
        .select("*")
        .eq("proposal_id", proposalId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) {
        setEventsByProposal((prev) => ({ ...prev, [proposalId]: data }));
      }
    },
    [user],
  );

  const runAction = useCallback(
    async (proposal: Proposal, action: "approve" | "reject") => {
      const optimisticStatus = action === "approve" ? "approved" : "rejected";
      const previous = proposal.status;

      setActionState((prev) => ({ ...prev, [proposal.id]: { loading: true, error: null } }));
      setProposals((prev) =>
        prev.map((p) => (p.id === proposal.id ? { ...p, status: optimisticStatus } : p)),
      );

      try {
        if (action === "approve") await approveProposal(proposal.id);
        else await rejectProposal(proposal.id);

        setActionState((prev) => ({ ...prev, [proposal.id]: { loading: false, error: null } }));
        // Realtime should push the authoritative row, but refetch as a
        // belt-and-suspenders in case the subscription is delayed or absent.
        await fetchProposals();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        setActionState((prev) => ({ ...prev, [proposal.id]: { loading: false, error: message } }));
        // Revert the optimistic update — the write did not go through.
        setProposals((prev) =>
          prev.map((p) => (p.id === proposal.id ? { ...p, status: previous } : p)),
        );
      }
    },
    [fetchProposals],
  );

  const approve = useCallback((proposal: Proposal) => runAction(proposal, "approve"), [runAction]);
  const reject = useCallback((proposal: Proposal) => runAction(proposal, "reject"), [runAction]);

  return {
    proposals,
    loading,
    error,
    refetch: fetchProposals,
    approve,
    reject,
    actionState,
    eventsByProposal,
    fetchEvents,
  };
}
