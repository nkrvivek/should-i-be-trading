-- Subscriptions table (Stripe is source of truth)
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'enterprise')),
  billing_interval text check (billing_interval in ('month', 'year')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Idempotent webhook event log
create table public.stripe_event_log (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz default now()
);

-- RLS: users can only SELECT their own subscription
-- No INSERT/UPDATE/DELETE for authenticated users — only service_role (webhook) can modify
alter table public.subscriptions enable row level security;
alter table public.stripe_event_log enable row level security;

create policy "Users read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- No user-facing write policies. Only service_role can insert/update/delete.
-- This prevents users from self-upgrading their tier.

-- Sync profiles.tier from subscriptions.plan_tier
-- This keeps the existing featureGates.ts working without changes
create or replace function public.sync_tier_from_subscription()
returns trigger as $$
begin
  update public.profiles
  set tier = new.plan_tier, updated_at = now()
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger sync_tier_on_subscription_change
  after insert or update on public.subscriptions
  for each row execute procedure public.sync_tier_from_subscription();

-- Handle subscription deletion (downgrade to free)
create or replace function public.downgrade_on_subscription_delete()
returns trigger as $$
begin
  update public.profiles
  set tier = 'free', updated_at = now()
  where id = old.user_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger downgrade_on_subscription_delete
  after delete on public.subscriptions
  for each row execute procedure public.downgrade_on_subscription_delete();

-- Updated_at trigger
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.update_updated_at();
