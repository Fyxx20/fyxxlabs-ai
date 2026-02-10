import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  const { userId } = await params;
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const role = body.role === "admin" ? "admin" : "user";

  const admin = getSupabaseAdmin();
  const { data: before } = await admin.from("profiles").select("role").eq("user_id", userId).single();
  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "user.set_role",
    target_type: "profile",
    target_id: userId,
    before_state: before ?? null,
    after_state: { role },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, role });
}
