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
  const admin = getSupabaseAdmin();
  const { data: before } = await admin.from("subscriptions").select("*").eq("user_id", userId).single();
  const { error } = await admin
    .from("subscriptions")
    .update({
      plan: "lifetime",
      status: "active",
      ends_at: null,
      source: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin
    .from("profiles")
    .update({ plan: "lifetime", updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "subscription.set_lifetime",
    target_type: "subscription",
    target_id: userId,
    before_state: before ?? null,
    after_state: { plan: "lifetime", status: "active", source: "manual" },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
