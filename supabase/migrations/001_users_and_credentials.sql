-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Encrypted API credentials
create table public.user_credentials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('ibkr', 'unusual_whales', 'anthropic', 'exa', 'finnhub', 'alpha_vantage')),
  credential_data text not null, -- TODO: encrypt via pgcrypto or Supabase Vault
  is_valid boolean default true,
  last_validated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.user_credentials enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users read own credentials" on public.user_credentials
  for select using (auth.uid() = user_id);
create policy "Users insert own credentials" on public.user_credentials
  for insert with check (auth.uid() = user_id);
create policy "Users update own credentials" on public.user_credentials
  for update using (auth.uid() = user_id);
create policy "Users delete own credentials" on public.user_credentials
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger credentials_updated_at
  before update on public.user_credentials
  for each row execute procedure public.update_updated_at();
