# Learning Reminders

## What Exists

The learning reminder system now has:

- durable tables for progress, sessions, preferences, and deliveries
- a server-side reminder sender at `supabase/functions/send-learning-reminders`
- academy UI settings in `/learn`

## Deploy

1. Apply the migration:

```bash
supabase db push
```

2. Deploy the edge function:

```bash
supabase functions deploy send-learning-reminders
```

3. Ensure these secrets are configured:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SECRET`
- `RESEND_API_KEY`
- `WELCOME_FROM_EMAIL` (optional)

## Manual Run

Dry run:

```bash
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/send-learning-reminders" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'
```

Live send:

```bash
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/send-learning-reminders" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Cron Recommendation

Run hourly. The function is idempotent per user and reminder window because it records `delivery_key` in `learning_reminder_deliveries`.

Suggested cadence:

- every hour on the hour
- use `dryRun` first in staging
- monitor failed deliveries before enabling production cron

## Notes

- Email reminders only send for users with `email_enabled = true`
- Browser reminders remain client-side
- Reminder scheduling uses the user's saved timezone, preferred hour, and weekly cadence settings
