-- Atomic rate limit increment — replaces client-side CAS pattern
-- Returns the new request_count, or -1 if limit exceeded
create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_usage_date date,
  p_daily_limit int
)
returns int as $$
declare
  v_count int;
begin
  -- Upsert the row and atomically increment if under limit
  insert into public.ai_usage (user_id, usage_date, request_count, updated_at)
  values (p_user_id, p_usage_date, 1, now())
  on conflict (user_id, usage_date)
  do update set
    request_count = ai_usage.request_count + 1,
    updated_at = now()
  where ai_usage.request_count < p_daily_limit
  returning request_count into v_count;

  -- If no row was returned, the limit was already reached
  if v_count is null then
    select request_count into v_count
    from public.ai_usage
    where user_id = p_user_id and usage_date = p_usage_date;
    return -(coalesce(v_count, 0)); -- Negative = denied
  end if;

  return v_count;
end;
$$ language plpgsql security definer;
