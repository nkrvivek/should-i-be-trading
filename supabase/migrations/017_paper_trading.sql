-- 017_paper_trading.sql
--
-- Paper trading engine (relaunch directive 2026-07-21): paper mode becomes
-- the FREE-tier funnel on the proposal rail — every authenticated user can
-- generate and execute paper proposals with capped daily usage on a fixed
-- ticker allowlist, so sibt.ai can be soak-tested for a week before any real
-- money touches the flow. Copilot unlocks unlimited paper trading AND real
-- (live) execution; live stays gated exactly as 014_copilot_proposals.sql
-- already has it.
--
-- Reference pattern ported (ideas only, no shared code, no import):
-- autopilot-experiment/broker_paper.py's PaperBroker — buy@ask / sell@bid
-- simulated equity fills, sell_to_open@bid / buy_to_close@ask for options,
-- transactional cash/position bookkeeping, fail-closed persistence.
--
-- RLS shapes below mirror the precedents already in this migration series:
--   - self-provision with pinned defaults -> 016_execution_settings_provisioning.sql
--   - service-role-only writes via enforcement-by-omission + explicit revoke
--     -> 014_copilot_proposals.sql (`proposals`) / 015_broker_connections.sql
--   - append-only audit trail -> 014_copilot_proposals.sql (`proposal_events`)
--   - atomic daily-usage counter -> 012_atomic_rate_limit.sql (`increment_ai_usage`)

-- ── proposals.mode ───────────────────────────────────────────────────────
-- Every proposal is either a paper (simulated) or live (real broker) trade.
-- Default 'paper' so existing/blank inserts from any code not yet passing a
-- mode land on the safer side.
alter table public.proposals add column mode text not null default 'paper'
  check (mode in ('paper', 'live'));

create index idx_proposals_user_mode on public.proposals (user_id, mode, status);

