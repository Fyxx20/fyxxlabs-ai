import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonSet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceSet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectRef = url.replace(/^https:\/\//, "").replace(/\.supabase\.co.*$/, "") || "—";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let storesTest: { ok: boolean; error?: string; count?: number } = { ok: false };
  try {
    const { data, error } = await supabase.from("stores").select("id").limit(1);
    if (error) storesTest = { ok: false, error: error.message };
    else storesTest = { ok: true, count: data?.length ?? 0 };
  } catch (e) {
    storesTest = { ok: false, error: (e as Error).message };
  }

  return (
    <div className="container max-w-2xl py-12">
      <h1 className="text-2xl font-bold">Debug (dev only)</h1>
      <p className="text-muted-foreground">
        Vérification Supabase et table <code>stores</code>.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Variables d’environnement</CardTitle>
          <CardDescription>
            URL et clés (tronquées). En prod cette page n’est pas accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-sm">
          <p>
            <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL:</span>{" "}
            {url ? `${url.slice(0, 30)}…` : "non défini"}
          </p>
          <p>
            <span className="text-muted-foreground">Project ref:</span> {projectRef}
          </p>
          <p>
            <span className="text-muted-foreground">ANON_KEY défini:</span>{" "}
            {anonSet ? "oui" : "non"}
          </p>
          <p>
            <span className="text-muted-foreground">SERVICE_ROLE_KEY défini:</span>{" "}
            {serviceSet ? "oui" : "non"}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Utilisateur courant (anon key).</CardDescription>
        </CardHeader>
        <CardContent className="font-mono text-sm">
          {user ? (
            <p>
              <span className="text-muted-foreground">user_id:</span> {user.id}
            </p>
          ) : (
            <p className="text-muted-foreground">Non connecté.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test table stores</CardTitle>
          <CardDescription>
            SELECT sur public.stores (schema cache). Si erreur : migrations non appliquées ou mauvais projet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storesTest.ok ? (
            <p className="text-green-600 dark:text-green-400">
              OK — table <code>stores</code> accessible. (count: {storesTest.count})
            </p>
          ) : (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Échec</p>
              <p>{storesTest.error}</p>
              <p className="mt-2 text-muted-foreground">
                Applique les migrations : <code>supabase db push</code> ou via le dashboard Supabase (SQL Editor).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
