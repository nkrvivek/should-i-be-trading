-- Send welcome email when a new user profile is created.
-- Uses pg_net extension to call the send-welcome-email edge function.
-- The edge function handles email delivery via Resend.

-- Enable pg_net if not already enabled
create extension if not exists pg_net with schema extensions;

-- Function to trigger welcome email via edge function
create or replace function public.send_welcome_email()
returns trigger as $$
declare
  supabase_url text := current_setting('app.settings.supabase_url', true);
  service_role_key text := current_setting('app.settings.service_role_key', true);
begin
  -- Only fire for new inserts (not updates)
  -- Call the edge function asynchronously via pg_net
  if supabase_url is not null and service_role_key is not null then
    perform net.http_post(
      url := supabase_url || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key,
        'apikey', service_role_key
      ),
      body := jsonb_build_object(
        'user_id', new.id,
        'display_name', new.display_name
      )
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger: fire after profile insert (which happens on signup via handle_new_user)
drop trigger if exists on_profile_created_send_welcome on public.profiles;
create trigger on_profile_created_send_welcome
  after insert on public.profiles
  for each row execute procedure public.send_welcome_email();
