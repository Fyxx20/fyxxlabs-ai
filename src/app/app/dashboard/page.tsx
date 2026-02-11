import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { ScoreRing } from "@/components/score-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { computeDisplayScore } from "@/lib/score";
import { ArrowRight, Lock, Zap, TrendingUp, ShoppingCart, ScanSearch, BarChart3 } from "lucide-react";

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

  const pillarData = [
    { key: "conversion", label: "Conversion", color: "bg-blue-500" },
    { key: "trust", label: "Confiance", color: "bg-emerald-500" },
    { key: "offer", label: "Offre", color: "bg-violet-500" },
    { key: "performance", label: "Performance", color: "bg-amber-500" },
    { key: "traffic", label: "Trafic", color: "bg-rose-500" },
  ];

  return (
    <div className="relative max-w-6xl space-y-6 overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_55%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_45%)]" />
      {/* Page header */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-300">
          Vue d&apos;ensemble de{" "}
          <span className="font-semibold text-white">{currentStore.name}</span>
        </p>
      </div>

      {/* Paywall banner */}
      {!entitlements.canScan && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Analyse limitée</p>
              <p className="text-xs text-muted-foreground">
                Passe à un abonnement pour tout débloquer.
              </p>
            </div>
          </div>
          <Link href="/app/billing">
            <Button size="sm">
              Voir les plans
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics row */}
      {connectedIntegration && (totalRevenue > 0 || totalOrders > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Chiffre d&apos;affaires (30j)
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {totalRevenue.toFixed(2)} &euro;
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Commandes (30j)</p>
                <p className="text-2xl font-bold tabular-nums">{totalOrders}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scan running */}
      {lastScan?.status === "running" && (
        <Card className="border-violet-400/30 bg-violet-500/10 backdrop-blur-xl">
          <CardContent className="flex items-center gap-4 py-8 justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
            <div>
              <p className="font-semibold">Analyse en cours...</p>
              <p className="text-sm text-muted-foreground">
                Cela peut prendre 1 à 3 minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score + Pillars */}
      {lastScan?.status === "succeeded" && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Score card */}
            <Card className="flex flex-col items-center justify-center border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
              <ScoreRing score={displayScore} label="Score global" />
              <Link href={`/app/scans/${lastScan.id}`} className="mt-4">
                <Button variant="outline" size="sm" className="text-xs">
                  Voir le rapport
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </Link>
            </Card>

            {/* Pillars */}
            <Card className="lg:col-span-2 border-white/10 bg-white/[0.04] backdrop-blur-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base text-white">Piliers de performance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pillarData.map(({ key, label, color }) => {
                    const value = scores?.[key] ?? 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {Math.round(value)}
                            <span className="text-muted-foreground font-normal">/100</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-700`}
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

          {/* Next best action */}
          {(nextBestAction?.title || lastScan.trial_single_advice) && (
            <Card className="border-violet-400/25 bg-gradient-to-r from-violet-500/10 to-transparent backdrop-blur-xl">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold">Action prioritaire</p>
                  {entitlements.canViewFullScan && nextBestAction?.title ? (
                    <>
                      <p className="text-sm text-muted-foreground">{nextBestAction.title}</p>
                      {nextBestAction.steps?.length ? (
                        <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                          {nextBestAction.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : lastScan.trial_single_advice ? (
                    <p className="text-sm text-muted-foreground">
                      {lastScan.trial_single_advice}
                    </p>
                  ) : null}
                  {!entitlements.canViewFullScan && (
                    <Link href="/app/billing">
                      <Button variant="outline" size="sm" className="mt-1 text-xs">
                        Voir toutes les recommandations
                        <ArrowRight className="ml-1.5 h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last scan info */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <ScanSearch className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Dernier scan :{" "}
                <span className="font-medium text-foreground">
                  {formatDate(lastScan.created_at)}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/app/scans/${lastScan.id}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Rapport complet
                </Button>
              </Link>
              <Link href="/app/scans">
                <Button size="sm" className="text-xs">
                  Nouveau scan
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Empty state - only if no scan at all */}
      {!lastScan && entitlements.canScan && (
        <Card className="border-2 border-dashed border-white/20 bg-white/[0.03] backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <ScanSearch className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold mb-1">Lancez votre premier scan</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Analysez votre boutique en un clic pour obtenir un score de performance et
              des recommandations personnalisées.
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
    </div>
  );
}
