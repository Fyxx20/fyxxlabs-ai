import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AdminIntegrationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: integrations } = await supabase
    .from("store_integrations")
    .select(`
      id,
      store_id,
      provider,
      status,
      shop_domain,
      metadata,
      connected_at,
      last_sync_at,
      created_at,
      stores ( id, name, user_id )
    `)
    .order("created_at", { ascending: false });

  const rows = (integrations ?? []) as unknown as Array<{
    id: string;
    store_id: string;
    provider: string;
    status: string;
    shop_domain: string | null;
    metadata: Record<string, unknown> | null;
    connected_at: string | null;
    last_sync_at: string | null;
    created_at: string;
    stores: { id: string; name: string; user_id: string } | null;
  }>;

  return (
    <div className="space-y-8 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Intégrations
        </h1>
        <p className="text-slate-300">
          Connexions plateforme par boutique. Les credentials ne sont jamais affichés.
        </p>
      </div>

      <Card className="border-white/10 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Liste des connexions</CardTitle>
          <CardDescription className="text-slate-300">
            {rows.length} enregistrement(s) store_integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune intégration.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 font-medium">Boutique</th>
                    <th className="text-left py-2 font-medium">Provider</th>
                    <th className="text-left py-2 font-medium">Statut</th>
                    <th className="text-left py-2 font-medium">Domaine</th>
                    <th className="text-left py-2 font-medium">Connecté le</th>
                    <th className="text-left py-2 font-medium">Dernière sync</th>
                    <th className="text-left py-2 font-medium">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-white/10">
                      <td className="py-2">
                        <Link
                          href={`/admin/stores`}
                          className="text-primary hover:underline"
                        >
                          {(r.stores as { name?: string } | null)?.name ?? r.store_id}
                        </Link>
                      </td>
                      <td className="py-2">{r.provider}</td>
                      <td className="py-2">
                        <Badge
                          variant={
                            r.status === "connected"
                              ? "default"
                              : r.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-slate-300">{r.shop_domain ?? "—"}</td>
                      <td className="py-2 text-slate-300">
                        {r.connected_at
                          ? new Date(r.connected_at).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="py-2 text-slate-300">
                        {r.last_sync_at
                          ? new Date(r.last_sync_at).toLocaleString("fr-FR")
                          : "—"}
                      </td>
                      <td className="py-2 max-w-[200px] truncate text-slate-300">
                        {r.metadata && Object.keys(r.metadata).length > 0
                          ? JSON.stringify(r.metadata)
                          : "—"}
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
