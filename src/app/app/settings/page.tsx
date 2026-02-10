import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaCard } from "./mfa-card";
import { ProfileCard } from "./profile-card";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";
import { Button } from "@/components/ui/button";
import { Store, Mail, CreditCard, Calendar } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan, role, created_at")
    .eq("user_id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const planLabel = subscription?.plan ?? profile?.plan ?? "free";
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Gère ton profil, ta sécurité et tes préférences.
        </p>
      </div>

      {/* Account overview */}
      <Card>
        <CardHeader>
          <CardTitle>Mon compte</CardTitle>
          <CardDescription>Aperçu de ton compte FyxxLabs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium capitalize">{planLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Store className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rôle</p>
                <p className="text-sm font-medium capitalize">{profile?.role ?? "user"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Membre depuis</p>
                <p className="text-sm font-medium">{memberSince}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <ProfileCard
        email={user.email ?? ""}
        initialName={profile?.full_name ?? user.user_metadata?.full_name ?? ""}
      />

      {/* Store & integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Boutique & connexions</CardTitle>
          <CardDescription>
            Gère le nom, l&apos;URL, l&apos;objectif et les connexions depuis l&apos;espace dédié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/app/integrations">Ouvrir &quot;Gérer la boutique&quot;</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnement</CardTitle>
          <CardDescription>Gère ton abonnement et tes factures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Plan actuel :</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-sm font-medium capitalize text-primary">
              {planLabel}
            </span>
          </div>
          {subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              Prochain renouvellement :{" "}
              {new Date(subscription.current_period_end).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <Button asChild variant="outline">
            <Link href="/app/billing">Gérer mon abonnement</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Change password */}
      <ChangePasswordCard />

      {/* MFA */}
      <MfaCard />

      {/* Danger zone */}
      <DeleteAccountCard />
    </div>
  );
}
