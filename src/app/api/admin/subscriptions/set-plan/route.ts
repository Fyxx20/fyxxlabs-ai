import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { user_id: string; plan: "free" | "pro" | "lifetime" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const { user_id: userId, plan } = body;
  if (!userId || !["free", "pro", "lifetime"].includes(plan)) {
    return NextResponse.json({ error: "user_id et plan (free|pro|lifetime) requis" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: before } = await admin.from("subscriptions").select("*").eq("user_id", userId).single();
  const updates: Record<string, unknown> = {
    plan,
    updated_at: new Date().toISOString(),
  };
  if (plan === "lifetime") {
    updates.status = "active";
    updates.ends_at = null;
    updates.source = "manual";
  } else if (plan === "pro") {
    updates.status = "active";
    updates.source = "manual";
  }

  const { error } = await admin.from("subscriptions").update(updates).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "subscription.set_plan",
    target_type: "subscription",
    target_id: userId,
    before_state: before ?? null,
    after_state: { plan, ...updates },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, plan });
}
