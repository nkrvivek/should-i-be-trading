create table public.alert_rules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'vix_crosses', 'cri_level_change', 'dark_pool_signal',
    'price_crosses', 'regime_change', 'vix_regime_change'
  )),
  trigger_config jsonb not null default '{}',
  delivery text[] not null default '{browser}',
  enabled boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.alert_history (
  id uuid default gen_random_uuid() primary key,
  rule_id uuid references public.alert_rules on delete set null,
  user_id uuid references auth.users on delete cascade not null,
  message text not null,
  data jsonb default '{}',
  delivered boolean default false,
  created_at timestamptz default now()
);

alter table public.alert_rules enable row level security;
alter table public.alert_history enable row level security;

create policy "Users manage own alert rules" on public.alert_rules
  for all using (auth.uid() = user_id);
create policy "Users read own alert history" on public.alert_history
  for select using (auth.uid() = user_id);
create policy "System inserts alert history" on public.alert_history
  for insert with check (auth.uid() = user_id);

create trigger alert_rules_updated_at
  before update on public.alert_rules
  for each row execute procedure public.update_updated_at();

-- Index for efficient alert evaluation
create index idx_alert_rules_enabled on public.alert_rules (enabled) where enabled = true;
create index idx_alert_history_user on public.alert_history (user_id, created_at desc);
