"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ScanRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  status: string;
  score_global: number | null;
  error_message: string | null;
  created_at: string;
};

export function AdminScansTable({
  scans,
  storeNameById,
}: {
  scans: ScanRow[];
  storeNameById: Map<string, string>;
}) {
  const router = useRouter();
  const actionOutlineClass =
    "border-white/20 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white disabled:opacity-100 disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500";
  const actionGhostClass = "text-slate-100 hover:bg-slate-800 hover:text-white";
  const [loading, setLoading] = useState<string | null>(null);

  async function retry(scanId: string) {
    setLoading(scanId);
    const res = await fetch("/api/admin/scans/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan_id: scanId }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else {
      const d = await res.json();
      alert(d.error || "Erreur");
    }
  }

  return (
    <Card className="border-white/10 bg-slate-900/70 text-slate-100">
      <CardHeader>
        <CardTitle>Derniers scans</CardTitle>
        <CardDescription className="text-slate-300">
          {scans.length} scan(s) — Relancer un scan (crée un nouveau scan).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!scans.length ? (
          <p className="text-sm text-slate-300">Aucun scan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Boutique</th>
                  <th className="pb-2 text-left font-medium">Statut</th>
                  <th className="pb-2 text-left font-medium">Score</th>
                  <th className="pb-2 text-left font-medium">Erreur</th>
                  <th className="pb-2 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id} className="border-b border-white/10">
                    <td className="py-3">{formatDate(s.created_at)}</td>
                    <td className="py-3">
                      {storeNameById.get(s.store_id) ?? s.store_id}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          s.status === "succeeded"
                            ? "default"
                            : s.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {s.score_global != null ? `${s.score_global}/100` : "—"}
                    </td>
                    <td className="max-w-[200px] truncate py-3 text-slate-300">
                      {s.error_message ?? "—"}
                    </td>
                    <td className="py-3">
                      <Link href={`/admin/scans/${s.id}`}>
                        <Button variant="ghost" size="sm" className={actionGhostClass}>
                          Détail
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`ml-1 ${actionOutlineClass}`}
                        disabled={loading === s.id}
                        onClick={() => retry(s.id)}
                      >
                        {loading === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retry"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
