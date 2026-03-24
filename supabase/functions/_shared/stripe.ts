import Stripe from "https://esm.sh/stripe@17?target=deno";

export function getStripe(): Stripe {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Map Stripe Price IDs to tier + interval */
export function getPriceMapping(): Record<string, { tier: string; interval: string }> {
  const map: Record<string, { tier: string; interval: string }> = {};

  const proMonthly = Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID");
  const proYearly = Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID");
  const entMonthly = Deno.env.get("STRIPE_ENT_MONTHLY_PRICE_ID");
  const entYearly = Deno.env.get("STRIPE_ENT_YEARLY_PRICE_ID");

  if (proMonthly) map[proMonthly] = { tier: "pro", interval: "month" };
  if (proYearly) map[proYearly] = { tier: "pro", interval: "year" };
  if (entMonthly) map[entMonthly] = { tier: "enterprise", interval: "month" };
  if (entYearly) map[entYearly] = { tier: "enterprise", interval: "year" };

  return map;
}

/** Get the Stripe Price ID for a tier + interval */
export function getPriceId(tier: string, interval: string): string {
  const key = `STRIPE_${tier === "enterprise" ? "ENT" : "PRO"}_${interval === "year" ? "YEARLY" : "MONTHLY"}_PRICE_ID`;
  const priceId = Deno.env.get(key);
  if (!priceId) throw new Error(`Missing env var: ${key}`);
  return priceId;
}
