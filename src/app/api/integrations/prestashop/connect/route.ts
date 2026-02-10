import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getConnector } from "@/lib/connectors/registry";
import { encryptCredentials } from "@/lib/integrations-encrypt";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { store_id?: string; store_url?: string; api_key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { store_id, store_url, api_key } = body;
  if (!store_id || !store_url || !api_key) {
    return NextResponse.json(
      { error: "store_id, store_url et api_key requis" },
      { status: 400 }
    );
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", store_id)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const connector = getConnector("prestashop");
  if (!connector) {
    return NextResponse.json({ error: "Connecteur indisponible" }, { status: 500 });
  }

  const ok = await connector.testConnection({
    storeId: store_id,
    storeUrl: store_url,
    apiKey: api_key,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Impossible de se connecter à PrestaShop. Vérifie l’URL et la clé API." },
      { status: 400 }
    );
  }

  let credentials: string;
  try {
    credentials = encryptCredentials(JSON.stringify({ api_key: api_key }));
  } catch (e) {
    return NextResponse.json(
      { error: "Chiffrement indisponible. Définis INTEGRATIONS_ENC_KEY dans ton environnement." },
      { status: 500 }
    );
  }
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const admin = createServiceRoleClient();
  const shopDomain = store_url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  await admin.from("store_integrations").upsert(
    {
      store_id: store_id,
      provider: "prestashop",
      status: "connected",
      credentials_encrypted: credentials,
      shop_domain: shopDomain,
      metadata: {},
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,provider" }
  );

  try {
    await connector.initialSync(store_id);
  } catch {
    // non bloquant
  }

  return NextResponse.json({ ok: true });
}
