import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, store_id")
    .eq("id", scanId)
    .single();

  if (!scan) {
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

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 100);
  const { data: events, error } = await supabase
    .from("scan_events")
    .select("id, ts, type, message, payload")
    .eq("scan_id", scanId)
    .order("ts", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: events ?? [] });
}
