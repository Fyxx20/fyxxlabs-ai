import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, ScanSearch, TrendingUp, Store } from "lucide-react";

export default async function AdminDashboardPage() {
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
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const { count: totalUsers } = await admin
    .from("profiles")
    .select("user_id", { count: "exact", head: true });

  const { count: totalStores } = await admin
    .from("stores")
    .select("id", { count: "exact", head: true });

  const { count: activeSubscriptions } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { data: lifetimeSubs } = await admin
    .from("subscriptions")
    .select("id")
    .eq("plan", "lifetime")
    .eq("status", "active");
  const lifetimeUsersCount = lifetimeSubs?.length ?? 0;

  const { count: trialingUsers } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "trialing");

  const { data: scansLast24h } = await admin
    .from("scans")
    .select("id, status")
    .gte("created_at", yesterday.toISOString());

  const scansTotal = scansLast24h?.length ?? 0;
  const scansFailed = scansLast24h?.filter((s) => s.status === "failed").length ?? 0;
  const scansSucceeded = scansLast24h?.filter((s) => s.status === "succeeded").length ?? 0;

  const conversionRate =
    totalUsers && totalUsers > 0 && activeSubscriptions != null
      ? Math.round((activeSubscriptions / totalUsers) * 100)
      : 0;

  const kpis = [
    {
      title: "Utilisateurs",
      value: totalUsers ?? 0,
      icon: Users,
      description: "Total comptes",
    },
    {
      title: "Boutiques",
      value: totalStores ?? 0,
      icon: Store,
      description: "Stores créés",
    },
    {
      title: "Abonnements actifs",
      value: activeSubscriptions ?? 0,
      icon: CreditCard,
      description: "Pro / Business / Lifetime",
    },
    {
      title: "Lifetime",
      value: lifetimeUsersCount,
      icon: CreditCard,
      description: "Accès à vie",
    },
    {
      title: "En essai",
      value: trialingUsers ?? 0,
      icon: TrendingUp,
      description: "Trial en cours",
    },
    {
      title: "Trial → Payant",
      value: `${conversionRate} %`,
      icon: TrendingUp,
      description: "Taux de conversion",
    },
    {
      title: "Analyses (24h)",
      value: scansTotal,
      icon: ScanSearch,
      description: `${scansSucceeded} OK, ${scansFailed} échecs`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Vue globale FyxxLabs
        </h1>
        <p className="text-muted-foreground">
          Vue d’ensemble des utilisateurs, abonnements et scans.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
