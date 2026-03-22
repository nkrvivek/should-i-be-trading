create table public.watchlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  tickers text[] not null default '{}',
  sort_order int default 0,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.watchlists enable row level security;

create policy "Users manage own watchlists" on public.watchlists
  for all using (auth.uid() = user_id);

create trigger watchlists_updated_at
  before update on public.watchlists
  for each row execute procedure public.update_updated_at();

-- Default watchlist for new users
create or replace function public.create_default_watchlist()
returns trigger as $$
begin
  insert into public.watchlists (user_id, name, tickers, is_default)
  values (new.id, 'Default', array['SPY', 'QQQ', 'IWM', 'DIA', 'VIX'], true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_watchlist
  after insert on public.profiles
  for each row execute procedure public.create_default_watchlist();
