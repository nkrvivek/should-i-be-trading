-- Enable pgcrypto for server-side credential encryption
create extension if not exists pgcrypto;

-- Helper: encrypt credential data before storage
-- Usage: UPDATE user_credentials SET credential_data = encrypt_credential('raw-api-key')
create or replace function public.encrypt_credential(raw_text text)
returns text as $$
declare
  enc_key text;
begin
  enc_key := current_setting('app.credential_encryption_key', true);
  if enc_key is null or enc_key = '' then
    -- No encryption key configured — store as-is (dev environments)
    return raw_text;
  end if;
  return encode(pgp_sym_encrypt(raw_text, enc_key), 'base64');
end;
$$ language plpgsql security definer;

-- Helper: decrypt credential data on retrieval
create or replace function public.decrypt_credential(encrypted_text text)
returns text as $$
declare
  enc_key text;
begin
  enc_key := current_setting('app.credential_encryption_key', true);
  if enc_key is null or enc_key = '' then
    return encrypted_text;
  end if;
  -- Try decryption; if it fails (plaintext data), return as-is
  begin
    return pgp_sym_decrypt(decode(encrypted_text, 'base64'), enc_key);
  exception when others then
    return encrypted_text;
  end;
end;
$$ language plpgsql security definer;
