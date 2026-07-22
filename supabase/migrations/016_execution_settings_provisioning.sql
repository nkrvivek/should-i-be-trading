-- 016_execution_settings_provisioning.sql
--
-- Closes the provisioning gap 014_copilot_proposals.sql left open on purpose:
-- that migration gave users select+update on their own execution_settings
-- row but explicitly deferred the insert policy ("Row is created by
-- service_role on first Copilot opt-in ... no user-facing insert policy
-- yet"). No signup trigger materialized, so a user who never went through
-- that service_role path had no way to create their own row --
-- src/hooks/useExecutionSettings.ts's `provisioned` flag stayed false
-- forever and src/components/settings/CopilotSettings.tsx dead-ended on a
-- "check back later" message.
--
-- This policy lets a user insert their own row directly, but the `with
-- check` clause pins every column to the same safe defaults the table's own
-- column defaults already specify (auto off, caps 0, kill switch off) --
-- provisioning only ever creates a disabled row. Enabling auto-execute or
-- raising caps still requires the existing update policy afterward, one
-- explicit step at a time, same "no silent enablement" posture as the rest
-- of this table.

create policy "Users provision own execution settings" on public.execution_settings
  for insert
  with check (
    auth.uid() = user_id
    and auto_execute_enabled = false
    and auto_max_notional_usd = 0
    and auto_max_trades_per_day = 0
    and kill_switch = false
  );
