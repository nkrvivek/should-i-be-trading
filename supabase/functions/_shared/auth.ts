import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

/**
 * Verify the Supabase JWT from the Authorization header and return user context.
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  // User token can come from x-user-token header (preferred, avoids gateway ES256 rejection)
  // or from Authorization header (legacy)
  const userToken = req.headers.get("x-user-token");
  const authHeader = req.headers.get("Authorization");

  const token = userToken || (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null);

  if (!token) {
    throw new Error("Missing authentication. Send user token via x-user-token header.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Use service role to verify the user's JWT
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error } = await adminClient.auth.getUser(token);

  if (error || !user) {
    throw new Error(`Auth failed: ${error?.message ?? "Invalid token"}`);
  }

  // Create a user-scoped client for RLS queries
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return { userId: user.id, supabase: userClient };
}

/**
 * Get the user's stored credential for a provider.
 * Returns the raw credential_data string.
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

  return data.credential_data;
}

/** Standard CORS headers for edge functions */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
};

/** Create a JSON response with CORS headers */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Create an error response */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
