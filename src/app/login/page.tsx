"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthOAuthButtons } from "@/components/auth-oauth-buttons";
import { MfaVerify } from "@/components/mfa-verify";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight } from "lucide-react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/app/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "missing_code"
      ? "Connexion annulée ou session expirée."
      : searchParams.get("error") === "config"
        ? "Configuration OAuth manquante."
        : searchParams.get("error")
          ? decodeURIComponent(searchParams.get("error")!)
          : null
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAlreadyLoggedIn(!!user);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      const msg =
        err.message === "Failed to fetch" || err.message?.toLowerCase().includes("fetch")
          ? "Impossible de joindre le serveur. Vérifiez votre connexion et que .env.local contient NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (puis redémarrez le serveur)."
          : err.message;
      setError(msg);
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
          <BrandLogo href="/" showText={false} />
        </div>
        <MfaVerify onSuccess={handleMfaSuccess} />
      </div>
    );
  }

  if (alreadyLoggedIn === true) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <BrandLogo href="/" showText={false} />
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>
                Vous êtes déjà connecté.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Accédez à votre espace pour continuer le diagnostic ou gérer votre boutique.
              </p>
              <Button asChild className="w-full gap-2">
                <Link href="/app/dashboard">
                  Continuer vers mon espace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/" className="font-medium text-primary hover:underline">
                  Retour à l’accueil
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLogo href="/" showText={false} />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Accédez à votre tableau de bord FyxxLabs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupabaseConfigured && (
              <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                Supabase n’est pas configuré. Ajoutez <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
                <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans <code className="rounded bg-muted px-1">.env.local</code>, puis redémarrez <code className="rounded bg-muted px-1">npm run dev</code>.
              </p>
            )}
            <AuthOAuthButtons redirectTo={redirectTo} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ou avec email
                </span>
              </div>
            </div>
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
                  placeholder="toi@exemple.com"
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
              Pas encore de compte ?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                S’inscrire
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-muted/30">Chargement…</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
