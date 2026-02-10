import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { store_id: string; confirm?: string };
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
  const storeId = body.store_id;
  if (!storeId) return NextResponse.json({ error: "store_id requis" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: before } = await admin.from("stores").select("*").eq("id", storeId).single();
  if (!before) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const { error } = await admin.from("stores").delete().eq("id", storeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "store.delete",
    target_type: "store",
    target_id: storeId,
    before_state: before,
    after_state: null,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
