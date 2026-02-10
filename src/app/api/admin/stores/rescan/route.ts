import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";
import { runScanPipeline } from "@/lib/scan/pipeline";

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { store_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const storeId = body.store_id;
  if (!storeId) return NextResponse.json({ error: "store_id requis" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: store } = await admin.from("stores").select("id, user_id, website_url, goal").eq("id", storeId).single();
  if (!store) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const { data: scanRow, error: insertError } = await admin
    .from("scans")
    .insert({
      store_id: storeId,
      user_id: store.user_id,
      status: "queued",
    })
    .select("id")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "scan.admin_rescan",
    target_type: "scan",
    target_id: scanRow.id,
    after_state: { store_id: storeId, status: "queued" },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  try {
    const result = await runScanPipeline(store.website_url, store.goal, false);
    await admin
      .from("scans")
      .update({
        status: "succeeded",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        score_global: result.scoreGlobal,
        scores_json: result.scoresJson as unknown as Record<string, unknown>,
        issues_json: result.issuesJson as unknown as Record<string, unknown>,
        trial_single_advice: result.trialSingleAdvice,
        scan_data_json: result.scanData as unknown as Record<string, unknown>,
        summary: result.summary ?? null,
      })
      .eq("id", scanRow.id);
  } catch (err) {
    await admin
      .from("scans")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Scan failed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", scanRow.id);
  }

  return NextResponse.json({ ok: true, scan_id: scanRow.id });
}
