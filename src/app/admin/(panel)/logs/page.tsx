import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ target_type?: string; target_id?: string; limit?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { target_type, target_id, limit } = await searchParams;

  let query = supabase
    .from("admin_audit_logs")
    .select("id, admin_user_id, action, target_type, target_id, before_state, after_state, ip, created_at")
    .order("created_at", { ascending: false })
    .limit(Number(limit) || 100);
  if (target_type) query = query.eq("target_type", target_type);
  if (target_id) query = query.eq("target_id", target_id);

  const { data: logs } = await query;

  return (
    <div className="space-y-8 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Logs d’audit
        </h1>
        <p className="text-slate-300">
          Historique des actions admin (before/after). Filtres: target_type, target_id.
        </p>
      </div>

      <Card className="border-white/10 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Dernières actions</CardTitle>
          <CardDescription className="text-slate-300">
            {logs?.length ?? 0} entrée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground">Aucun log.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Action</th>
                    <th className="pb-2 text-left font-medium">Cible</th>
                    <th className="pb-2 text-left font-medium">Admin</th>
                    <th className="pb-2 text-left font-medium">IP</th>
                    <th className="pb-2 text-left font-medium">Before / After</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/10">
                      <td className="py-2 text-slate-300">{formatDate(log.created_at)}</td>
                      <td className="py-2 font-medium">{log.action}</td>
                      <td className="py-2">
                        {log.target_type} {log.target_id ? `· ${log.target_id.slice(0, 8)}…` : ""}
                      </td>
                      <td className="py-2 text-slate-300">{log.admin_user_id?.slice(0, 8)}…</td>
                      <td className="py-2 text-slate-300">{log.ip ?? "—"}</td>
                      <td className="py-2 max-w-[200px]">
                        {log.before_state || log.after_state ? (
                          <span className="text-xs">
                            {log.before_state ? "avant ✓ " : ""}
                            {log.after_state ? "après ✓" : ""}
                          </span>
                        ) : "—"}
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
