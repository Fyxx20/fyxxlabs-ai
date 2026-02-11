import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, ScanSearch, TrendingUp, Store, ArrowRight, Shield, FileText, Link2 } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

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

  const { count: bannedUsers } = await admin
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("is_banned", true);

  const { count: connectedIntegrations } = await admin
    .from("store_integrations")
    .select("id", { count: "exact", head: true })
    .eq("status", "connected");

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
    {
      title: "Utilisateurs bannis",
      value: bannedUsers ?? 0,
      icon: Shield,
      description: "Comptes bloqués",
    },
    {
      title: "Intégrations connectées",
      value: connectedIntegrations ?? 0,
      icon: Link2,
      description: "Toutes boutiques confondues",
    },
  ];

  return (
    <div className="space-y-8 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Vue globale FyxxLabs
        </h1>
        <p className="text-slate-300">
          Vue d’ensemble des utilisateurs, abonnements et scans.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-white/10 bg-slate-900/70 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
              <p className="text-xs text-slate-300">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/10 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Centre de contrôle</CardTitle>
          <CardDescription className="text-slate-300">
            Raccourcis vers les zones de gestion les plus utilisées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/admin/users", label: "Gérer utilisateurs", desc: "Rôles, ban, reset password", icon: Users },
              { href: "/admin/subscriptions", label: "Gérer abonnements", desc: "Plans, trial, lifetime", icon: CreditCard },
              { href: "/admin/stores", label: "Gérer boutiques", desc: "Rescan, suppression", icon: Store },
              { href: "/admin/scans", label: "Suivre scans", desc: "Erreurs, retry", icon: ScanSearch },
              { href: "/admin/integrations", label: "Intégrations", desc: "Shopify / Woo / Presta", icon: Link2 },
              { href: "/admin/settings", label: "Paramètres globaux", desc: "Feature flags live", icon: Shield },
              { href: "/admin/logs", label: "Audit logs", desc: "Historique actions admin", icon: FileText },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-violet-400/40 hover:bg-violet-500/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <item.icon className="h-4 w-4 text-violet-200" />
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-violet-200" />
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-300">{item.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
