import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { ScoreRing } from "@/components/score-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { computeDisplayScore } from "@/lib/score";
import { ArrowRight, Lock, Zap } from "lucide-react";

export default async function DashboardPage() {
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
  if (!currentStore?.id) {
    redirect("/onboarding");
  }
  const storeId = currentStore.id;

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

  const { data: integrations } = await supabase
    .from("store_integrations")
    .select("provider, status")
    .eq("store_id", storeId)
    .eq("status", "connected");
  const connectedIntegration = (integrations ?? [])[0];
  const dataLevel =
    connectedIntegration?.provider === "shopify" ||
    connectedIntegration?.provider === "woocommerce" ||
    connectedIntegration?.provider === "prestashop"
      ? "élevé"
      : "moyen";
  const metricsSource = connectedIntegration
    ? `Données connectées: ${dataLevel}`
    : "Données connectées: moyen (scan URL)";

  const { data: metricsRows } = connectedIntegration
    ? await supabase
        .from("store_metrics_daily")
        .select("day, revenue, orders_count, total_customers")
        .eq("store_id", storeId)
        .eq("provider", connectedIntegration.provider)
        .gte("day", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order("day", { ascending: false })
    : { data: [] };
  const totalRevenue = (metricsRows ?? []).reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const totalOrders = (metricsRows ?? []).reduce((s, r) => s + (r.orders_count ?? 0), 0);

  const { data: lastScan } = await supabase
    .from("scans")
    .select("id, status, score_global, scores_json, issues_json, trial_single_advice, summary, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const scores = (lastScan?.scores_json as Record<string, number> | null) ?? null;
  const displayScore = computeDisplayScore(
    (lastScan?.scores_json as Record<string, unknown> | null) ?? null,
    lastScan?.score_global
  );
  const issuesPayload = lastScan?.issues_json as { next_best_action?: { title?: string; steps?: string[] } } | null;
  const nextBestAction = issuesPayload?.next_best_action;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Vue d’ensemble de votre boutique et prochaine action prioritaire.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entitlements.isLifetime && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              Lifetime access
            </Badge>
          )}
          <Badge variant="secondary">{metricsSource}</Badge>
        </div>
      </div>

      {connectedIntegration && (totalRevenue > 0 || totalOrders > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Métriques (30 derniers jours)</CardTitle>
            <CardDescription>
              Données synchronisées depuis {connectedIntegration.provider}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d’affaires</p>
                <p className="text-2xl font-semibold">{totalRevenue.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commandes</p>
                <p className="text-2xl font-semibold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!entitlements.canScan && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Analyse gratuite utilisée ou essai terminé
            </CardTitle>
            <CardDescription>
              Passe à un abonnement pour débloquer les scans, le coach IA et l’historique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/billing">
              <Button>
                Voir les abonnements
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {lastScan?.status === "running" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 animate-pulse rounded-full bg-primary/20" />
            <p className="mt-4 font-medium">Analyse en cours…</p>
            <p className="text-sm text-muted-foreground">
              L’analyse de ta boutique peut prendre 1 à 3 minutes.
            </p>
          </CardContent>
        </Card>
      )}

      {lastScan?.status === "succeeded" && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6">
              <ScoreRing
                score={displayScore}
                label="Score global"
              />
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Piliers</CardTitle>
                <CardDescription>
                  Données utilisées pour le score — niveau de confiance indiqué
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: "conversion", label: "Conversion", w: 35 },
                    { key: "trust", label: "Confiance", w: 20 },
                    { key: "offer", label: "Offre / Clarté", w: 15 },
                    { key: "performance", label: "Performance", w: 15 },
                    { key: "traffic", label: "Trafic", w: 15 },
                  ].map(({ key, label, w }) => {
                    const value = scores?.[key] ?? 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{Math.round(value)}/100</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/80"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {(nextBestAction?.title || lastScan.trial_single_advice) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Prochaine action prioritaire
                </CardTitle>
                <CardDescription>
                  Une seule action à fort impact à faire en premier.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {entitlements.canViewFullScan && nextBestAction?.title ? (
                  <>
                    <p className="font-medium">{nextBestAction.title}</p>
                    {nextBestAction.steps?.length ? (
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {nextBestAction.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : lastScan.trial_single_advice ? (
                  <p className="text-sm">{lastScan.trial_single_advice}</p>
                ) : null}
                {!entitlements.canViewFullScan && (
                  <Link href="/app/billing">
                    <Button variant="outline" size="sm">
                      Voir toutes les recommandations
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dernier scan</CardTitle>
              <CardDescription>
                {formatDate(lastScan.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href={`/app/scans/${lastScan.id}`}>
                <Button variant="outline">Voir le rapport complet</Button>
              </Link>
              <Link href="/app/integrations">
                <Button>Relancer un scan</Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}

      {entitlements.canScan && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="font-medium">Aucun scan pour l’instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lance ton premier scan depuis la page Scans ou l’onboarding.
            </p>
            <Link href="/app/scans" className="mt-4">
              <Button>Lancer un scan</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
