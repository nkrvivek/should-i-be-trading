import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripe, getPriceMapping } from "../_shared/stripe.ts";
import { corsHeaders } from "../_shared/auth.ts";

// This function does NOT require JWT (Stripe sends raw webhook, no auth header)
// Set verify_jwt = false in supabase/config.toml for this function

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = getStripe();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  // CRITICAL: Read raw body as text for signature verification
  // Using req.json() would break the signature check
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Service role client (bypasses RLS for writing to subscriptions)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Atomic idempotency: INSERT with ON CONFLICT to prevent race conditions
  const { data: inserted, error: idempotencyError } = await supabaseAdmin
    .from("stripe_event_log")
    .upsert(
      { event_id: event.id, event_type: event.type },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id")
    .single();

  // If upsert returned no row, the event already existed (duplicate)
  if (!inserted || idempotencyError) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const priceMap = getPriceMapping();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const subscriptionId = session.subscription;

        if (userId && subscriptionId) {
          // Fetch the full subscription from Stripe
          const sub = await stripe.subscriptions.retrieve(subscriptionId as string);
          const priceId = sub.items.data[0]?.price?.id;
          const mapping = priceId ? priceMap[priceId] : null;

          await supabaseAdmin.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId as string,
            stripe_price_id: priceId,
            plan_tier: mapping?.tier ?? "pro",
            billing_interval: mapping?.interval ?? "month",
            status: sub.status === "trialing" ? "trialing" : "active",
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          }, { onConflict: "user_id" });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price?.id;
        const mapping = priceId ? priceMap[priceId] : null;

        // Determine tier based on subscription status
        let planTier = mapping?.tier ?? "pro";
        if (sub.status === "canceled" || sub.status === "unpaid") {
          planTier = "free";
        }

        await supabaseAdmin
          .from("subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            plan_tier: planTier,
            billing_interval: mapping?.interval ?? "month",
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_tier: "free",
            status: "canceled",
            cancel_at_period_end: false,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries the webhook
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
