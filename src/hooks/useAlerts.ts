import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export type AlertRule = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  delivery: string[];
  enabled: boolean;
  last_triggered_at: string | null;
};

export type AlertHistoryEntry = {
  id: string;
  rule_id: string | null;
  message: string;
  data: Record<string, unknown>;
  delivered: boolean;
  created_at: string;
};

export function useAlerts() {
  const { user } = useAuthStore();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    const { data } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setRules(data);
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    const { data } = await supabase
      .from("alert_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setHistory(data);
  }, [user]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([fetchRules(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchRules, fetchHistory]);

  // Subscribe to Realtime for live alert delivery
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel("alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_history", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newAlert = payload.new as AlertHistoryEntry;
          setHistory((prev) => [newAlert, ...prev].slice(0, 50));

          // Browser notification
          if (Notification.permission === "granted") {
            new Notification("SIBT Alert", { body: newAlert.message });
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const createRule = useCallback(async (rule: Omit<AlertRule, "id" | "last_triggered_at">) => {
    if (!user || !isSupabaseConfigured()) return;
    await supabase.from("alert_rules").insert({ ...rule, user_id: user.id });
    await fetchRules();
  }, [user, fetchRules]);

  const updateRule = useCallback(async (id: string, updates: Partial<AlertRule>) => {
    if (!user || !isSupabaseConfigured()) return;
    await supabase.from("alert_rules").update(updates).eq("id", id).eq("user_id", user.id);
    await fetchRules();
  }, [user, fetchRules]);

  const deleteRule = useCallback(async (id: string) => {
    if (!user || !isSupabaseConfigured()) return;
    await supabase.from("alert_rules").delete().eq("id", id).eq("user_id", user.id);
    await fetchRules();
  }, [user, fetchRules]);

  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  return { rules, history, loading, createRule, updateRule, deleteRule, fetchRules, fetchHistory, requestNotificationPermission };
}
