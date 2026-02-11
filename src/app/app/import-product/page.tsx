import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { ImportProductClient } from "./import-product-client";

export default async function ImportProductPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, website_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const currentStore = resolveSelectedStore(stores ?? [], selectedStoreId);

  if (!currentStore) redirect("/onboarding");

  const { data: integration } = await supabase
    .from("store_integrations")
    .select("status, shop_domain")
    .eq("store_id", currentStore.id)
    .eq("provider", "shopify")
    .eq("status", "connected")
    .maybeSingle();

  return (
    <div className="max-w-4xl mx-auto">
      <ImportProductClient
        storeId={currentStore.id}
        shopDomain={integration?.shop_domain ?? null}
      />
    </div>
  );
}
