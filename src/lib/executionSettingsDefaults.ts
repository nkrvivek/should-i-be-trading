/**
 * Safe-default row shape for a user-initiated execution_settings insert.
 *
 * Pure/dependency-free so it can be unit-tested without Supabase and reused
 * by both src/hooks/useExecutionSettings.ts (the real insert call) and its
 * tests. The values here must match migration 016's insert-policy `with
 * check` clause exactly — that policy re-validates every one of these
 * columns server-side, so a mismatch here would make every provisioning
 * attempt fail RLS, not silently succeed with different values.
 */

export interface ExecutionSettingsDefaultsRow {
  user_id: string;
  auto_execute_enabled: false;
  auto_max_notional_usd: 0;
  auto_max_trades_per_day: 0;
  kill_switch: false;
}

/** Build the default (disabled, zero-cap) execution_settings row for a
 * user's first-time Copilot provisioning. */
export function buildDefaultExecutionSettingsRow(userId: string): ExecutionSettingsDefaultsRow {
  return {
    user_id: userId,
    auto_execute_enabled: false,
    auto_max_notional_usd: 0,
    auto_max_trades_per_day: 0,
    kill_switch: false,
  };
}
