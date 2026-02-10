import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Number(searchParams.get("offset")) || 0;
  const target_type = searchParams.get("target_type");
  const target_id = searchParams.get("target_id");

  const admin = getSupabaseAdmin();
  let query = admin
    .from("admin_audit_logs")
    .select("id, admin_user_id, action, target_type, target_id, before_state, after_state, ip, user_agent, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (target_type) query = query.eq("target_type", target_type);
  if (target_id) query = query.eq("target_id", target_id);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data, total: count ?? 0 });
}
