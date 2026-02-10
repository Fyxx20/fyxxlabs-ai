import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getEntitlements, assertCanScan, PaywallError, PAYWALL_SCAN_LIMIT } from "@/lib/auth/entitlements";
import { canShowPaywall } from "@/lib/paywall/paywallRules";
import { runScanInBackground } from "@/lib/scan/runScanInBackground";

/** Comptes sans limite : scan illimité, pas de délai 10 min ni plafond jour */
const UNLIMITED_SCAN_EMAILS = ["m.harea@storepilot.ia"].map((e) => e.toLowerCase());

function hasUnlimitedScans(email: string | undefined): boolean {
  if (!email) return false;
  return UNLIMITED_SCAN_EMAILS.includes(email.toLowerCase());
}

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { store_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const storeId = body.store_id;
  if (!storeId) {
    return NextResponse.json({ error: "store_id requis" }, { status: 400 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id, website_url, goal, platform, country, stage, traffic_source, aov_bucket")
    .eq("id", storeId)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_started_at, trial_ends_at, scans_used, last_paywall_shown_at, paywall_show_day, paywall_show_count_today")
    .eq("user_id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  try {
    assertCanScan(profile ?? null, subscription ?? null);
  } catch (err) {
    if (err instanceof PaywallError && err.code === PAYWALL_SCAN_LIMIT) {
      const showPaywall = canShowPaywall(profile ?? null);
      return NextResponse.json(
        { error: err.message, code: PAYWALL_SCAN_LIMIT, show_paywall: showPaywall },
        { status: 403 }
      );
    }
    throw err;
  }

  const entitlements = getEntitlements(profile ?? null, subscription ?? null);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const unlimitedScans = hasUnlimitedScans(user.email);

  if (!unlimitedScans && entitlements.scanLimitPerDay !== null && entitlements.scanLimitPerDay > 0) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count: scansToday } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", todayStart.toISOString());
    if ((scansToday ?? 0) >= entitlements.scanLimitPerDay) {
      return NextResponse.json(
        { error: `Maximum ${entitlements.scanLimitPerDay} scans par jour pour ton abonnement.` },
        { status: 429 }
      );
    }
  }

  let scan: { id: string } | null = null;

  const insertPayload: { store_id: string; status: string; progress?: number; step?: string } = {
    store_id: storeId,
    status: "queued",
    progress: 0,
    step: "QUEUED",
  };

  const result = await supabase
    .from("scans")
    .insert(insertPayload)
    .select("id")
    .single();

  if (result.error) {
    const msg = result.error.message ?? "";
    const missingColumn = /progress|step|column.*scans/i.test(msg);
    if (missingColumn) {
      const fallback = await supabase
        .from("scans")
        .insert({ store_id: storeId, status: "queued" })
        .select("id")
        .single();
      if (fallback.error || !fallback.data) {
        return NextResponse.json(
          { error: fallback.error?.message ?? "Erreur création scan. Applique la migration 012 (colonnes progress, step)." },
          { status: 500 }
        );
      }
      scan = fallback.data;
    } else {
      return NextResponse.json(
        { error: result.error.message ?? "Erreur création scan" },
        { status: 500 }
      );
    }
  } else {
    scan = result.data;
  }

  if (!scan) {
    return NextResponse.json({ error: "Erreur création scan" }, { status: 500 });
  }

  try {
    await admin.from("scan_events").insert({
      scan_id: scan.id,
      type: "info",
      message: "Scan créé. Démarrage en cours…",
    });
  } catch {
    // Table scan_events peut être absente si migration 012 non appliquée
  }

  void runScanInBackground(scan.id, {
    userId: user.id,
    isPro: entitlements.isPro,
  });

  return NextResponse.json({ id: scan.id, status: "queued" });
}
