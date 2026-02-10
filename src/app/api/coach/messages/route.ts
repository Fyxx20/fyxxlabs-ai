import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  if (!storeId) {
    return NextResponse.json({ error: "store_id requis" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("user_id", user.id)
    .single();
  if (!store) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("coach_messages")
    .select("id, role, content, created_at")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: messages ?? [] });
}
