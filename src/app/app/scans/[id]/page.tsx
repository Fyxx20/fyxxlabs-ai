import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ScoreFyxxLabs } from "@/components/analysis/score-fyxxlabs";
import { ScanProgressLive } from "@/components/analysis/scan-progress-live";
import { ScanFailedCard } from "@/components/analysis/scan-failed-card";
import { ScanDetailDataSections } from "@/components/analysis/scan-detail-sections";
import { AnalyzedCriteriaCards } from "@/components/analysis/analyzed-criteria-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Store, Calendar, RefreshCw } from "lucide-react";
import { ScanPolling } from "./scan-polling";
import { getEntitlements } from "@/lib/auth/entitlements";
import { computeDisplayScore } from "@/lib/score";
import { LockedSection } from "@/components/locked-section";
import type { PageParams, ScanRow } from "./scan-page-types";
import { getIssuesPayload, getScores, toScanRow } from "./scan-page-types";
import { ScanDetailPending } from "./scan-detail-pending";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidScanId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && UUID_REGEX.test(id);
}

function estimateSalesRateLift(score: number, issueCount: number): { min: number; max: number } {
  // Heuristique prudente : plus le score est bas et les issues nombreuses, plus le potentiel est élevé.
  let min = 0.1;
  let max = 0.4;

  if (score < 35) {
    min = 0.8;
    max = 2.2;
  } else if (score < 50) {
    min = 0.5;
    max = 1.6;
  } else if (score < 70) {
    min = 0.25;
    max = 0.9;
  }

  const issueBoost = Math.min(0.6, issueCount * 0.05);
  min += issueBoost * 0.35;
  max += issueBoost;

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
  };
}

