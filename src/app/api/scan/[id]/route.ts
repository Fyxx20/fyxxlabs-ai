import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const selectFull =
    "id, store_id, status, progress, step, score_global, scores_json, issues_json, priority_action, checklist, breakdown, confidence, raw, error_message, error_code, debug, created_at, started_at, finished_at";
  const selectMinimal =
    "id, store_id, status, score_global, scores_json, issues_json, priority_action, checklist, breakdown, confidence, raw, error_message, created_at, started_at, finished_at";

  let scan: Record<string, unknown> | null = null;
  let err: { message?: string } | null = null;

  const res = await supabase.from("scans").select(selectFull).eq("id", id).single();

  if (res.error) {
    const msg = res.error.message ?? "";
    if (/progress|step|error_code|debug|column/i.test(msg)) {
      const fallback = await supabase.from("scans").select(selectMinimal).eq("id", id).single();
      scan = fallback.data as Record<string, unknown> | null;
      err = fallback.error;
    } else {
      err = res.error;
    }
  } else {
    scan = res.data as Record<string, unknown> | null;
  }

  if (err || !scan) {
    return NextResponse.json({ error: "Scan introuvable" }, { status: 404 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", scan.store_id)
    .single();

  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 404 });
  }

  return NextResponse.json(scan);
}
