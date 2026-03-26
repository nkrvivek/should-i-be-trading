/**
 * Shared helper to build authenticated headers for Supabase edge function calls.
 *
 * All edge functions now require user authentication via x-user-token.
 * The anon key is still needed for the Supabase gateway, but the user's
 * JWT is sent via x-user-token for the function's authenticateRequest().
 */

import { supabase } from "../lib/supabase";

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

/**
 * Get the current user's access token, with a 30-second cache to avoid
 * repeated getSession() calls during rapid API bursts.
 */
async function getUserToken(): Promise<string | null> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      _cachedToken = session.access_token;
      _tokenExpiry = Date.now() + 30_000; // Cache for 30s
      return _cachedToken;
    }
  } catch {
    // No session
  }
  return null;
}

/**
 * Build headers for edge function calls.
 * Includes anon key for gateway + user JWT for auth.
 */
export async function getEdgeHeaders(): Promise<Record<string, string>> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };

  const token = await getUserToken();
  if (token) {
    headers["x-user-token"] = token;
  }

  return headers;
}

/** Clear cached token (call on sign out) */
export function clearTokenCache() {
  _cachedToken = null;
  _tokenExpiry = 0;
}
