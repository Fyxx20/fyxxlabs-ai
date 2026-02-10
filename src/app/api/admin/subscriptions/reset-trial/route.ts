import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { user_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const userId = body.user_id;
  if (!userId) return NextResponse.json({ error: "user_id requis" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const { data: before } = await admin.from("subscriptions").select("*").eq("user_id", userId).single();
  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "trialing",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      advice_consumed: false,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "subscription.reset_trial",
    target_type: "subscription",
    target_id: userId,
    before_state: before ?? null,
    after_state: { trial_end: trialEnd.toISOString(), advice_consumed: false },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, trial_end: trialEnd.toISOString() });
}
