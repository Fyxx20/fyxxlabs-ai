import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ScanSearch,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

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

  const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    P0: { color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10", label: "Critique" },
    P1: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10", label: "Important" },
    P2: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10", label: "Moyen" },
    P3: { color: "text-muted-foreground", bg: "bg-muted", label: "Mineur" },
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Problèmes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Problèmes détectés sur votre boutique avec correctifs et exemples.
        </p>
      </div>

      {/* No scan state */}
      {!lastScan && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <ScanSearch className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold mb-1">Aucun scan réussi</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Lancez un scan pour détecter les problèmes de votre boutique.
            </p>
            <Link href="/app/scans">
              <Button>
                <ScanSearch className="mr-2 h-4 w-4" />
                Lancer un scan
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Trial advice only */}
      {lastScan && issuesToShow.length === 0 && lastScan.trial_single_advice && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm font-semibold">Conseil prioritaire (essai)</p>
              <p className="text-sm text-muted-foreground">
                {lastScan.trial_single_advice}
              </p>
              {!showFullList && (
                <Link href="/app/billing">
                  <Button size="sm" className="mt-1">
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Voir toutes les recommandations
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues list */}
      {lastScan && issuesToShow.length > 0 && (
        <>
          {/* Locked banner */}
          {hasLocked && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-3">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-muted-foreground">
                  {allIssues.length - 1} problème(s) supplémentaire(s) masqué(s).
                  Passez à Pro pour tout voir.
                </p>
              </div>
              <Link href="/app/billing">
                <Button size="sm" variant="outline" className="text-xs shrink-0">
                  Upgrade
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}

          {/* Summary counters */}
          {showFullList && allIssues.length > 0 && (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {["P0", "P1", "P2", "P3"].map((p) => {
                const count = allIssues.filter((i) => i.priority === p).length;
                const cfg = priorityConfig[p] ?? priorityConfig.P3;
                return (
                  <div
                    key={p}
                    className={`rounded-xl ${cfg.bg} px-4 py-3 text-center`}
                  >
                    <p className={`text-2xl font-bold tabular-nums ${cfg.color}`}>
                      {count}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {cfg.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Issue cards */}
          <div className="space-y-4">
            {issuesToShow.map((issue) => {
              const cfg = priorityConfig[issue.priority] ?? priorityConfig.P3;
              return (
                <Card key={issue.id} className="border-border/60 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge
                        variant={
                          issue.priority === "P0" ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {cfg.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {issue.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-snug">
                      {issue.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {issue.why_it_hurts}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {issue.fix_steps?.length ? (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <p className="text-sm font-semibold">Comment corriger</p>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          {issue.fix_steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {issue.example_copy?.length ? (
                      <div className="rounded-lg border border-border/60 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <p className="text-sm font-semibold">Exemple</p>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          &ldquo;{issue.example_copy[0]}&rdquo;
                        </p>
                      </div>
                    ) : null}
                    {issue.expected_impact && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Impact estimé : {issue.expected_impact}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
