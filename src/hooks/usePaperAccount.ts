import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { provisionPaperAccount } from "../lib/paperAccountClient";

export type PaperAccount = {
  user_id: string;
  starting_cash_usd: number;
  cash_usd: number;
};

export type PaperPosition = {
  symbol: string;
  qty: number;
  avg_price: number;
};

export type PaperFill = {
  symbol: string;
  side: string;
  qty: number;
  price: number;
  filled_at: string;
  proposal_id: string | null;
};

const RECENT_FILLS_LIMIT = 20;

export function usePaperAccount() {
  const { user } = useAuthStore();
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [fills, setFills] = useState<PaperFill[]>([]);
  const [loading, setLoading] = useState(false);
  // No paper_accounts row yet means the user hasn't provisioned — the
  // onboarding CTA calls provision() to create one via the edge function.
  const [provisioned, setProvisioned] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;

    const [accountRes, positionsRes, fillsRes] = await Promise.all([
      supabase.from("paper_accounts").select("*").eq("user_id", user.id).maybeSingle(),
      // paper_positions / paper_fills are scoped to the caller via RLS (no
      // explicit user_id filter needed here — the policy join handles it).
      supabase.from("paper_positions").select("*"),
      supabase
        .from("paper_fills")
        .select("*")
        .order("filled_at", { ascending: false })
        .limit(RECENT_FILLS_LIMIT),
    ]);

    const firstError = accountRes.error ?? positionsRes.error ?? fillsRes.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setError(null);

    if (accountRes.data) {
      setAccount(accountRes.data);
      setProvisioned(true);
    } else {
      setAccount(null);
      setProvisioned(false);
    }
    setPositions(positionsRes.data ?? []);
    setFills(fillsRes.data ?? []);
  }, [user]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const provision = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;

    setProvisioning(true);
    try {
      await provisionPaperAccount();
      setError(null);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start paper trading");
    } finally {
      setProvisioning(false);
    }
  }, [user, fetchAll]);

  return {
    account,
    positions,
    fills,
    loading,
    provisioned,
    provisioning,
    error,
    provision,
    refetch: fetchAll,
  };
}
