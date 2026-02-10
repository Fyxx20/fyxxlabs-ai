import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaCard } from "./mfa-card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Gestion de ta boutique et préférences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Boutique & connexions</CardTitle>
          <CardDescription>
            Gère le nom, l'URL, l'objectif et les connexions depuis l'espace dédié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/app/integrations">Ouvrir "Gérer la boutique"</Link>
          </Button>
        </CardContent>
      </Card>

      <MfaCard />

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>
            Supprimer ton compte ou tes données (à venir).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pour demander la suppression de tes données, contacte-nous à contact@fyxxlabs.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
