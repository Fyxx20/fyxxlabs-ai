import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaCard } from "@/app/app/settings/mfa-card";

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value_json")
    .eq("key", "feature_flags")
    .single();

  const flags = (settings?.value_json as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Paramètres admin
        </h1>
        <p className="text-muted-foreground">
          Feature flags et limites (lecture seule pour le MVP).
        </p>
      </div>

      <MfaCard />

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>
            Modifier ces valeurs en base (table admin_settings) ou via une API dédiée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">enable_lighthouse_paid</dt>
              <dd>{String(flags.enable_lighthouse_paid ?? false)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">scan_rate_limit_minutes</dt>
              <dd>{String(flags.scan_rate_limit_minutes ?? 10)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">max_pages_per_scan</dt>
              <dd>{String(flags.max_pages_per_scan ?? 8)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">max_scans_per_day_paid</dt>
              <dd>{String(flags.max_scans_per_day_paid ?? 50)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
