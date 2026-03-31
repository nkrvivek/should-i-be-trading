create table public.learning_progress (
  user_id uuid references auth.users on delete cascade primary key,
  completed_lessons jsonb not null default '{}'::jsonb,
  weekly_target integer not null default 3 check (weekly_target between 1 and 7),
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index learning_sessions_user_completed_idx
  on public.learning_sessions (user_id, completed_at desc);

create table public.learning_reminder_preferences (
  user_id uuid references auth.users on delete cascade primary key,
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly')),
  weekly_target integer not null default 3 check (weekly_target between 1 and 7),
  timezone text not null default 'UTC',
  browser_enabled boolean not null default false,
  email_enabled boolean not null default false,
  preferred_hour smallint not null default 18 check (preferred_hour between 0 and 23),
  preferred_weekday smallint not null default 1 check (preferred_weekday between 0 and 6),
  paused boolean not null default false,
  last_engaged_at timestamptz,
  last_reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  reminder_kind text not null check (reminder_kind in ('daily', 'weekly')),
  delivery_key text not null,
  status text not null default 'sent' check (status in ('sent', 'skipped', 'failed')),
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, reminder_kind, delivery_key)
);

alter table public.learning_progress enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.learning_reminder_preferences enable row level security;
alter table public.learning_reminder_deliveries enable row level security;

create policy "Users read own learning progress" on public.learning_progress
  for select using (auth.uid() = user_id);
create policy "Users insert own learning progress" on public.learning_progress
  for insert with check (auth.uid() = user_id);
create policy "Users update own learning progress" on public.learning_progress
  for update using (auth.uid() = user_id);

create policy "Users read own learning sessions" on public.learning_sessions
  for select using (auth.uid() = user_id);
create policy "Users insert own learning sessions" on public.learning_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users read own reminder prefs" on public.learning_reminder_preferences
  for select using (auth.uid() = user_id);
create policy "Users insert own reminder prefs" on public.learning_reminder_preferences
  for insert with check (auth.uid() = user_id);
create policy "Users update own reminder prefs" on public.learning_reminder_preferences
  for update using (auth.uid() = user_id);

create policy "Users read own reminder deliveries" on public.learning_reminder_deliveries
  for select using (auth.uid() = user_id);

create trigger learning_progress_updated_at
  before update on public.learning_progress
  for each row execute procedure public.update_updated_at();

create trigger learning_reminder_preferences_updated_at
  before update on public.learning_reminder_preferences
  for each row execute procedure public.update_updated_at();

create or replace function public.handle_learning_session()
returns trigger as $$
begin
  insert into public.learning_progress (user_id, completed_lessons, last_completed_at)
  values (
    new.user_id,
    jsonb_build_object(new.lesson_slug, new.completed_at),
    new.completed_at
  )
  on conflict (user_id) do update
  set completed_lessons = public.learning_progress.completed_lessons || jsonb_build_object(new.lesson_slug, new.completed_at),
      last_completed_at = greatest(coalesce(public.learning_progress.last_completed_at, new.completed_at), new.completed_at);

  insert into public.learning_reminder_preferences (user_id, last_engaged_at)
  values (new.user_id, new.completed_at)
  on conflict (user_id) do update
  set last_engaged_at = greatest(coalesce(public.learning_reminder_preferences.last_engaged_at, new.completed_at), new.completed_at);

  return new;
end;
$$ language plpgsql security definer;

create trigger learning_session_after_insert
  after insert on public.learning_sessions
  for each row execute procedure public.handle_learning_session();
