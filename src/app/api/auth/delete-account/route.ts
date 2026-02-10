import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { confirm } = await request.json();
  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Confirmation requise : envoyer { confirm: \"DELETE\" }" },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Delete user stores, scans, subscriptions, etc.
  await admin.from("store_integrations").delete().eq("store_id", 
    admin.from("stores").select("id").eq("user_id", user.id)
  );
  await admin.from("stores").delete().eq("user_id", user.id);
  await admin.from("subscriptions").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("user_id", user.id);

  // Delete auth user
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sign out
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, message: "Compte supprimé" });
}
