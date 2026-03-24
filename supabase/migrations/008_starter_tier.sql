-- Add 'starter' tier to all check constraints

-- profiles.tier
alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles add constraint profiles_tier_check
  check (tier in ('free', 'starter', 'pro', 'enterprise'));

-- profiles.trial_tier
alter table public.profiles drop constraint if exists profiles_trial_tier_check;
alter table public.profiles add constraint profiles_trial_tier_check
  check (trial_tier in ('starter', 'pro', 'enterprise'));

-- subscriptions.plan_tier (if exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'subscriptions') then
    execute 'alter table public.subscriptions drop constraint if exists subscriptions_plan_tier_check';
    execute 'alter table public.subscriptions add constraint subscriptions_plan_tier_check check (plan_tier in (''free'', ''starter'', ''pro'', ''enterprise''))';
  end if;
end $$;
