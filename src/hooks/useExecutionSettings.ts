import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { buildDefaultExecutionSettingsRow } from "../lib/executionSettingsDefaults";

export type ExecutionSettings = {
  user_id: string;
  auto_execute_enabled: boolean;
  auto_max_notional_usd: number;
  auto_max_trades_per_day: number;
  kill_switch: boolean;
  broker_connection_id: string | null;
  updated_at: string;
};

export type ExecutionSettingsPatch = Partial<
  Pick<
    ExecutionSettings,
    "auto_execute_enabled" | "auto_max_notional_usd" | "auto_max_trades_per_day" | "kill_switch"
  >
>;

export function useExecutionSettings() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<ExecutionSettings | null>(null);
  const [loading, setLoading] = useState(false);
  // Migration 014 gave users select+update on execution_settings but NOT
  // insert; migration 016 closes that gap with a user-facing insert policy
  // (safe defaults only — see executionSettingsDefaults.ts). A user who has
  // never provisioned has no row yet, and now calls `provision()` below to
  // create one themselves instead of waiting on a service_role path.
  const [provisioned, setProvisioned] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    const { data, error: fetchError } = await supabase
      .from("execution_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setError(null);
    if (data) {
      setSettings(data);
      setProvisioned(true);
    } else {
      setSettings(null);
      setProvisioned(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const update = useCallback(
    async (patch: ExecutionSettingsPatch) => {
      if (!user || !isSupabaseConfigured() || !settings) return;

      const previous = settings;
      setSaving(true);
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

      const { data, error: updateError } = await supabase
        .from("execution_settings")
        .update(patch)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();

      setSaving(false);

      if (updateError) {
        setError(updateError.message);
        setSettings(previous);
        return;
      }
      setError(null);
      if (data) setSettings(data);
    },
    [user, settings],
  );

  const provision = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("execution_settings")
      .insert(buildDefaultExecutionSettingsRow(user.id))
      .select()
      .single();
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setError(null);
    setSettings(data);
    setProvisioned(true);
  }, [user]);

  return { settings, loading, provisioned, saving, error, update, provision, refetch: fetchSettings };
}
