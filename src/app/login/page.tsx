"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthOAuthButtons } from "@/components/auth-oauth-buttons";
import { MfaVerify } from "@/components/mfa-verify";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight, Shield, Sparkles, Zap } from "lucide-react";

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
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const lowered = signInError.message.toLowerCase();
      if (lowered.includes("aal2") || lowered.includes("mfa")) {
        setShowMfaVerify(true);
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      setShowMfaVerify(true);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  const pageBackdrop = (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-600/20 blur-[90px]" />
        <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-20 bg-slate-900" />
    </>
  );

  function handleMfaSuccess() {
    router.push(redirectTo);
    router.refresh();
  }

  if (showMfaVerify) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-white">
        {pageBackdrop}
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
          <MfaVerify onSuccess={handleMfaSuccess} />
        </div>
      </div>
    );
  }

  if (alreadyLoggedIn) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-white">
        {pageBackdrop}
        <Card className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Session déjà active</CardTitle>
            <CardDescription className="text-slate-300">
              Tu es déjà connecté à ton espace FyxxLabs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full gap-2 rounded-xl bg-violet-600 hover:bg-violet-500">
              <Link href="/app/dashboard">
                Aller au dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-center text-sm text-slate-400">
              <Link href="/" className="font-medium text-cyan-300 hover:text-cyan-200">
                Retour à l’accueil
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyLoggedIn === null) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">Chargement...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {pageBackdrop}
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            Espace privé FyxxLabs
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight">
            Bienvenue dans ton{" "}
            <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
              cockpit IA
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Connecte-toi pour analyser ta boutique, prioriser les actions qui font monter la conversion,
            et exécuter plus vite que la concurrence.
          </p>
          <div className="mt-8 space-y-3 text-slate-300">
            <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-violet-300" /> Scans intelligents orientés revenus</p>
            <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-cyan-300" /> Données sécurisées et sessions protégées</p>
            <p className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-violet-300" /> Plan d’actions concret en quelques minutes</p>
          </div>
        </section>

        <Card className="w-full rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <BrandLogo href="/" className="h-10 w-10 rounded-xl bg-violet-600 text-white" />
              <Link href="/" className="text-sm text-slate-400 hover:text-white">
                Accueil
              </Link>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-white">Connexion</CardTitle>
              <CardDescription className="mt-1 text-slate-300">
                Reprends ton optimisation là où tu t’es arrêté.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <AuthOAuthButtons redirectTo={redirectTo} />

            <div className="relative my-2 text-center text-xs uppercase tracking-wider text-slate-400">
              <span className="relative z-10 bg-transparent px-2">ou avec email</span>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500 focus-visible:ring-violet-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 rounded-xl border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500 focus-visible:ring-violet-400"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-violet-600 text-base font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-400">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Créer un compte
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
