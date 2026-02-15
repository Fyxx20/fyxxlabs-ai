import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";

type PriceKey = keyof typeof PRICE_IDS;

function isSupportedPriceKey(value: string): value is PriceKey {
  return value in PRICE_IDS;
}

function isOneTime(priceKey: PriceKey): boolean {
  return priceKey === "create_one_time";
}

function getPlanFromPriceKey(priceKey: PriceKey): "create" | "pro" | "elite" {
  if (priceKey === "create_one_time") return "create";
  if (priceKey.startsWith("elite_") || priceKey.startsWith("agence_")) return "elite";
  return "pro";
}

function getIntervalFromPriceKey(priceKey: PriceKey): "month" | "year" | "one_time" {
  if (priceKey === "create_one_time") return "one_time";
  return priceKey.endsWith("_yearly") ? "year" : "month";
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawPriceKey = formData.get("price_key");
  if (typeof rawPriceKey !== "string" || !rawPriceKey) {
    return NextResponse.json({ error: "Tarif invalide" }, { status: 400 });
  }
  if (!isSupportedPriceKey(rawPriceKey)) {
    return NextResponse.json({ error: "Tarif non reconnu" }, { status: 400 });
  }
  const priceKey: PriceKey = rawPriceKey;

  const priceId = PRICE_IDS[priceKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `Tarif indisponible: ${priceKey}. Vérifie la configuration Stripe.` },
      { status: 400 }
    );
  }
  const plan = getPlanFromPriceKey(priceKey);
  const interval = getIntervalFromPriceKey(priceKey);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, plan, status")
    .eq("user_id", user.id)
    .single();

  let customerId = sub?.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id);
  }

  const oneTime = isOneTime(priceKey);
  const hasAnyPaidHistory = Boolean(sub?.stripe_subscription_id) || ["starter", "pro", "elite", "create", "lifetime"].includes((sub?.plan ?? "").toLowerCase());
  const shouldApplyFirstOffer = !oneTime && !hasAnyPaidHistory && Boolean(process.env.STRIPE_COUPON_FIRST_TRIAL_50);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: oneTime ? "payment" : "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin")}/app/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin")}/app/billing`,
    metadata: { user_id: user.id, plan_key: plan, billing_interval: interval },
    ...(shouldApplyFirstOffer
      ? {
          discounts: [{ coupon: process.env.STRIPE_COUPON_FIRST_TRIAL_50! }],
        }
      : {}),
    ...(oneTime
      ? {}
      : {
          allow_promotion_codes: true,
          subscription_data: {
            metadata: { user_id: user.id, plan_key: plan, billing_interval: interval },
            trial_period_days: undefined,
          },
        }),
  });

  if (!session.url) {
    return NextResponse.json({ error: "Impossible de créer la session" }, { status: 500 });
  }
  // Use 303 See Other to force GET after POST (307 preserves POST → Stripe 403)
  return NextResponse.redirect(session.url, 303);
}
