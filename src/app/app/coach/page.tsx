import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ScanSearch, Loader2, ArrowRight, MessageSquare } from "lucide-react";
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

  /* Locked state */
  if (!entitlements.canUseCoach) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coach IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recommandations personnalisées basées sur vos données.
          </p>
        </div>
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-lg font-semibold mb-1">
              Réservé aux abonnés
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Passez à Starter, Pro ou Elite pour activer le coach IA et obtenir
              des recommandations personnalisées.
            </p>
            <Link href="/app/billing">
              <Button>
                Voir les plans
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* Needs scan */
  if (!hasScanForAssistant || scanRunning) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coach IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recommandations personnalisées basées sur vos données.
          </p>
        </div>
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              {scanRunning ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <ScanSearch className="h-8 w-8 text-primary" />
              )}
            </div>
            <p className="text-lg font-semibold mb-1">
              {scanRunning
                ? "Analyse en cours..."
                : "Analyse requise"}
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {scanRunning
                ? "L’assistant sera disponible dès la fin de l’analyse."
                : "Lancez une analyse pour que le coach puisse répondre à partir de vos données."}
            </p>
            <Link href="/app/scans">
              <Button variant={scanRunning ? "outline" : "default"}>
                {scanRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Voir l&apos;analyse
                  </>
                ) : (
                  <>
                    <ScanSearch className="mr-2 h-4 w-4" />
                    Lancer un scan
                  </>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* Chat */
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coach IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Posez vos questions et obtenez des actions concrètes basées sur
          votre dernier scan.
        </p>
      </div>
      <CoachChat storeId={storeId} />
    </div>
  );
}
