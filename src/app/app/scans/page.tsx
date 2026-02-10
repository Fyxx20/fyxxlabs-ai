import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ScanSearch, Lock, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique des analyses de votre boutique.
          </p>
        </div>
        <div>
          {entitlements.canScan ? (
            <StartScanButton
              storeId={storeId}
              storeName={currentStore?.name}
              disabled={!entitlements.canRescan}
            />
          ) : (
            <Link href="/app/billing">
              <Button size="sm">
                <Lock className="mr-2 h-3.5 w-3.5" />
                Voir les plans
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!scans?.length && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <ScanSearch className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold mb-1">Aucune analyse</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Lancez votre premi&egrave;re analyse pour obtenir un score et des
              recommandations personnalis&eacute;es.
            </p>
            {entitlements.canScan && (
              <StartScanButton storeId={storeId} storeName={currentStore?.name} />
            )}
          </CardContent>
        </Card>
      )}

      {scans && scans.length > 0 && (
        <div className="space-y-6">
          {/* Score chart */}
          {(() => {
            const withScore = scans.filter(
              (s) => s.status === "succeeded" && s.score_global != null
            );
            const chartData = [...withScore].reverse().map((s) => ({
              date: s.created_at?.slice(0, 10) ?? "",
              score: s.score_global ?? 0,
            }));
            return chartData.length > 1 ? (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      &Eacute;volution du score
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScoreHistoryChart data={chartData} />
                </CardContent>
              </Card>
            ) : null;
          })()}

          {/* Scan history table */}
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Score</TableHead>
                    <TableHead className="text-right font-semibold">Variation</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="w-[120px]" />
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
                        <TableCell className="text-right tabular-nums font-semibold">
                          {currentScore != null ? (
                            <span>
                              {currentScore}
                              <span className="text-muted-foreground font-normal">
                                /100
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {delta != null ? (
                            <span
                              className={`inline-flex items-center gap-1 text-sm font-medium ${
                                delta > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : delta < 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {delta > 0 ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : delta < 0 ? (
                                <TrendingDown className="h-3.5 w-3.5" />
                              ) : (
                                <Minus className="h-3.5 w-3.5" />
                              )}
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
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
                            className="text-xs"
                          >
                            {scan.status === "succeeded"
                              ? "Termin\u00e9"
                              : scan.status === "running"
                                ? "En cours"
                                : scan.status === "failed"
                                  ? "\u00c9chec"
                                  : "En file"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scan.status === "succeeded" && scan.id ? (
                            <Link href={`/app/scans/${scan.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8"
                              >
                                D&eacute;tails
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
