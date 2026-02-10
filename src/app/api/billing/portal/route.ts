import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  const customerId = sub?.stripe_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json(
      { error: "Aucun abonnement lié" },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin")}/app/billing`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Impossible de créer la session" }, { status: 500 });
  }
  return NextResponse.redirect(session.url);
}
