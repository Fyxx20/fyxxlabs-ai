import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { CoachChat } from "./coach-chat";

export default async function CoachPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const currentStore = resolveSelectedStore(stores ?? [], selectedStoreId);
  const storeId = currentStore?.id;
  if (!storeId) redirect("/onboarding");

  const { data: lastScanSucceeded } = await supabase
    .from("scans")
    .select("id, status")
    .eq("store_id", storeId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: lastScanAny } = await supabase
    .from("scans")
    .select("id, status")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const hasScanForAssistant = !!lastScanSucceeded?.id;
  const scanRunning = lastScanAny?.status === "running";

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_started_at, trial_ends_at, scans_used")
    .eq("user_id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  const entitlements = getEntitlements(profile ?? null, subscription ?? null);

  if (!entitlements.canUseCoach) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Assistant FyxxLabs
          </h1>
          <p className="text-muted-foreground">
            Posez vos questions et obtenez des recommandations basées sur votre dernière analyse.
          </p>
        </div>
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Assistant réservé aux abonnés
            </CardTitle>
            <CardDescription>
              Passe sur Starter, Pro ou Elite pour activer le coach IA selon ton quota,
              les checklists et le bouton « J’ai modifié » pour comparer avant/après.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/billing">
              <Button>Voir les abonnements</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasScanForAssistant || scanRunning) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Assistant FyxxLabs
          </h1>
          <p className="text-muted-foreground">
            Analyse et interprétation des données de ta boutique. FyxxLabs ne donne pas d'avis sans données.
          </p>
        </div>
        <Card className="border-muted">
          <CardHeader>
            <CardTitle>
              {scanRunning
                ? "Analyse en cours — l'assistant sera disponible à la fin"
                : "Analyse requise pour activer l'assistant FyxxLabs"}
            </CardTitle>
            <CardDescription>
              {scanRunning
                ? "Reviens une fois l'analyse terminée pour poser tes questions sur les résultats."
                : "Lance une analyse pour débloquer l'assistant. L'assistant FyxxLabs répond uniquement à partir des données de ton dernier scan."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/scans">
              <Button variant={scanRunning ? "outline" : "default"}>
                {scanRunning ? "Voir l'analyse en cours" : "Lancer une analyse"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Assistant FyxxLabs
        </h1>
        <p className="text-muted-foreground">
          Analyse et interprétation des données de ta boutique. FyxxLabs répond à partir de ton dernier scan pour proposer des actions concrètes.
        </p>
      </div>
      <CoachChat storeId={storeId} />
    </div>
  );
}
