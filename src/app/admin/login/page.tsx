"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MfaVerify } from "@/components/mfa-verify";

function AdminLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin/dashboard";
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "unauthorized"
      ? "Accès réservé aux administrateurs."
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("Accès réservé aux administrateurs.");
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      setShowMfaVerify(true);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  function handleMfaSuccess() {
    router.push(redirectTo);
    router.refresh();
  }

  if (showMfaVerify) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
        <div className="mb-8 flex justify-center">
          <BrandLogo href="/" label="FyxxLabs Admin" />
        </div>
        <MfaVerify onSuccess={handleMfaSuccess} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900/20 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <BrandLogo href="/" showText={false} />
          <span className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            Admin
          </span>
        </div>
        <Card className="shadow-lg border-amber-500/20">
          <CardHeader>
            <CardTitle>Connexion admin</CardTitle>
            <CardDescription>
              Réservé aux administrateurs FyxxLabs. Accès restreint.
            </CardDescription>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Connectez-vous uniquement si vous disposez des droits administrateur.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@storepilot.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                ← Retour au site
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900/20">Chargement…</div>}>
      <AdminLoginPageContent />
    </Suspense>
  );
}
