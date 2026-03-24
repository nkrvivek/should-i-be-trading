import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Edge function ${name} failed`);
  }

  return res.json();
}

/** Redirect user to Stripe Checkout for a subscription */
export async function redirectToCheckout(
  tier: "pro" | "enterprise",
  interval: "month" | "year",
) {
  const { url } = await callEdgeFunction("create-checkout", { tier, interval });
  window.location.href = url;
}

/** Redirect user to Stripe Customer Portal to manage their subscription */
export async function redirectToPortal() {
  const { url } = await callEdgeFunction("create-portal", {});
  window.location.href = url;
}
