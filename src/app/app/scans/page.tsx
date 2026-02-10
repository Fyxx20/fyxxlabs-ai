import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ScanSearch, Lock, ExternalLink } from "lucide-react";
import { StartScanButton } from "./start-scan-button";
import { ScoreHistoryChart } from "@/components/analysis/score-history-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ScansPage() {
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

  const { data: scans } = await supabase
    .from("scans")
    .select("id, status, score_global, created_at, finished_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Scans
          </h1>
          <p className="text-muted-foreground">
            Historique des analyses de ta boutique.
          </p>
        </div>
        {entitlements.canScan && (
          <StartScanButton storeId={storeId} storeName={currentStore?.name} disabled={!entitlements.canRescan} />
        )}
        {!entitlements.canScan && (
          <Link href="/app/billing">
            <Button>
              <Lock className="mr-2 h-4 w-4" />
              Voir les abonnements
            </Button>
          </Link>
        )}
      </div>

      {!scans?.length && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ScanSearch className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">Aucune analyse</p>
            <p className="text-sm text-muted-foreground">
              Lancez votre première analyse pour obtenir un score et des recommandations.
            </p>
            {entitlements.canScan && (
              <StartScanButton storeId={storeId} storeName={currentStore?.name} className="mt-4" />
            )}
          </CardContent>
        </Card>
      )}

      {scans && scans.length > 0 && (
        <div className="space-y-8">
          {(() => {
            const withScore = scans.filter(
              (s) => s.status === "succeeded" && s.score_global != null
            );
            const chartData = [...withScore].reverse().map((s) => ({
              date: s.created_at?.slice(0, 10) ?? "",
              score: s.score_global ?? 0,
            }));
            return chartData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score dans le temps</CardTitle>
                  <CardDescription>
                    Évolution du score FyxxLabs sur vos dernières analyses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreHistoryChart data={chartData} />
                </CardContent>
              </Card>
            ) : null;
          })()}

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Historique des analyses
            </h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Variation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan, idx) => {
                    const prevScore =
                      scans[idx + 1]?.status === "succeeded" &&
                      scans[idx + 1]?.score_global != null
                        ? scans[idx + 1].score_global!
                        : null;
                    const currentScore =
                      scan.status === "succeeded" && scan.score_global != null
                        ? scan.score_global
                        : null;
                    const delta =
                      currentScore != null && prevScore != null
                        ? currentScore - prevScore
                        : null;
                    return (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">
                          {formatDate(scan.created_at)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currentScore != null ? `${currentScore}/100` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {delta != null ? (
                            <span
                              className={
                                delta > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : delta < 0
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                              }
                            >
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              scan.status === "succeeded"
                                ? "success"
                                : scan.status === "failed"
                                  ? "destructive"
                                  : scan.status === "running"
                                    ? "default"
                                    : "secondary"
                            }
                          >
                            {scan.status === "succeeded"
                              ? "Terminé"
                              : scan.status === "running"
                                ? "En cours"
                                : scan.status === "failed"
                                  ? "Échec"
                                  : "En file"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scan.id ? (
                            <Link
                              href={`/app/scans/${scan.id}`}
                              className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-muted hover:text-primary"
                            >
                              Voir le détail
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground">
                              Détails indisponibles
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
