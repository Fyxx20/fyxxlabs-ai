"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";

type Row = {
  user_id: string;
  email: string | null;
  plan: string;
  status: string;
  trial_end: string | null;
  advice_consumed: boolean;
  source: string;
  updated_at: string;
};

export function AdminSubscriptionsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function setPlan(userId: string, plan: "free" | "pro" | "lifetime") {
    setLoading(userId);
    const res = await fetch("/api/admin/subscriptions/set-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, plan }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else {
      const d = await res.json();
      alert(d.error || "Erreur");
    }
  }

  async function resetTrial(userId: string) {
    setLoading(userId);
    const res = await fetch("/api/admin/subscriptions/reset-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else {
      const d = await res.json();
      alert(d.error || "Erreur");
    }
  }

  async function toggleAdvice(userId: string, value: boolean) {
    setLoading(userId);
    const res = await fetch("/api/admin/subscriptions/toggle-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, value }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  return (
    <Card className="border-white/10 bg-slate-900/70 text-slate-100">
      <CardHeader>
        <CardTitle>Liste des abonnements</CardTitle>
        <CardDescription className="text-slate-300">
          {rows.length} abonnement(s) — actions: plan, reset trial, conseil consommé
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun abonnement.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 text-left font-medium">Email</th>
                  <th className="pb-2 text-left font-medium">Plan</th>
                  <th className="pb-2 text-left font-medium">Statut</th>
                  <th className="pb-2 text-left font-medium">Source</th>
                  <th className="pb-2 text-left font-medium">Trial end</th>
                  <th className="pb-2 text-left font-medium">Conseil</th>
                  <th className="pb-2 text-left font-medium">Mis à jour</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-b border-white/10">
                    <td className="py-3">
                      <Link href={`/admin/users/${r.user_id}`} className="text-primary hover:underline flex items-center gap-1">
                        {r.email ?? r.user_id.slice(0, 8) + "…"}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="py-3">
                      <Badge variant={r.plan === "lifetime" ? "default" : "secondary"}>
                        {r.plan}
                      </Badge>
                    </td>
                    <td className="py-3">{r.status}</td>
                    <td className="py-3">{r.source}</td>
                    <td className="py-3 text-slate-300">
                      {r.trial_end ? formatDate(r.trial_end) : "—"}
                    </td>
                    <td className="py-3">{r.advice_consumed ? "Oui" : "Non"}</td>
                    <td className="py-3 text-slate-300">{formatDate(r.updated_at)}</td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {r.plan !== "lifetime" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading === r.user_id}
                            onClick={() => setPlan(r.user_id, "lifetime")}
                          >
                            {loading === r.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lifetime"}
                          </Button>
                        )}
                        {r.plan !== "pro" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading === r.user_id}
                            onClick={() => setPlan(r.user_id, "pro")}
                          >
                            Pro
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading === r.user_id}
                          onClick={() => resetTrial(r.user_id)}
                        >
                          Reset trial
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loading === r.user_id}
                          onClick={() => toggleAdvice(r.user_id, !r.advice_consumed)}
                        >
                          {r.advice_consumed ? "Réactiver conseil" : "Marquer consommé"}
                        </Button>
                      </div>
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
