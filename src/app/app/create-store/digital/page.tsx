import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { getRuntimeFeatureFlags } from "@/lib/feature-flags";
import { DigitalLuxuryClient } from "@/app/app/create-store/digital/ui/digital-luxury-client";

export default async function AppCreateStoreDigitalPage() {
  const flags = await getRuntimeFeatureFlags();
  if (!flags.enable_digital_builder) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300 backdrop-blur-xl">
        Le module digital est en déploiement progressif et reste temporairement désactivé.
      </div>
    );
  }

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
    <div className="max-w-6xl">
      <DigitalLuxuryClient
        storeId={currentStore.id}
        storeName={currentStore.name}
        shopDomain={integration?.shop_domain ?? null}
      />
    </div>
  );
}

