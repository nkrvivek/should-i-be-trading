-- WS3a (docs/relaunch-plan-2026-07.md Phase 2): server-side broker-connection
-- store. Today (see generate-proposals/index.ts's doc comment) SnapTrade
-- userId/userSecret live only in the browser (src/stores/brokerStore.ts /
-- localStorage) and are passed on every proposal-generation call. This table
-- is the first step toward a real server-side connection so a later
-- workstream can trigger proposal generation from a cron/background job
-- instead of a client-initiated call — and so approve/execute (WS3a's
-- proposal-action function) can place orders without the browser being open.
--
-- Encryption mirrors 001_users_and_credentials.sql / user_credentials exactly:
-- the same encrypt_credential/decrypt_credential pgcrypto RPCs from
-- 011_encrypt_credentials.sql are reused here rather than inventing new
-- crypto. The RLS shape mirrors 014_copilot_proposals.sql's `proposals`
-- table: users may read (and, here, delete) their own rows, but there is no
-- insert/update policy for authenticated/anon — only service_role (which
-- bypasses RLS) may write a row, because secrets must flow through the
-- save-broker-connection edge function, never raw from the client.

create table public.broker_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,

  provider text not null default 'snaptrade',
  snaptrade_user_id text not null,
  snaptrade_user_secret_encrypted text not null,
  account_id text,
  label text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (user_id, provider)
);

create index idx_broker_connections_user on public.broker_connections (user_id);

alter table public.broker_connections enable row level security;

create policy "Users read own broker connections" on public.broker_connections
  for select using (auth.uid() = user_id);

create policy "Users delete own broker connections" on public.broker_connections
  for delete using (auth.uid() = user_id);

-- No insert/update policy for authenticated/anon — service_role (bypasses
-- RLS) is the only writer, same enforcement-by-omission as `proposals` in
-- 014_copilot_proposals.sql. Belt-and-suspenders: explicitly revoke so a
-- future permissive policy addition can't silently reopen a client-writable
-- path to these secrets.
revoke insert, update on public.broker_connections from authenticated, anon;

create trigger broker_connections_updated_at
  before update on public.broker_connections
  for each row execute procedure public.update_updated_at();
