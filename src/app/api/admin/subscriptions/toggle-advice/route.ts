import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { user_id: string; value?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const userId = body.user_id;
  if (!userId) return NextResponse.json({ error: "user_id requis" }, { status: 400 });
  const value = body.value ?? true;

  const admin = getSupabaseAdmin();
  const { data: before } = await admin.from("subscriptions").select("advice_consumed").eq("user_id", userId).single();
  const { error } = await admin
    .from("subscriptions")
    .update({ advice_consumed: value, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "subscription.toggle_advice",
    target_type: "subscription",
    target_id: userId,
    before_state: before ?? null,
    after_state: { advice_consumed: value },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, advice_consumed: value });
}
