import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";

type PriceKey = keyof typeof PRICE_IDS;

function getPlanFromPriceKey(priceKey: PriceKey): "starter" | "pro" | "elite" {
  if (priceKey.startsWith("starter_")) return "starter";
  if (priceKey.startsWith("elite_")) return "elite";
  return "pro";
}

function getIntervalFromPriceKey(priceKey: PriceKey): "month" | "year" {
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
  const priceKey = formData.get("price_key") as PriceKey | null;
  if (!priceKey) {
    return NextResponse.json({ error: "Tarif invalide" }, { status: 400 });
  }
  const priceId = PRICE_IDS[priceKey];
  if (!priceId) {
    return NextResponse.json({ error: "Tarif invalide" }, { status: 400 });
  }
  const plan = getPlanFromPriceKey(priceKey);
  const interval = getIntervalFromPriceKey(priceKey);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin")}/app/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin")}/app/billing`,
    metadata: { user_id: user.id, plan_key: plan, billing_interval: interval },
    subscription_data: {
      metadata: { user_id: user.id, plan_key: plan, billing_interval: interval },
      trial_period_days: undefined,
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Impossible de créer la session" }, { status: 500 });
  }
  // Use 303 See Other to force GET after POST (307 preserves POST → Stripe 403)
  return NextResponse.redirect(session.url, 303);
}
