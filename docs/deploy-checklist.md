# Deploy checklist

Steps to run whenever the Supabase project is restored (from pause, backup,
or a new environment) before it serves real traffic.

## 1. Credential encryption key (required — blocks broker connections)

`encrypt_credential`/`decrypt_credential`
(`supabase/migrations/011_encrypt_credentials.sql`, hardened by
`018_require_credential_encryption_key.sql`) both raise when
`app.credential_encryption_key` is unset. Nothing plaintext gets stored or
returned, but the flip side is: without the key, saving or reading any
broker connection fails outright. Run these in order after every restore:

1. Set the key on the restored database:
   ```sql
   alter database postgres set app.credential_encryption_key = '<the real key>';
   ```
   (Or via the Supabase dashboard: Project Settings → Database → Custom
   Postgres config.) Get the key value from wherever it's stored outside the
   database — a secrets manager or the previous environment's config export.
   Never commit it to the repo.

2. Verify it took, in a fresh connection (a `set` in the same session that
   ran step 1 won't prove it persisted):
   ```sql
   select public.assert_credential_encryption_key_set();
   ```
   Expect `true`. Any error here means step 1 didn't take — do not proceed
   to step 3 until this passes.

3. Round-trip check with a throwaway value (never a real credential):
   ```sql
   select public.decrypt_credential(public.encrypt_credential('deploy-checklist-smoke-test'));
   ```
   Expect the same string back. An error means the key is set but wrong
   (doesn't match whatever encrypted the existing `broker_connections` rows)
   — existing rows will fail to decrypt until the correct key is restored.

4. If any `broker_connections` rows were written before this environment's
   key was set at all (only possible under the old, pre-018 fallback
   behavior — 018 no longer allows it going forward): identify them and have
   affected users reconnect their brokerage. There is no way to recover a
   credential that was genuinely stored in plaintext without the original
   key; do not attempt to "migrate" it — ask the user to reconnect instead.

## 2. Migrations

Apply `supabase/migrations/*.sql` in numeric order. Confirm the highest
applied migration number matches the highest file in the directory before
serving traffic.

## 3. Edge function secrets

Confirm these are set in the restored project (Project Settings → Edge
Functions → Secrets) before any function that reads them is invoked:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MAGIC_LINK_SECRET`,
`SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_KEY`, and any broker/data-vendor
keys the deployed functions call (Tradier, Finnhub, etc.).
