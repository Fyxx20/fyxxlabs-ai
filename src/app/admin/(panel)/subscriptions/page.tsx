import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AdminSubscriptionsTable } from "./admin-subscriptions-table";

export default async function AdminSubscriptionsPage() {
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
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    redirect("/admin/login?error=unauthorized");
  }

  const admin = getSupabaseAdmin();
  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("user_id, plan, status, trial_start, trial_end, advice_consumed, source, current_period_end, ends_at, updated_at")
    .order("updated_at", { ascending: false });

  const userIds = Array.from(new Set((subscriptions ?? []).map((s) => s.user_id)));
  const { data: profiles } =
    userIds.length > 0
      ? await admin.from("profiles").select("user_id, email").in("user_id", userIds)
      : { data: [] };
  const emailByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.email]));

  const rows = (subscriptions ?? []).map((s) => ({
    ...s,
    email: emailByUser.get(s.user_id) ?? null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Abonnements
        </h1>
        <p className="text-muted-foreground">
          Contrôle des plans (free / pro / lifetime), statuts, trial et conseil consommé.
        </p>
      </div>

      <AdminSubscriptionsTable rows={rows} />
    </div>
  );
}
