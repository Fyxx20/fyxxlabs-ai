import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, role, email, created_at, updated_at, is_banned")
    .eq("user_id", userId)
    .single();
  if (!profile) redirect("/admin/users");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, website_url, platform, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: scans } = await supabase
    .from("scans")
    .select("id, store_id, status, score_global, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const storeIds = Array.from(new Set(scans?.map((s) => s.store_id) ?? []));
  const { data: storeNames } =
    storeIds.length > 0
      ? await supabase.from("stores").select("id, name").in("id", storeIds)
      : { data: [] };
  const nameByStore = new Map((storeNames ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {profile.email ?? userId}
        </h1>
        <p className="text-muted-foreground">
          user_id: {userId} · Créé le {formatDate(profile.created_at)}
        </p>
        <div className="mt-2 flex gap-2">
          <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
            {profile.role}
          </Badge>
          {(profile as { is_banned?: boolean }).is_banned && (
            <Badge variant="destructive">Banni</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abonnement</CardTitle>
          <CardDescription>
            Plan, statut, trial, conseil consommé
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <dl className="grid gap-2 text-sm">
              <div><span className="text-muted-foreground">Plan:</span> {subscription.plan}</div>
              <div><span className="text-muted-foreground">Statut:</span> {subscription.status}</div>
              <div><span className="text-muted-foreground">Source:</span> {subscription.source ?? "—"}</div>
              <div><span className="text-muted-foreground">Trial end:</span> {subscription.trial_end ? formatDate(subscription.trial_end) : "—"}</div>
              <div><span className="text-muted-foreground">Conseil consommé:</span> {subscription.advice_consumed ? "Oui" : "Non"}</div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun abonnement.</p>
          )}
          <Link href="/admin/subscriptions" className="mt-2 inline-block text-sm text-primary hover:underline">
            Gérer les abonnements
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Boutiques</CardTitle>
          <CardDescription>
            {stores?.length ?? 0} boutique(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stores?.length ? (
            <p className="text-sm text-muted-foreground">Aucune boutique.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stores.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/stores?user_id=${userId}`} className="text-primary hover:underline">
                    {s.name}
                  </Link>
                  {" — "}
                  <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">
                    {s.website_url}
                  </a>
                  {" · "}
                  {formatDate(s.created_at)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derniers scans</CardTitle>
          <CardDescription>
            {scans?.length ?? 0} scan(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!scans?.length ? (
            <p className="text-sm text-muted-foreground">Aucun scan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Boutique</th>
                    <th className="pb-2 text-left font-medium">Statut</th>
                    <th className="pb-2 text-left font-medium">Score</th>
                    <th className="pb-2 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2">{formatDate(s.created_at)}</td>
                      <td className="py-2">{nameByStore.get(s.store_id) ?? s.store_id}</td>
                      <td className="py-2">{s.status}</td>
                      <td className="py-2">{s.score_global != null ? `${s.score_global}/100` : "—"}</td>
                      <td className="py-2">
                        <Link href={`/admin/scans/${s.id}`} className="text-primary hover:underline">
                          Détail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
