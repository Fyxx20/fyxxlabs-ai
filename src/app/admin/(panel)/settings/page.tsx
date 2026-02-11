import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaCard } from "@/app/app/settings/mfa-card";
import { AdminFeatureFlagsForm } from "./admin-feature-flags-form";

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value_json")
    .eq("key", "feature_flags")
    .single();

  const flags = (settings?.value_json as Record<string, unknown>) ?? {};

  const initialFlags = {
    enable_lighthouse_paid: Boolean(flags.enable_lighthouse_paid ?? false),
    scan_rate_limit_minutes: Number(flags.scan_rate_limit_minutes ?? 10),
    max_pages_per_scan: Number(flags.max_pages_per_scan ?? 8),
    max_scans_per_day_paid: Number(flags.max_scans_per_day_paid ?? 50),
  };

  return (
    <div className="space-y-8 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Paramètres admin
        </h1>
        <p className="text-slate-300">
          Centre de configuration globale: sécurité, limites, options runtime.
        </p>
      </div>

      <MfaCard />

      <AdminFeatureFlagsForm initialFlags={initialFlags} />

      <Card className="border-white/10 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Valeurs effectives actuelles</CardTitle>
          <CardDescription className="text-slate-300">
            Reflète l’état de `admin_settings.feature_flags`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-300">enable_lighthouse_paid</dt>
              <dd>{String(flags.enable_lighthouse_paid ?? false)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-300">scan_rate_limit_minutes</dt>
              <dd>{String(flags.scan_rate_limit_minutes ?? 10)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-300">max_pages_per_scan</dt>
              <dd>{String(flags.max_pages_per_scan ?? 8)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-300">max_scans_per_day_paid</dt>
              <dd>{String(flags.max_scans_per_day_paid ?? 50)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
