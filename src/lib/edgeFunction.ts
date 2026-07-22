import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Shared authed-fetch pattern for calling Supabase edge functions from the
 * client. Originally lived in stripe.ts — extracted so proposalActions.ts
 * (and any future caller) can reuse it instead of duplicating the fetch
 * plumbing.
 *
 * Gateway requires the HS256 anon key in Authorization for functions with
 * verify_jwt. For --no-verify-jwt functions, the user's own token rides in
 * x-user-token, which the function verifies itself.
 */
export async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-user-token": session.access_token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Edge function ${name} failed`);
  }

  return res.json();
}
