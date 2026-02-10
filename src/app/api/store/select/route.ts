import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { STORE_SELECTION_COOKIE } from "@/lib/store-selection";

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

  const storeId = body.store_id;
  if (!storeId) {
    return NextResponse.json({ error: "store_id requis" }, { status: 400 });
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

  const res = NextResponse.json({ ok: true, store_id: storeId });
  res.cookies.set(STORE_SELECTION_COOKIE, storeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
