import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySupabaseJWT } from "./jwt/default.ts";

export interface AuthContext {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

/**
 * Verify the user's JWT using Supabase JWKS (ES256/P-256).
 * Works with both legacy HS256 and new ES256 tokens.
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  // User token comes via x-user-token header (avoids gateway ES256 rejection)
  // Falls back to Authorization header for backward compatibility
  const userToken = req.headers.get("x-user-token");
  const authHeader = req.headers.get("Authorization");
  const token = userToken || (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null);

  if (!token) {
    throw new Error("Missing authentication token");
  }

  // Verify JWT using JWKS endpoint (handles ES256)
  const { payload } = await verifySupabaseJWT(token);

  const userId = payload.sub;
  if (!userId) {
    throw new Error("Token missing sub claim");
  }

  // Create a user-scoped client for RLS queries
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const publishableKey = Deno.env.get("SB_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return { userId, supabase };
}

/**
 * Get the user's stored credential for a provider.
 */
export async function getUserCredential(
  ctx: AuthContext,
  provider: string,
): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("user_credentials")
    .select("credential_data, is_valid")
    .eq("user_id", ctx.userId)
    .eq("provider", provider)
    .single();

  if (error || !data) {
    throw new Error(`No ${provider} credential found. Add your API key in Settings.`);
  }

  if (!data.is_valid) {
    throw new Error(`Your ${provider} credential is marked invalid. Please update it in Settings.`);
  }

  // Decrypt via database function if encryption is configured
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey) {
    try {
      const svc = createClient(supabaseUrl, serviceKey);
      const { data: decrypted } = await svc.rpc("decrypt_credential", { encrypted_text: data.credential_data });
      if (decrypted) return decrypted as string;
    } catch { /* decrypt_credential not available or no encryption key — use raw */ }
  }

  return data.credential_data;
}

/** Allowed origins for CORS */
const ALLOWED_ORIGINS = [
  "https://sibt.ai",
  "https://www.sibt.ai",
  "https://should-i-be-trading.pages.dev",
];

/** Build CORS headers with origin check. Falls back to first allowed origin. */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("Origin") ?? "";
  const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  const allowed = ALLOWED_ORIGINS.includes(origin) || isLocalhost;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Expose-Headers": "x-ai-used, x-ai-limit",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

/** Validate origin against allowed list. Returns a safe origin for redirect URLs. */
export function getValidatedOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  if (ALLOWED_ORIGINS.includes(origin) || isLocalhost) {
    return origin;
  }
  return ALLOWED_ORIGINS[0]; // default to "https://sibt.ai"
}

/** Standard CORS headers (legacy — use getCorsHeaders(req) for origin-checked headers) */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sibt.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-ai-used, x-ai-limit",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Create a JSON response with CORS headers */
export function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  const cors = req ? getCorsHeaders(req) : corsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Create an error response */
export function errorResponse(message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}
