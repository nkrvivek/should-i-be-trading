-- 018_require_credential_encryption_key.sql
--
-- Launch-blocker fix (2026-07-22 audit): 011_encrypt_credentials.sql's
-- encrypt_credential/decrypt_credential silently fall back to plaintext
-- when app.credential_encryption_key is unset — a broker credential saved
-- while the key is missing (e.g. right after a Supabase project restore,
-- before the key is re-applied) gets stored and returned in the clear with
-- no error anywhere. This migration replaces both function bodies
-- (create or replace — 011 is never edited directly; the Supabase project
-- is paused/restore-pending and only new numbered migrations are added) so
-- both raise instead of silently degrading.
--
-- decrypt_credential also drops 011's `exception when others then return
-- encrypted_text` catch-all: that clause doesn't only cover the missing-key
-- case, it also masks a genuine decrypt failure (wrong key, corrupt
-- payload) by handing back the still-encrypted text as if it were the
-- secret — worth flagging explicitly, since any credential rows written
-- while the old code's plaintext fallback was live now need identifying and
-- rotating (see docs/deploy-checklist.md) rather than silently continuing
-- to round-trip as plaintext forever.

create or replace function public.encrypt_credential(raw_text text)
returns text as $$
declare
  enc_key text;
begin
  enc_key := current_setting('app.credential_encryption_key', true);
  if enc_key is null or enc_key = '' then
    raise exception 'app.credential_encryption_key is not set — refusing to store a credential in plaintext. Set the key (see docs/deploy-checklist.md) before saving broker connections.';
  end if;
  return encode(pgp_sym_encrypt(raw_text, enc_key), 'base64');
end;
$$ language plpgsql security definer;

create or replace function public.decrypt_credential(encrypted_text text)
returns text as $$
declare
  enc_key text;
begin
  enc_key := current_setting('app.credential_encryption_key', true);
  if enc_key is null or enc_key = '' then
    raise exception 'app.credential_encryption_key is not set — refusing to decrypt (or pass through) a stored credential. Set the key (see docs/deploy-checklist.md) before reading broker connections.';
  end if;
  -- No catch-all here — a bad base64 payload or a wrong key must surface as
  -- a real error, not the silent plaintext pass-through 011 had.
  return pgp_sym_decrypt(decode(encrypted_text, 'base64'), enc_key);
end;
$$ language plpgsql security definer;

-- Health check for the post-restore verification step in
-- docs/deploy-checklist.md — call once after any Supabase project restore
-- to prove the encryption key made it back into the restored environment
-- before any broker connection is saved or read against it.
create or replace function public.assert_credential_encryption_key_set()
returns boolean as $$
declare
  enc_key text;
begin
  enc_key := current_setting('app.credential_encryption_key', true);
  if enc_key is null or enc_key = '' then
    raise exception 'app.credential_encryption_key is not set on this database — set it before serving any broker-connection traffic.';
  end if;
  return true;
end;
$$ language plpgsql security definer;

-- ── Self-test (no pgTAP in this repo) ───────────────────────────────────
-- Runs once, at migration time, inside this migration's own transaction.
-- set_config(..., is_local => true) scopes every change below to this
-- transaction only — it never touches, requires, or leaks the real
-- app.credential_encryption_key, and reverts automatically when the
-- migration's transaction ends.
do $$
declare
  test_key text := 'sibt_migration_018_self_test_key_do_not_use_in_prod';
  round_tripped text;
  raised boolean;
begin
  -- 1. Round-trip still works when a key is set.
  perform set_config('app.credential_encryption_key', test_key, true);
  round_tripped := public.decrypt_credential(public.encrypt_credential('self-test-plaintext'));
  if round_tripped is distinct from 'self-test-plaintext' then
    raise exception 'migration 018 self-test failed: encrypt/decrypt round-trip did not return the original plaintext (got %)', round_tripped;
  end if;

  -- 2. encrypt_credential raises loudly with no key set.
  perform set_config('app.credential_encryption_key', '', true);
  raised := false;
  begin
    perform public.encrypt_credential('should-never-be-stored-plaintext');
  exception when others then
    raised := true;
  end;
  if not raised then
    raise exception 'migration 018 self-test failed: encrypt_credential did not raise with an empty key';
  end if;

  -- 3. decrypt_credential raises loudly with no key set.
  raised := false;
  begin
    perform public.decrypt_credential('anything');
  exception when others then
    raised := true;
  end;
  if not raised then
    raise exception 'migration 018 self-test failed: decrypt_credential did not raise with an empty key';
  end if;

  raise notice 'migration 018 self-test passed: round-trip ok with a key set; both fns raise with no key set.';
end;
$$;
