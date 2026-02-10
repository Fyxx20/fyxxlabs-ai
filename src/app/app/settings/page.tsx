import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaCard } from "./mfa-card";
import { ProfileCard } from "./profile-card";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CreditCard,
  Shield,
  Calendar,
  ArrowRight,
  Store,
} from "lucide-react";

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
    : "\u2014";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Param\u00e8tres</h1>
        <p className="text-sm text-muted-foreground mt-1">
          G\u00e9rez votre profil, s\u00e9curit\u00e9 et pr\u00e9f\u00e9rences.
        </p>
      </div>

      {/* Account overview */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mon compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">Email</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">Plan</p>
                <p className="text-sm font-medium capitalize">{planLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">R\u00f4le</p>
                <p className="text-sm font-medium capitalize">{profile?.role ?? "user"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">Membre depuis</p>
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

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/app/integrations" className="group">
          <Card className="border-border/60 transition-colors hover:border-primary/30 h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Ma boutique</p>
                <p className="text-xs text-muted-foreground truncate">
                  Infos et connexions plateforme
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/billing" className="group">
          <Card className="border-border/60 transition-colors hover:border-primary/30 h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Facturation</p>
                <p className="text-xs text-muted-foreground truncate">
                  Abonnement et factures
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Change password */}
      <ChangePasswordCard />

      {/* MFA */}
      <MfaCard />

      {/* Danger zone */}
      <DeleteAccountCard />
    </div>
  );
}
