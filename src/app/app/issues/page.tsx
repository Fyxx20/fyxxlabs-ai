import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default async function IssuesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const currentStore = resolveSelectedStore(stores ?? [], selectedStoreId);
  const storeId = currentStore?.id;
  if (!storeId) redirect("/onboarding");

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

  const { data: lastScan } = await supabase
    .from("scans")
    .select("id, issues_json, trial_single_advice")
    .eq("store_id", storeId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const issuesPayload = lastScan?.issues_json as {
    issues?: Array<{
      id: string;
      priority: string;
      category: string;
      title: string;
      why_it_hurts: string;
      fix_steps?: string[];
      example_copy?: string[];
      expected_impact?: string;
    }>;
  } | null;
  const allIssues = issuesPayload?.issues ?? [];
  const showFullList = entitlements.canViewFullScan;
  const issuesToShow = showFullList ? allIssues : allIssues.slice(0, 1);
  const hasLocked = !showFullList && allIssues.length > 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Issues
        </h1>
        <p className="text-muted-foreground">
          Problèmes détectés sur ta boutique, avec correctifs et exemples.
        </p>
      </div>

      {!lastScan && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="font-medium">Aucun scan réussi pour l’instant</p>
            <p className="text-sm text-muted-foreground">
              Lance un scan pour voir les issues.
            </p>
            <Link href="/app/scans" className="mt-4">
              <Button>Lancer un scan</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {lastScan && issuesToShow.length === 0 && lastScan.trial_single_advice && (
        <Card>
          <CardHeader>
            <CardTitle>Conseil prioritaire (essai)</CardTitle>
            <CardDescription>
              Pendant l’essai, un seul conseil est affiché.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{lastScan.trial_single_advice}</p>
            {!showFullList && (
              <Link href="/app/billing" className="mt-4 inline-block">
                <Button>
                  <Lock className="mr-2 h-4 w-4" />
                  Voir toutes les recommandations
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {lastScan && issuesToShow.length > 0 && (
        <>
          {hasLocked && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="flex items-center justify-between py-4">
                <p className="text-sm text-muted-foreground">
                  Liste limitée en essai. Passe à Pro pour débloquer toutes les issues.
                </p>
                <Link href="/app/billing">
                  <Button size="sm">Upgrade</Button>
                </Link>
              </CardContent>
            </Card>
          )}
          <div className="space-y-4">
            {issuesToShow.map((issue) => (
              <Card key={issue.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={issue.priority === "P0" ? "destructive" : "secondary"}>
                      {issue.priority}
                    </Badge>
                    <Badge variant="outline">{issue.category}</Badge>
                    <CardTitle className="text-base">{issue.title}</CardTitle>
                  </div>
                  <CardDescription>{issue.why_it_hurts}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {issue.fix_steps?.length ? (
                    <div>
                      <p className="text-sm font-medium">Comment corriger</p>
                      <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                        {issue.fix_steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {issue.example_copy?.length ? (
                    <div>
                      <p className="text-sm font-medium">Exemple de texte</p>
                      <p className="mt-1 rounded-md bg-muted p-2 text-sm">
                        {issue.example_copy[0]}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
