import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreForm } from "@/app/app/settings/store-form";
import { IntegrationsCard } from "@/app/app/settings/integrations-card";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gérer la boutique
        </h1>
        <p className="text-muted-foreground">
          Modifie les informations de la boutique et gère ses connexions plateforme.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations boutique</CardTitle>
          <CardDescription>
            Nom, URL et objectif utilisés par FyxxLabs pour contextualiser les analyses.
          </CardDescription>
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

      <IntegrationsCard storeId={store.id} storeUrl={store.website_url ?? ""} />
    </div>
  );
}
