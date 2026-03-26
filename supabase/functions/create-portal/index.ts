import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const ctx = await authenticateRequest(req);
    const stripe = getStripe();

    // Use service role to read subscriptions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", ctx.userId)
      .single();

    if (!sub?.stripe_customer_id) {
      return errorResponse("No active subscription found. Subscribe first.", 404, req);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.headers.get("origin") ?? "https://sibt.ai"}/settings`,
    });

    return jsonResponse({ url: session.url }, 200, req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal creation failed";
    return errorResponse(message, 500, req);
  }
});
