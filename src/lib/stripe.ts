import Stripe from "stripe";
import type { PlanType } from "@/lib/utils";

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  return value.includes("...") || value.endsWith("_");
}

function isValidSecretKey(key?: string): boolean {
  return !!(
    key &&
    !isPlaceholder(key) &&
    (key.startsWith("sk_test_") || key.startsWith("sk_live_")) &&
    key.length > 20
  );
}

function isValidPriceId(priceId?: string): boolean {
  return !!(
    priceId &&
    !isPlaceholder(priceId) &&
    priceId.startsWith("price_") &&
    priceId.length > 12
  );
}

export const stripe = isValidSecretKey(process.env.STRIPE_SECRET_KEY)
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    })
  : null;

const PRICE_IDS: Record<"pro" | "business", string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
};

export function isStripeConfigured(): boolean {
  return (
    isPlanCheckoutReady("pro") || isPlanCheckoutReady("business")
  );
}

export function isPlanCheckoutReady(plan: "pro" | "business"): boolean {
  return !!(stripe && isValidPriceId(PRICE_IDS[plan]));
}

export function getStripeConfigStatus() {
  return {
    configured: isStripeConfigured(),
    hasSecretKey: isValidSecretKey(process.env.STRIPE_SECRET_KEY),
    hasProPrice: isValidPriceId(PRICE_IDS.pro),
    hasBusinessPrice: isValidPriceId(PRICE_IDS.business),
    usingPlaceholders:
      isPlaceholder(process.env.STRIPE_SECRET_KEY) ||
      isPlaceholder(process.env.STRIPE_PRO_PRICE_ID) ||
      isPlaceholder(process.env.STRIPE_BUSINESS_PRICE_ID),
  };
}

export function getPriceIdForPlan(plan: "pro" | "business"): string {
  const priceId = PRICE_IDS[plan];
  if (!isValidPriceId(priceId)) {
    throw new Error(
      `STRIPE_${plan.toUpperCase()}_PRICE_ID is missing or still a placeholder in .env.local`
    );
  }
  return priceId!;
}

export function planFromPriceId(priceId: string): PlanType {
  if (priceId === PRICE_IDS.business) return "business";
  if (priceId === PRICE_IDS.pro) return "pro";
  return "free";
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  plan: "pro" | "business"
) {
  if (!stripe) {
    throw new Error(
      "STRIPE_SECRET_KEY is missing or invalid. Use a real key from Stripe Dashboard → Developers → API keys"
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings?success=true&plan=${plan}`,
    cancel_url: `${appUrl}/dashboard/settings?cancelled=true`,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
  });
}

export async function createStripeCustomer(email: string, name?: string) {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.customers.create({ email, name: name ?? undefined });
}

export async function createBillingPortalSession(customerId: string) {
  if (!stripe) throw new Error("Stripe is not configured");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/settings`,
  });
}
