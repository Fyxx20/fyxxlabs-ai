import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AdminStoresTable } from "./admin-stores-table";

export default async function AdminStoresPage({
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
    .from("stores")
    .select("id, user_id, name, website_url, goal, created_at")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data: stores } = await query;

  const userIds = Array.from(new Set(stores?.map((s) => s.user_id) ?? []));
  const { data: profiles } =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds)
      : { data: [] };
  const emailByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.email]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Boutiques
        </h1>
        <p className="text-muted-foreground">
          {userId ? "Boutiques de cet utilisateur." : "Liste des boutiques — Rescan, Supprimer."}
        </p>
      </div>

      <AdminStoresTable stores={stores ?? []} emailByUser={emailByUser} />
    </div>
  );
}
