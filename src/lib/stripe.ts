import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY!,
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  elite_monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY!,
  elite_yearly: process.env.STRIPE_PRICE_ELITE_YEARLY!,
} as const;
