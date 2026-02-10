import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  if (!storeId) {
    return NextResponse.json({ error: "store_id requis" }, { status: 400 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from("store_integrations")
    .select("provider, status, shop_domain, metadata, connected_at, last_sync_at")
    .eq("store_id", storeId);

  return NextResponse.json({ integrations: rows ?? [] });
}
