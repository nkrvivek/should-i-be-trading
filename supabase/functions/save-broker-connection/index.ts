/**
 * save-broker-connection — WS3a (docs/relaunch-plan-2026-07.md Phase 2).
 *
 * Server-side broker-connection store. Today (see generate-proposals/
 * index.ts's doc comment) SnapTrade userId/userSecret live only in the
 * browser and are passed on every proposal-generation call. This function
 * accepts those same values once, encrypts the secret, and stores the
 * connection server-side so a later workstream can run proposal generation
 * or execution without the browser open.
 *
 * Encryption mirrors user_credentials exactly (011_encrypt_credentials.sql's
 * encrypt_credential/decrypt_credential pgcrypto RPCs — the same ones
 * supabase/functions/_shared/auth.ts's getUserCredential already calls to
 * decrypt). The one adaptation from that established pattern: for
 * user_credentials, the CLIENT calls encrypt_credential directly before
 * writing (see src/hooks/useUserCredentials.ts's saveCredential), because
 * RLS lets a user insert their own credential row. broker_connections has no
 * such insert policy (015_broker_connections.sql — service_role only, by
 * design, since these are brokerage secrets), so this function calls
 * encrypt_credential server-side, via a service-role client, instead.
 */

import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const ACCOUNT_ID_RE = /^[a-zA-Z0-9-]{1,64}$/;
const SNAP_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

interface SaveBrokerConnectionBody {
  snaptrade_user_id?: string;
  snaptrade_user_secret?: string;
  account_id?: string;
  label?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  try {
    const auth = await authenticateRequest(req);

    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 10_000) {
      return errorResponse("Request too large", 413, req);
    }

    const body = (await req.json().catch(() => ({}))) as SaveBrokerConnectionBody;
    const { snaptrade_user_id, snaptrade_user_secret, account_id, label } = body;

    if (!snaptrade_user_id || !snaptrade_user_secret) {
      return errorResponse("Missing snaptrade_user_id or snaptrade_user_secret", 400, req);
    }
    if (typeof snaptrade_user_id !== "string" || !SNAP_ID_RE.test(snaptrade_user_id)) {
      return errorResponse("Invalid snaptrade_user_id format", 400, req);
    }
    if (typeof snaptrade_user_secret !== "string" || snaptrade_user_secret.length < 5 || snaptrade_user_secret.length > 500) {
      return errorResponse("Invalid snaptrade_user_secret format", 400, req);
    }
    if (account_id !== undefined && (typeof account_id !== "string" || !ACCOUNT_ID_RE.test(account_id))) {
      return errorResponse("Invalid account_id format", 400, req);
    }
    if (label !== undefined && (typeof label !== "string" || label.length > 200)) {
      return errorResponse("Invalid label format", 400, req);
    }

    const svc = getServiceClient();

    // Encrypt via the same DB function user_credentials already uses
    // (011_encrypt_credentials.sql, hardened by 018_require_credential_
    // encryption_key.sql) — never store the raw secret. encrypt_credential
    // now raises when no encryption key is configured rather than silently
    // returning plaintext, so a missing key surfaces here as encErr; there
    // is no plaintext fallback — fail closed and do not store anything.
    const { data: encrypted, error: encErr } = await svc.rpc("encrypt_credential", {
      raw_text: snaptrade_user_secret,
    });
    if (encErr || !encrypted) {
      console.error("encrypt_credential failed in save-broker-connection:", encErr?.message ?? "empty result");
      return errorResponse("Failed to encrypt credential — connection was not saved", 500, req);
    }
    const encryptedSecret = encrypted as string;

    const { data: connRow, error: upsertErr } = await svc
      .from("broker_connections")
      .upsert(
        {
          user_id: auth.userId,
          provider: "snaptrade",
          snaptrade_user_id,
          snaptrade_user_secret_encrypted: encryptedSecret,
          account_id: account_id ?? null,
          label: label ?? null,
        },
        { onConflict: "user_id,provider" },
      )
      .select("id")
      .single();

    if (upsertErr || !connRow) {
      return errorResponse(`Failed to save broker connection: ${upsertErr?.message ?? "unknown error"}`, 500, req);
    }

    const connectionId = (connRow as { id: string }).id;

    // execution_settings.broker_connection_id is a plain text column (see
    // 014_copilot_proposals.sql) — write the new uuid's string form, don't
    // alter that column's type.
    const { error: settingsErr } = await svc
      .from("execution_settings")
      .upsert({ user_id: auth.userId, broker_connection_id: connectionId }, { onConflict: "user_id" });
    if (settingsErr) {
      return errorResponse(`Saved connection but failed to update execution settings: ${settingsErr.message}`, 500, req);
    }

    return jsonResponse({ ok: true, id: connectionId }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "save-broker-connection error";
    const sanitizedMsg = String(sanitizeError(msg));
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(sanitizedMsg, 401, req);
    }
    return errorResponse(sanitizedMsg, 500, req);
  }
});
