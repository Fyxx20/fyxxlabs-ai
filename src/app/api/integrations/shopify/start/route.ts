import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getConnector } from "@/lib/connectors/registry";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?redirectTo=/app/settings", request.url));
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  const shop = searchParams.get("shop")?.trim();
  if (!storeId || !shop) {
    return NextResponse.json(
      { error: "store_id et shop (domaine Shopify) requis" },
      { status: 400 }
    );
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const connector = getConnector("shopify");
  if (!connector) {
    return NextResponse.json({ error: "Connecteur Shopify indisponible" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/shopify/callback`;

  try {
    const shopUrl = shop.startsWith("http") ? new URL(shop).hostname : shop;
    if (!shopUrl || !shopUrl.includes(".")) {
      throw new Error("Domaine Shopify invalide");
    }

    const url = await connector.startConnect({
      storeId,
      redirectUri,
      shop: `https://${shopUrl}`,
      state: storeId,
    });

    if (!url) {
      return NextResponse.json(
        { error: "OAuth Shopify non configuré (SHOPIFY_CLIENT_ID)" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(url);
  } catch (err) {
    const message = (err as Error).message || "Erreur inconnue";
    console.error("[Shopify start]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
