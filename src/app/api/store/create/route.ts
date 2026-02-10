import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createStoreSchema } from "@/lib/validations/store";
import { getEntitlements } from "@/lib/auth/entitlements";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_started_at, trial_ends_at, scans_used")
    .eq("user_id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  const entitlements = getEntitlements(profile ?? null, subscription ?? null);

  const { count: storesCount } = await supabase
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    ;

  const limitByPlan =
    entitlements.plan === "pro"
      ? 3
      : entitlements.plan === "elite" || entitlements.plan === "lifetime"
        ? null
        : 1;

  if (limitByPlan !== null && (storesCount ?? 0) >= limitByPlan) {
    return NextResponse.json(
      {
        error: "store_limit_reached",
        message:
          limitByPlan === 1
            ? "Ton abonnement permet 1 seule boutique. Passe au plan supérieur pour en ajouter."
            : `Ton abonnement permet jusqu'à ${limitByPlan} boutiques.`,
        limit: limitByPlan,
        current: storesCount ?? 0,
        plan: entitlements.plan,
      },
      { status: 409 }
    );
  }

  const payload = {
    user_id: user.id,
    name: parsed.data.name,
    website_url: parsed.data.website_url,
    goal: parsed.data.goal,
    platform: parsed.data.platform ?? "unknown",
    stage: parsed.data.stage ?? "unknown",
    traffic_source: parsed.data.traffic_source ?? "unknown",
    aov_bucket: parsed.data.aov_bucket ?? "unknown",
    country: parsed.data.country ?? "FR",
  };

  const { data: store, error } = await supabase
    .from("stores")
    .insert(payload)
    .select("id, name, website_url, goal, created_at")
    .single();

  if (error) {
    if (error.code === "23505" || error.message?.includes("stores_one_per_user")) {
      return NextResponse.json(
        { error: "store_limit_reached", message: "Limite de boutiques atteinte pour ton plan." },
        { status: 409 }
      );
    }
    const message =
      error.code === "42P01" || error.message?.includes("schema cache") || error.message?.includes("does not exist")
        ? "Base non initialisée : applique les migrations Supabase ou vérifie les variables d'environnement."
        : error.message;
    return NextResponse.json(
      { error: message, code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json(store);
}
