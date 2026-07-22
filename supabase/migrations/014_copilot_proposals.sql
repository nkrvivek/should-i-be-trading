-- Phase 2 WS1 (docs/relaunch-plan-2026-07.md): multi-tenant proposal/approval
-- data model. Contract is fixed — Phase 2 WS2 (proposal engine, edge
-- functions) is built in parallel against these exact table/column names.

-- ── proposals ───────────────────────────────────────────────────────────────
-- One staged trade proposal per row. Written by service_role (edge functions)
-- only; users may only read their own rows.

create table public.proposals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,

  ticker text not null,
  structure text not null check (structure in (
    'cash_secured_put', 'covered_call', 'put_credit_spread', 'equity_buy', 'equity_sell'
  )),
  legs jsonb not null, -- [{action, right, strike, expiry, occ_symbol, qty}]
  qty int not null default 1,
  expiry date,
  net_credit_usd numeric,
  max_loss_usd numeric,
  collateral_usd numeric,

  rationale text not null,
  proposal_signals jsonb, -- regime/gates/confluence detail
  council_verdict jsonb, -- {votes:[{persona,vote,reason}],approve_count,reject_count}

  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'expired', 'executing', 'executed', 'failed', 'cancelled'
  )),
  approved_at timestamptz,
  approved_via text check (approved_via in ('in_app', 'magic_link', 'auto')),
  expires_at timestamptz not null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_proposals_user on public.proposals (user_id, created_at desc);
create index idx_proposals_status on public.proposals (status);

alter table public.proposals enable row level security;

create policy "Users read own proposals" on public.proposals
  for select using (auth.uid() = user_id);

-- No user-facing insert/update/delete policies. Only service_role (edge
-- functions) may write proposals — this prevents users from self-approving or
-- fabricating proposals client-side. RLS is bypassed by service_role, so no
-- explicit service_role policy is needed; the absence of any write policy for
-- other roles is the enforcement.

create trigger proposals_updated_at
  before update on public.proposals
  for each row execute procedure public.update_updated_at();

-- ── proposal_events ─────────────────────────────────────────────────────────
-- Append-only audit trail. No UPDATE/DELETE for any role except service_role.

create table public.proposal_events (
  id bigint generated always as identity primary key,
  proposal_id uuid references public.proposals on delete cascade,
  user_id uuid not null,
  event text not null,
  detail jsonb,
  created_at timestamptz default now()
);

create index idx_proposal_events_proposal on public.proposal_events (proposal_id, created_at);
create index idx_proposal_events_user on public.proposal_events (user_id, created_at desc);

alter table public.proposal_events enable row level security;

create policy "Users read own proposal events" on public.proposal_events
  for select using (auth.uid() = user_id);

-- No insert/update/delete policy for authenticated/anon roles — service_role
-- (which bypasses RLS) is the only writer. Belt-and-suspenders: explicitly
-- revoke UPDATE/DELETE from the non-service roles so a future permissive
-- policy addition can't silently reopen mutation of the audit trail.
revoke update, delete on public.proposal_events from authenticated, anon;

-- ── execution_settings ──────────────────────────────────────────────────────
-- Per-user Copilot auto-execute configuration. One row per user.

create table public.execution_settings (
  user_id uuid references auth.users on delete cascade primary key,
  auto_execute_enabled boolean not null default false,
  auto_max_notional_usd numeric not null default 0,
  auto_max_trades_per_day int not null default 0,
  kill_switch boolean not null default false,
  broker_connection_id text,
  updated_at timestamptz default now()
);

alter table public.execution_settings enable row level security;

create policy "Users read own execution settings" on public.execution_settings
  for select using (auth.uid() = user_id);

-- Full own-row update, including auto_execute_enabled — that's the user's
-- opt-in toggle, not a service_role-only field. Caps (auto_max_notional_usd /
-- auto_max_trades_per_day) are enforced at proposal-generation time by the
-- edge functions regardless of what the user sets here.
create policy "Users update own execution settings" on public.execution_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Row is created by service_role on first Copilot opt-in (or a signup
-- trigger in a later workstream); no user-facing insert policy yet.

create trigger execution_settings_updated_at
  before update on public.execution_settings
  for each row execute procedure public.update_updated_at();

-- ── 'copilot' tier ───────────────────────────────────────────────────────────
-- Mirrors 008_starter_tier.sql's pattern for adding a tier to the check
-- constraints.

-- profiles.tier
alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles add constraint profiles_tier_check
  check (tier in ('free', 'starter', 'pro', 'copilot', 'enterprise'));

-- profiles.trial_tier
alter table public.profiles drop constraint if exists profiles_trial_tier_check;
alter table public.profiles add constraint profiles_trial_tier_check
  check (trial_tier in ('starter', 'pro', 'copilot', 'enterprise'));

-- subscriptions.plan_tier (if exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'subscriptions') then
    execute 'alter table public.subscriptions drop constraint if exists subscriptions_plan_tier_check';
    execute 'alter table public.subscriptions add constraint subscriptions_plan_tier_check check (plan_tier in (''free'', ''starter'', ''pro'', ''copilot'', ''enterprise''))';
  end if;
end $$;
