import { callEdgeFunction } from "./edgeFunction";

/** Redirect user to Stripe Checkout for a subscription */
export async function redirectToCheckout(
  tier: "starter" | "pro" | "enterprise",
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
