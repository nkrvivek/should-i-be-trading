-- 019_encryption_key_via_vault.sql
--
-- Deploy finding (2026-07-22, sibt-staging bring-up): new Supabase projects
-- deny BOTH `alter database ... set app.credential_encryption_key` AND
-- role-level `alter role ... set` for custom GUCs — the 018 key-delivery
-- path (a persisted database setting) cannot be configured at all on a
-- fresh project. 018's loud-fail behaved exactly as designed (every
-- encrypt/decrypt raised rather than degrade to plaintext — verified live
-- on hoazewfoeddyoldaglpf), so this migration changes only WHERE the key
-- comes from, not the fail-closed contract:
--
--   1. `current_setting('app.credential_encryption_key', true)` first —
--      preserves old projects / self-hosted / local `supabase start`, where
--      the GUC path still works and is already configured.
--   2. Supabase Vault fallback — `vault.decrypted_secrets` row named
--      'credential_encryption_key' (the supported secret store on current
--      projects; store it once with:
--        select vault.create_secret('<key>', 'credential_encryption_key');
--      ).
--   3. Neither present → raise. Same loud-fail as 018, same messages.
--
-- Both fns stay SECURITY DEFINER (owner has vault read access; callers
-- never gain direct vault.decrypted_secrets visibility).

create or replace function public._credential_encryption_key()
returns text as $$
declare
  enc_key text;
begin
  enc_key := current_setting('app.credential_encryption_key', true);
  if enc_key is not null and enc_key <> '' then
    return enc_key;
  end if;
  begin
    select decrypted_secret into enc_key
      from vault.decrypted_secrets
     where name = 'credential_encryption_key'
     limit 1;
  exception when others then
    -- vault extension absent (old project) — fall through to the raise below.
    enc_key := null;
  end;
  if enc_key is null or enc_key = '' then
    return null;
  end if;
  return enc_key;
end;
$$ language plpgsql security definer;

-- Not callable by API roles — internal helper for the two fns below.
revoke all on function public._credential_encryption_key() from public, anon, authenticated;

create or replace function public.encrypt_credential(raw_text text)
returns text as $$
declare
  enc_key text;
begin
  enc_key := public._credential_encryption_key();
  if enc_key is null then
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
  enc_key := public._credential_encryption_key();
  if enc_key is null then
    raise exception 'app.credential_encryption_key is not set — refusing to decrypt (or pass through) a stored credential. Set the key (see docs/deploy-checklist.md) before reading broker connections.';
  end if;
  -- No catch-all — a bad payload or wrong key surfaces as a real error.
  return pgp_sym_decrypt(decode(encrypted_text, 'base64'), enc_key);
end;
$$ language plpgsql security definer;

create or replace function public.assert_credential_encryption_key_set()
returns boolean as $$
begin
  if public._credential_encryption_key() is null then
    raise exception 'app.credential_encryption_key is not set on this database — set it before serving any broker-connection traffic.';
  end if;
  return true;
end;
$$ language plpgsql security definer;

-- Self-test mirrors 018's: with no GUC and no vault row this DO block can't
-- prove a round-trip, so it only asserts the fail-closed side when the key
-- is absent, and the round-trip when one IS available.
do $$
declare
  ok boolean;
  probe text;
begin
  begin
    ok := public.assert_credential_encryption_key_set();
  exception when others then
    ok := false;
  end;
  if ok then
    probe := public.decrypt_credential(public.encrypt_credential('migration-019-self-test'));
    if probe <> 'migration-019-self-test' then
      raise exception 'migration 019 self-test FAILED: round-trip mismatch';
    end if;
    raise notice 'migration 019 self-test passed: key available, round-trip ok.';
  else
    begin
      probe := public.encrypt_credential('migration-019-self-test');
      raise exception 'migration 019 self-test FAILED: encrypt_credential did not raise with no key configured';
    exception when raise_exception then
      raise notice 'migration 019 self-test passed: no key configured, encrypt_credential raises (fail-closed).';
    end;
  end if;
end $$;
