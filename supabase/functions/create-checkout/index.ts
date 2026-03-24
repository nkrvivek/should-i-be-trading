import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { getStripe, getPriceId } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authenticateRequest(req);
    const { tier, interval } = await req.json();

    if (!["pro", "enterprise"].includes(tier)) {
      return errorResponse("Invalid tier. Must be 'pro' or 'enterprise'.");
    }
    if (!["month", "year"].includes(interval)) {
      return errorResponse("Invalid interval. Must be 'month' or 'year'.");
    }

    const stripe = getStripe();
    const priceId = getPriceId(tier, interval);

    // Use service role to read/write subscriptions (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check for existing Stripe customer
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", ctx.userId)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      // Get user email for Stripe customer creation
      const { data: { user } } = await ctx.supabase.auth.getUser();
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { supabase_user_id: ctx.userId },
      });
      customerId = customer.id;

      // Store the customer ID
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: ctx.userId,
        stripe_customer_id: customerId,
        plan_tier: "free",
        status: "active",
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: ctx.userId, tier },
      },
      success_url: `${req.headers.get("origin") ?? "https://sibt.ai"}/settings?checkout=success`,
      cancel_url: `${req.headers.get("origin") ?? "https://sibt.ai"}/pricing?checkout=canceled`,
      client_reference_id: ctx.userId,
    });

    return jsonResponse({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return errorResponse(message, 500);
  }
});
