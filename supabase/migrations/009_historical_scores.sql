-- Historical market scores for backtesting
-- System-wide (not per-user): one entry per trading day

create table if not exists public.historical_scores (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  market_score integer,           -- 0-100 Market Quality Score
  signal text,                     -- TRADE / CAUTION / NO_TRADE
  regime_score integer,            -- 0-100 Regime Monitor composite
  market_state text,               -- Strong/Stable/Fragile/Stressed/Crisis
  vix numeric,
  spy_close numeric,
  spy_change numeric,              -- daily % change
  score_data jsonb,                -- full MarketScore breakdown
  regime_data jsonb,               -- full RegimeMonitorResult
  created_at timestamptz default now()
);

-- One entry per day
create unique index if not exists idx_historical_scores_date
  on public.historical_scores(date);

-- Public read (backtesting data is shared)
alter table public.historical_scores enable row level security;
create policy "Anyone can read historical scores"
  on public.historical_scores for select using (true);
-- No insert/update/delete for users (only service role via edge functions)
