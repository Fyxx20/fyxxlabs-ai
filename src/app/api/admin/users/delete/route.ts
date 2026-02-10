import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { user_id: string; confirm?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Confirmation requise: envoyez { confirm: 'DELETE' }" },
      { status: 400 }
    );
  }
  const targetUserId = body.user_id;
  if (!targetUserId) {
    return NextResponse.json({ error: "user_id requis" }, { status: 400 });
  }
  if (targetUserId === auth.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: beforeProfile } = await admin.from("profiles").select("*").eq("user_id", targetUserId).single();
  const { data: beforeSub } = await admin.from("subscriptions").select("*").eq("user_id", targetUserId).single();

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "user.delete",
    target_type: "user",
    target_id: targetUserId,
    before_state: {
      profile: beforeProfile ?? null,
      subscription: beforeSub ?? null,
    },
    after_state: null,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
