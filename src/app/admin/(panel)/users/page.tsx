import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AdminUsersTable } from "./admin-users-table";
import { AdminCreateUserForm } from "./admin-create-user-form";

export default async function AdminUsersPage() {
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

  const admin = getSupabaseAdmin();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, role, email, created_at, is_banned")
    .order("created_at", { ascending: false });

  const userIds = profiles?.map((p) => p.user_id) ?? [];

  const { data: subscriptions } =
    userIds.length > 0
      ? await admin
          .from("subscriptions")
          .select("user_id, status, trial_end, advice_consumed, current_period_end, plan")
          .in("user_id", userIds)
      : { data: [] };

  const { data: stores } = await admin.from("stores").select("user_id");
  const storesCountByUser = new Map<string, number>();
  for (const s of stores ?? []) {
    storesCountByUser.set(s.user_id, (storesCountByUser.get(s.user_id) ?? 0) + 1);
  }

  const { data: scans } = await admin.from("scans").select("user_id");
  const scansCountByUser = new Map<string, number>();
  for (const s of scans ?? []) {
    if (s.user_id) scansCountByUser.set(s.user_id, (scansCountByUser.get(s.user_id) ?? 0) + 1);
  }

  const subByUser = new Map((subscriptions ?? []).map((s) => [s.user_id, s]));

  const rows = (profiles ?? []).map((p) => ({
    user_id: p.user_id,
    role: p.role,
    email: p.email,
    created_at: p.created_at,
    is_banned: (p as { is_banned?: boolean }).is_banned ?? false,
    subscription: subByUser.get(p.user_id)
      ? {
          status: subByUser.get(p.user_id)!.status,
          trial_end: subByUser.get(p.user_id)!.trial_end,
          advice_consumed: subByUser.get(p.user_id)!.advice_consumed,
          current_period_end: subByUser.get(p.user_id)!.current_period_end,
          plan: (subByUser.get(p.user_id) as { plan?: string })?.plan,
        }
      : undefined,
    stores_count: storesCountByUser.get(p.user_id) ?? 0,
    scans_count: scansCountByUser.get(p.user_id) ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Utilisateurs
        </h1>
        <p className="text-muted-foreground">
          Gestion des comptes : création, rôle, abo à vie, bannir, reset onboarding, boutiques et scans.
        </p>
      </div>

      <AdminCreateUserForm />

      <AdminUsersTable rows={rows} />
    </div>
  );
}
