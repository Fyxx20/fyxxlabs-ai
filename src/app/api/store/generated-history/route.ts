import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/* ─── GET: list generated stores for current user ─── */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("generated_stores")
    .select("id, brand_name, brand_color, product_title, product_price, product_image, shopify_product_id, shop_domain, source_url, language, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // If table doesn't exist yet, return empty
  if (error) {
    if (error.message.includes("generated_stores")) {
      return NextResponse.json({ stores: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores: data ?? [] });
}

/* ─── POST: save a generated store to history ─── */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const {
    store_id,
    brand_name,
    brand_color,
    product_title,
    product_price,
    product_image,
    shopify_product_id,
    shop_domain,
    source_url,
    language,
  } = body;

  if (!store_id || !brand_name || !product_title)
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

  const { data, error } = await supabase
    .from("generated_stores")
    .insert({
      user_id: user.id,
      store_id,
      brand_name,
      brand_color: brand_color ?? null,
      product_title,
      product_price: product_price ?? null,
      product_image: product_image ?? null,
      shopify_product_id: shopify_product_id ?? null,
      shop_domain: shop_domain ?? null,
      source_url: source_url ?? null,
      language: language ?? null,
    })
    .select("id")
    .single();

  // If table doesn't exist yet, silently succeed
  if (error) {
    if (error.message.includes("generated_stores")) {
      return NextResponse.json({ id: null, note: "table not created yet" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

/* ─── DELETE: remove a generated store from history ─── */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await req.json();
  if (!id)
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const { error } = await supabase
    .from("generated_stores")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