export default async function ScanDetailPage({
  params,
  searchParams,
}: PageParams & { searchParams?: Promise<{ new?: string }> }) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  if (!isValidScanId(id)) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const selectBase =
    "id, store_id, status, score_global, scores_json, issues_json, trial_single_advice, summary, scan_data_json, error_message, created_at, started_at, finished_at, mode, confidence, priority_action, checklist, raw, free_preview, result_preview";
  let scan: any = null;
  let scanError: { message?: string } | null = null;

  const res = await supabase
    .from("scans")
    .select(`${selectBase}, progress, step, error_code, debug`)
    .eq("id", id)
    .maybeSingle();

  if (res.error) {
    const msg = res.error.message ?? "";
    if (/progress|step|error_code|debug|column.*scans/i.test(msg)) {
      const fallback = await supabase
        .from("scans")
        .select(selectBase)
        .eq("id", id)
        .maybeSingle();
      scan = fallback.data as Record<string, unknown> | null;
      scanError = fallback.error;
    } else {
      scanError = res.error;
    }
  } else {
    scan = res.data as Record<string, unknown> | null;
  }

  if (scanError || !scan) {
    if (sp.new === "1") return <ScanDetailPending scanId={id} />;
    notFound();
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, user_id")
    .eq("id", scan.store_id)
    .single();

  if (!store || store.user_id !== user.id) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at, scans_used")
    .eq("user_id", user.id)
    .single();

  const entitlements = getEntitlements(profile ?? null);
  const scanRow = toScanRow(scan);
  const isPreviewOnly = scanRow?.free_preview === true && !entitlements.canViewFullScan;
  const preview = scanRow.result_preview;

  const scores = getScores(scan);
  const issuesPayload = getIssuesPayload(scan);
  const issues = (issuesPayload?.issues ?? []).map((i) => {
    return { ...i, why_it_hurts: i.why ?? i.why_it_hurts ?? "" };
  });
  const nextBest = scanRow?.priority_action ?? issuesPayload?.next_best_action ?? preview?.priority_action;
  const mode = scanRow?.mode ?? "playwright";
  const confidence = scanRow?.confidence ?? preview?.confidence ?? "medium";
  const raw = scanRow?.raw;
  const aiFailed = raw?.ai?.status === "failed";
  const scoreGlobal = typeof (scan as { score_global?: unknown }).score_global === "number"
    ? (scan as { score_global: number }).score_global
    : null;
  const displayScore = computeDisplayScore(
    (scores as Record<string, unknown>) ?? null,
    scoreGlobal ?? preview?.score ?? 0
  );
  const estimatedLift = estimateSalesRateLift(displayScore, issues.length);

  const startedAt = scan.started_at ?? scan.created_at;

  return (
    <div className="space-y-8">
      <ScanPolling scanId={id} initialStatus={scan.status} />

      {/* En-tête : retour + titre + boutique + date + statut */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href="/app/scans">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Détail de l'analyse
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {store?.name && (
              <span className="flex items-center gap-1.5">
                <Store className="h-4 w-4" />
                {store.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(scan.created_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              scan.status === "succeeded"
                ? "default"
                : scan.status === "failed"
                  ? "destructive"
                  : "secondary"
            }
            className="font-medium"
          >
            {scan.status === "succeeded"
              ? "Terminé"
              : scan.status === "running"
                ? "En cours"
                : scan.status === "failed"
                  ? "Échec"
                  : "En file"}
          </Badge>
          {isPreviewOnly && (
            <Badge variant="outline">Analyse gratuite (limitée)</Badge>
          )}
          {mode === "http" && (
            <Badge variant="outline">Mode compatible</Badge>
          )}
          <Badge variant="outline">
            Confiance : {confidence === "high" ? "élevée" : confidence === "low" ? "faible" : "moyenne"}
          </Badge>
          {aiFailed && (
            <Badge variant="secondary">IA indisponible</Badge>
          )}
        </div>
      </div>

      {/* Analyse en cours : barre 0-100% + étapes + estimation + logs */}
      {(scan.status === "running" || scan.status === "queued") && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-b from-card to-muted/20">
          <CardHeader>
            <CardTitle className="text-lg">
              {scan.status === "queued" ? "Analyse en file" : "Analyse en cours"}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              La page se met à jour automatiquement. Durée typique : 2 à 4 minutes. L’            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ScanProgressLive
              scanId={id}
              initialStatus={scan.status}
              initialProgress={(scan as { progress?: number | null }).progress}
              initialStep={(scan as { step?: string | null }).step}
              storeName={store?.name}
            />
          </CardContent>
        </Card>
      )}

      {scan.status === "failed" && (
        <ScanFailedCard
          errorMessage={(scan as { error_message?: string | null }).error_message}
          errorCode={(scan as { error_code?: string | null }).error_code}
          debug={(scan as { debug?: unknown }).debug}
        />
      )}

      {scan.status === "succeeded" && (
        <>
          {/* Score principal */}
          <Card className="flex flex-col items-center justify-center border-primary/10 p-8 shadow-sm">
            <ScoreFyxxLabs score={displayScore} showInterpretation />
          </Card>

          {/* Produits analysés, Marché, Prix */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Ce qui a été analysé
            </h2>
            <ScanDetailDataSections
              scanDataJson={scan.scan_data_json}
              storeName={store?.name}
            />
          </div>

          <AnalyzedCriteriaCards
            scores={scores}
            canViewDetails={entitlements.canViewFullScan}
            issues={issues}
          />

          {scan.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {scan.summary}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Priorités identifiées</h2>
            {nextBest && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">Action prioritaire</CardTitle>
                  {isPreviewOnly && (
                    <CardDescription>
                      Analyse gratuite limitée : score et 1 action prioritaire.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{nextBest.title}</p>
                  {(nextBest.steps ?? []).length ? (
                    <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                      {(nextBest.steps ?? []).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            )}

            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-base">Estimation du taux de vente après application des conseils</CardTitle>
                <CardDescription>
                  Potentiel estimé : <span className="font-semibold text-foreground">+{estimatedLift.min}% à +{estimatedLift.max}%</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cette projection est une estimation basée sur les signaux détectés et les problèmes actuels du site.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estimation non contractuelle : les résultats réels dépendent du trafic, du marché, de l'offre et de la qualité d'exécution.
                </p>
              </CardContent>
            </Card>

            {isPreviewOnly && preview?.top_3_issues && preview.top_3_issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Problèmes détectés (aperçu)</CardTitle>
                <CardDescription>
                  Top 3. Débloque le plan complet pour voir issues et les correctifs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {preview.top_3_issues.map((issue, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <span className="font-medium">{issue.title}</span>
                    {issue.impact && (
                      <p className="text-sm text-muted-foreground mt-1">Impact : {issue.impact}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isPreviewOnly && preview?.checklist && preview.checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Checklist (aperçu)</CardTitle>
                <CardDescription>
                  3 premiers points. La checklist complète est dans le plan Pro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {preview.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={item.done ? "text-primary" : "text-muted-foreground"}>
                      {item.done ? "✓" : "○"}
                    </span>
                    {item.label}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isPreviewOnly && (
            <LockedSection
              title="Accès partiel — analyse complète avec une version supérieure FyxxLabs"
              ctaLabel="Débloquer l'analyse complète"
            >
              <div className="h-48 bg-muted/50 p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </LockedSection>
          )}

            {!isPreviewOnly && issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Problèmes classés par impact</CardTitle>
                  <CardDescription>
                    Impact : P0 = fort, P1 = moyen, P2 = faible. Zone = zone concernée.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {issues.slice(0, 5).map((issue) => {
                    const impactLabel =
                      issue.priority === "P0" ? "Fort" : issue.priority === "P1" ? "Moyen" : "Faible";
                    return (
                      <div
                        key={issue.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{issue.title}</span>
                          <Badge variant={issue.priority === "P0" ? "destructive" : "secondary"} className="text-xs">
                            {impactLabel}
                          </Badge>
                          {issue.category && (
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {issue.why_it_hurts}
                        </p>
                        {issue.fix_steps?.length ? (
                          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                            {issue.fix_steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {!isPreviewOnly && (scanRow?.checklist?.length ?? 0) > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(scanRow?.checklist ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={item.done ? "text-primary" : "text-muted-foreground"}>
                      {item.done ? "✓" : "○"}
                    </span>
                    {item.label}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
