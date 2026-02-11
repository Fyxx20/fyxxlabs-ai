import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { AutoFixClient } from "./auto-fix-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plug, ArrowRight } from "lucide-react";

export default async function AutoFixPage() {
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
    .select("status")
    .eq("store_id", currentStore.id)
    .eq("provider", "shopify")
    .eq("status", "connected")
    .maybeSingle();

  if (!integration) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auto-Fix IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Optimisez vos produits automatiquement avec l&apos;IA.
          </p>
        </div>
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
              <Plug className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-lg font-semibold mb-1">Shopify non connecté</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Connectez votre boutique Shopify pour utiliser l&apos;Auto-Fix IA.
            </p>
            <Link href="/app/integrations">
              <Button>
                Connecter Shopify
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AutoFixClient storeId={currentStore.id} />
    </div>
  );
}
