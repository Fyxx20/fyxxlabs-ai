import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

export const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY!,
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  elite_monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY!,
  elite_yearly: process.env.STRIPE_PRICE_ELITE_YEARLY!,
} as const;
