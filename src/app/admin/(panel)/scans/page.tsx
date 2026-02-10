import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AdminScansTable } from "./admin-scans-table";

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<{ user_id?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/admin/login?error=unauthorized");

  const { user_id: userId } = await searchParams;
  const admin = getSupabaseAdmin();
  let query = admin
    .from("scans")
    .select("id, store_id, user_id, status, score_global, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (userId) query = query.eq("user_id", userId);
  const { data: scans } = await query;

  const storeIds = Array.from(new Set(scans?.map((s) => s.store_id) ?? []));
  const { data: stores } =
    storeIds.length > 0
      ? await admin.from("stores").select("id, name").in("id", storeIds)
      : { data: [] };
  const storeNameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Scans
        </h1>
        <p className="text-muted-foreground">
          {userId ? "Scans de cet utilisateur." : "Historique des scans — Retry crée un nouveau scan."}
        </p>
      </div>

      <AdminScansTable scans={scans ?? []} storeNameById={storeNameById} />
    </div>
  );
}
