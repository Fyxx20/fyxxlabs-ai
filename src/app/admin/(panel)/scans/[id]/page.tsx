import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function AdminScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, store_id, user_id, status, score_global, scores_json, issues_json, trial_single_advice, scan_data_json, summary, error_message, created_at, started_at, finished_at"
    )
    .eq("id", id)
    .single();

  if (!scan) notFound();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, website_url")
    .eq("id", scan.store_id)
    .single();

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex items-center gap-4">
        <Link href="/admin/scans">
          <Button variant="ghost" size="icon" className="text-slate-100 hover:bg-slate-800 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Scan {id.slice(0, 8)}…
          </h1>
          <p className="text-slate-300">
            {formatDate(scan.created_at)}
            {store?.name && ` · ${store.name}`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Statut :</strong>{" "}
              <Badge
                variant={
                  scan.status === "succeeded"
                    ? "success"
                    : scan.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {scan.status}
              </Badge>
            </p>
            {scan.score_global != null && (
              <p>
                <strong>Score global :</strong> {scan.score_global}/100
              </p>
            )}
            {scan.error_message && (
              <p className="text-sm text-destructive">
                <strong>Erreur :</strong> {scan.error_message}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Boutique</CardTitle>
          </CardHeader>
          <CardContent>
            {store ? (
              <p>
                <a
                  href={store.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {store.name} — {store.website_url}
                </a>
              </p>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
      </div>

      {scan.summary && (
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Résumé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {scan.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {scan.trial_single_advice && (
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Conseil trial</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{scan.trial_single_advice}</p>
          </CardContent>
        </Card>
      )}

      {scan.scores_json && (
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Scores (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-auto rounded border border-white/10 bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(scan.scores_json, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {scan.issues_json && (
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Issues (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded border border-white/10 bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(scan.issues_json, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {scan.scan_data_json && (
        <Card className="border-white/10 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Scan data (aperçu)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded border border-white/10 bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(scan.scan_data_json, null, 2).slice(0, 3000)}…
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