-- ── paper_accounts ───────────────────────────────────────────────────────
-- One simulated brokerage account per user. $100,000 starting cash, fixed —
-- the insert policy's `with check` pins both columns so a client can't
-- self-provision a bigger bankroll.
create table public.paper_accounts (
  user_id uuid references auth.users on delete cascade primary key,
  starting_cash_usd numeric not null default 100000,
  cash_usd numeric not null default 100000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.paper_accounts enable row level security;

create policy "Users read own paper account" on public.paper_accounts
  for select using (auth.uid() = user_id);

create policy "Users provision own paper account" on public.paper_accounts
  for insert
  with check (
    auth.uid() = user_id
    and cash_usd = starting_cash_usd
    and starting_cash_usd = 100000
  );

-- UPDATE service_role only (cash_usd moves only through execute_paper_fill,
-- below) — no user-facing update policy, same enforcement-by-omission
-- posture as `proposals`. Belt-and-suspenders explicit revoke.
revoke update on public.paper_accounts from authenticated, anon;

create trigger paper_accounts_updated_at
  before update on public.paper_accounts
  for each row execute procedure public.update_updated_at();

-- ── paper_positions ──────────────────────────────────────────────────────
-- One row per (user, symbol) — symbol is an equity ticker (AAPL) or an OCC
-- option symbol (a short covered-call leg). qty is signed: positive for a
-- long equity holding, negative for a short option position written via
-- sell_to_open.
create table public.paper_positions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  symbol text not null,
  qty numeric not null,
  avg_price numeric not null,
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index idx_paper_positions_user on public.paper_positions (user_id);

alter table public.paper_positions enable row level security;

create policy "Users read own paper positions" on public.paper_positions
  for select using (auth.uid() = user_id);

-- Writes are service_role only (starter-portfolio seeding at provisioning
-- time, and execute_paper_fill's bookkeeping) — no insert/update/delete
-- policy for authenticated/anon, same enforcement-by-omission as
-- `broker_connections`.
revoke insert, update, delete on public.paper_positions from authenticated, anon;

-- ── paper_fills (append-only) ────────────────────────────────────────────
create table public.paper_fills (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  proposal_id uuid references public.proposals on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell', 'sell_to_open', 'buy_to_close')),
  qty numeric not null,
  price numeric not null,
  filled_at timestamptz not null default now()
);

create index idx_paper_fills_user on public.paper_fills (user_id, filled_at desc);
create index idx_paper_fills_proposal on public.paper_fills (proposal_id);

alter table public.paper_fills enable row level security;

create policy "Users read own paper fills" on public.paper_fills
  for select using (auth.uid() = user_id);

-- INSERT service_role only (via execute_paper_fill), no UPDATE/DELETE for
-- any role — append-only audit trail, same posture as `proposal_events`.
revoke insert, update, delete on public.paper_fills from authenticated, anon;

-- ── paper_action_usage (free-tier daily budget counter) ──────────────────
-- Counts proposal generations + council runs + paper executions against one
-- daily budget for the free tier (20/day). Shape mirrors 006_ai_usage.sql's
-- ai_usage table exactly, one counter table per usage dimension rather than
-- overloading ai_usage's request_count for an unrelated budget.
create table public.paper_action_usage (
  user_id uuid references auth.users on delete cascade not null,
  usage_date date not null default current_date,
  action_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.paper_action_usage enable row level security;

create policy "Users read own paper action usage" on public.paper_action_usage
  for select using (auth.uid() = user_id);

-- Writes are service_role only (increment_paper_action_usage below) — same
-- enforcement-by-omission + explicit revoke posture as the other
-- service-role-written tables in this migration.
revoke insert, update, delete on public.paper_action_usage from authenticated, anon;

-- Atomic increment — mirrors 012_atomic_rate_limit.sql's increment_ai_usage
-- exactly, extended with a nullable p_daily_limit: null means "unlimited"
-- (starter/pro/copilot/enterprise), matching paperLimits.ts's
-- checkPaperActionBudget contract (paid tiers get a null cap). Returns the
-- new action_count, or the negative of the current count if the limit was
-- already reached (negative = denied, same sentinel convention as
-- increment_ai_usage).
create or replace function public.increment_paper_action_usage(
  p_user_id uuid,
  p_usage_date date,
  p_daily_limit int
)
returns int as $$
declare
  v_count int;
begin
  if p_daily_limit is null then
    insert into public.paper_action_usage (user_id, usage_date, action_count, updated_at)
    values (p_user_id, p_usage_date, 1, now())
    on conflict (user_id, usage_date)
    do update set
      action_count = paper_action_usage.action_count + 1,
      updated_at = now()
    returning action_count into v_count;
    return v_count;
  end if;

  insert into public.paper_action_usage (user_id, usage_date, action_count, updated_at)
  values (p_user_id, p_usage_date, 1, now())
  on conflict (user_id, usage_date)
  do update set
    action_count = paper_action_usage.action_count + 1,
    updated_at = now()
  where paper_action_usage.action_count < p_daily_limit
  returning action_count into v_count;

  if v_count is null then
    select action_count into v_count
    from public.paper_action_usage
    where user_id = p_user_id and usage_date = p_usage_date;
    return -(coalesce(v_count, 0));
  end if;

  return v_count;
end;
$$ language plpgsql security definer;

revoke all on function public.increment_paper_action_usage(uuid, date, int) from public, anon, authenticated;
grant execute on function public.increment_paper_action_usage(uuid, date, int) to service_role;

-- ── execute_paper_fill (transactional bookkeeping) ────────────────────────
-- Single RPC that does the entire simulated fill atomically: locks the
-- account row (serializes concurrent approvals on the same account so two
-- fills can never race on cash_usd), locks the position row for the same
-- symbol, applies the cash delta and position qty/avg_price update, writes
-- the append-only paper_fills row, and returns the resulting cash/position
-- state. Cash/side math mirrors src/lib/paperFillEngine.ts's
-- computeFillBookkeeping — that TS module is the unit-tested reference
-- implementation of this same algorithm (see that file's doc comment); the
-- two are kept in sync by hand since there's no shared TS/SQL compiler here.
--
-- Scope note: this function only ever records a FILL (open or close) at
-- approval time. Option expiry/assignment settlement (marking a short call
-- expired worthless, or assigning shares away) is out of v1 scope — the
-- brief this migration implements is scoped to the fill/execute path, not a
-- full lifecycle settlement engine; a future workstream would add that as
-- its own scheduled job against paper_positions.
create or replace function public.execute_paper_fill(
  p_user_id uuid,
  p_proposal_id uuid,
  p_symbol text,
  p_side text,
  p_qty numeric,
  p_price numeric,
  p_multiplier numeric default 1 -- 100 for options (per-contract), 1 for equities
)
returns table (new_cash_usd numeric, new_position_qty numeric, new_avg_price numeric) as $$
declare
  v_cash numeric;
  v_pos_qty numeric := 0;
  v_pos_avg numeric := 0;
  v_signed_qty numeric;
  v_cash_delta numeric;
  v_new_qty numeric;
  v_new_avg numeric;
begin
  if p_side not in ('buy', 'sell', 'sell_to_open', 'buy_to_close') then
    raise exception 'execute_paper_fill: invalid side %', p_side;
  end if;
  if p_qty <= 0 then
    raise exception 'execute_paper_fill: qty must be > 0';
  end if;
  if p_price < 0 then
    raise exception 'execute_paper_fill: price must be >= 0';
  end if;

  -- Lock the account row for the rest of this transaction — two concurrent
  -- approvals on the same account serialize on this row instead of racing
  -- on cash_usd.
  select cash_usd into v_cash
  from public.paper_accounts
  where user_id = p_user_id
  for update;

  if v_cash is null then
    raise exception 'execute_paper_fill: no paper account for user %', p_user_id;
  end if;

  select qty, avg_price into v_pos_qty, v_pos_avg
  from public.paper_positions
  where user_id = p_user_id and symbol = p_symbol
  for update;
  v_pos_qty := coalesce(v_pos_qty, 0);
  v_pos_avg := coalesce(v_pos_avg, 0);

  -- buy / buy_to_close increase the position's signed qty and debit cash;
  -- sell / sell_to_open decrease signed qty and credit cash (premium
  -- received, for an option sell_to_open).
  if p_side in ('buy', 'buy_to_close') then
    v_signed_qty := p_qty;
    v_cash_delta := -(p_qty * p_price * p_multiplier);
  else
    v_signed_qty := -p_qty;
    v_cash_delta := (p_qty * p_price * p_multiplier);
  end if;

  if p_side in ('buy', 'buy_to_close') and (v_cash + v_cash_delta) < 0 then
    raise exception 'execute_paper_fill: insufficient paper cash for this fill';
  end if;

  v_new_qty := v_pos_qty + v_signed_qty;

  -- avg_price: weighted average when the fill extends the position in its
  -- existing direction (opening/adding to a long or a short); a fill that
  -- reduces or flips the position keeps the prior avg_price for the
  -- remaining qty (standard cost-basis convention — realized P&L on the
  -- closed portion isn't tracked as its own column in v1, cash_usd already
  -- reflects it via v_cash_delta).
  if v_pos_qty = 0 or sign(v_pos_qty) = sign(v_signed_qty) then
    v_new_avg := coalesce(
      (abs(v_pos_qty) * v_pos_avg + p_qty * p_price) / nullif(abs(v_new_qty), 0),
      p_price
    );
  else
    v_new_avg := v_pos_avg;
  end if;

  update public.paper_accounts
  set cash_usd = v_cash + v_cash_delta, updated_at = now()
  where user_id = p_user_id;

  if v_new_qty = 0 then
    delete from public.paper_positions where user_id = p_user_id and symbol = p_symbol;
  else
    insert into public.paper_positions (user_id, symbol, qty, avg_price, updated_at)
    values (p_user_id, p_symbol, v_new_qty, v_new_avg, now())
    on conflict (user_id, symbol) do update
      set qty = excluded.qty, avg_price = excluded.avg_price, updated_at = now();
  end if;

  insert into public.paper_fills (user_id, proposal_id, symbol, side, qty, price)
  values (p_user_id, p_proposal_id, p_symbol, p_side, p_qty, p_price);

  return query select (v_cash + v_cash_delta), v_new_qty, v_new_avg;
end;
$$ language plpgsql security definer;

revoke all on function public.execute_paper_fill(uuid, uuid, text, text, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.execute_paper_fill(uuid, uuid, text, text, numeric, numeric, numeric) to service_role;
