import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeStripePlan(plan: string | null | undefined): "create" | "starter" | "pro" | "elite" | "lifetime" | "free" {
  const p = (plan ?? "").toLowerCase();
  if (p === "create") return "create";
  if (p === "starter") return "starter";
  if (p === "elite" || p === "business" || p === "agence") return "elite";
  if (p === "lifetime") return "lifetime";
  if (p === "free") return "free";
  return "pro";
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? null;
      const plan = normalizeStripePlan(session.metadata?.plan_key);
      let subId: string | null = null;
      if (typeof session.subscription === "string") {
        subId = session.subscription;
      } else if (session.subscription && typeof session.subscription === "object") {
        subId = (session.subscription as Stripe.Subscription).id;
      }
      const customerId = session.customer as string;
      if (!userId || !customerId) break;
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          advice_consumed: false,
        })
        .eq("user_id", userId);
      await supabaseAdmin
        .from("profiles")
        .update({ plan })
        .eq("user_id", userId);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string;
      if (!subId) break;
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subId)
        .single();
      if (sub) {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", sub.user_id);
      }
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;
      const status =
        subscription.status === "active"
          ? "active"
          : subscription.status === "past_due"
            ? "past_due"
            : "canceled";
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const { data: subRow } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subId)
        .single();
      const updates: { status: string; current_period_end: string | null; plan?: string } = {
        status: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
        current_period_end: periodEnd,
      };
      if (subscription.status === "active") {
        const planFromMetadata = normalizeStripePlan(subscription.metadata?.plan_key);
        updates.plan = planFromMetadata;
      }
      if (status === "canceled") updates.plan = "free";
      await supabaseAdmin.from("subscriptions").update(updates).eq("stripe_subscription_id", subId);
      if (subRow?.user_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ plan: status === "canceled" ? "free" : (updates.plan ?? "pro") })
          .eq("user_id", subRow.user_id);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
