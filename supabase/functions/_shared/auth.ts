import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

/**
 * Verify the Supabase JWT from the Authorization header and return user context.
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error("Invalid or expired token");
  }

  return { userId: user.id, supabase };
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
