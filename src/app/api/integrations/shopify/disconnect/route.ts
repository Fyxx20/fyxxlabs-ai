import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { store_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const store_id = body.store_id;
  if (!store_id) {
    return NextResponse.json({ error: "store_id requis" }, { status: 400 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", store_id)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const { error } = await supabase
    .from("store_integrations")
    .update({
      status: "disconnected",
      credentials_encrypted: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", store_id)
    .eq("provider", "shopify");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
