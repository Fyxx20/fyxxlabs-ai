import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  const { userId } = await params;
  const admin = getSupabaseAdmin();
  const { data: before } = await admin.from("profiles").select("user_id, is_banned").eq("user_id", userId).single();
  if (!before) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const { error } = await admin.from("profiles").update({ is_banned: true, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = getRequestMeta(_request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "user.ban",
    target_type: "profile",
    target_id: userId,
    before_state: before,
    after_state: { ...before, is_banned: true },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
