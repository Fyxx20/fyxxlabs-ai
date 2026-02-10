import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreForm } from "@/app/app/settings/store-form";
import { IntegrationsCard } from "@/app/app/settings/integrations-card";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Store, Plug } from "lucide-react";

export default async function IntegrationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, website_url, platform, goal")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const store = resolveSelectedStore(stores ?? [], selectedStoreId);
  if (!store) redirect("/onboarding");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ma boutique</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informations et connexions de votre boutique.
        </p>
      </div>

      {/* Store info */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Informations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <StoreForm
            store={{
              id: store.id,
              name: store.name,
              website_url: store.website_url,
              goal: store.goal,
            }}
          />
        </CardContent>
      </Card>

      {/* Integrations */}
      <IntegrationsCard storeId={store.id} storeUrl={store.website_url ?? ""} />
    </div>
  );
}
