-- Add trial support to profiles (no credit card required)
-- New users get 14-day Pro trial automatically on signup

alter table public.profiles
  add column if not exists trial_tier text default 'pro' check (trial_tier in ('pro', 'enterprise')),
  add column if not exists trial_ends_at timestamptz;

-- Update the signup trigger to grant 14-day Pro trial
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, tier, trial_tier, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'free',
    'pro',
    now() + interval '14 days'
  );
  return new;
end;
$$ language plpgsql security definer;
