-- Allow 'starter' as a trial_tier option
alter table public.profiles drop constraint if exists profiles_trial_tier_check;
alter table public.profiles add constraint profiles_trial_tier_check
  check (trial_tier in ('starter', 'pro', 'enterprise'));
