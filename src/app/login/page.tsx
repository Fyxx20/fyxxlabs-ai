"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthOAuthButtons } from "@/components/auth-oauth-buttons";
import { MfaVerify } from "@/components/mfa-verify";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";

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
      ? "Connexion annulee ou session expiree."
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

    if (!isSupabaseConfigured) {
      setError("Configuration Supabase manquante. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
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

  function handleMfaSuccess() {
    router.push(redirectTo);
    router.refresh();
  }

  if (alreadyLoggedIn === null) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.2),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.16),transparent_35%)]" />
        <p className="relative text-sm text-slate-300">Chargement...</p>
      </div>
    );
  }

  if (showMfaVerify) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <BrandLogo href="/" showText={false} className="text-white" />
          </div>
          <MfaVerify onSuccess={handleMfaSuccess} />
        </div>
      </div>
    );
  }

  if (alreadyLoggedIn) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <BrandLogo href="/" showText={false} className="text-white" />
          </div>
          <h1 className="text-center text-2xl font-bold">Vous etes deja connecte</h1>
          <p className="mt-2 text-center text-sm text-slate-300">
            Accede directement a ton espace FyxxLabs.
          </p>
          <Button asChild className="mt-6 w-full gap-2 rounded-xl bg-violet-600 hover:bg-violet-500">
            <Link href="/app/dashboard">
              Continuer vers mon espace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-4 text-center text-sm text-slate-400">
            <Link href="/" className="font-medium text-violet-300 hover:text-white">
              Retour a l'accueil
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-600/[0.22] blur-3xl" />
        <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-cyan-500/[0.2] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-blue-600/[0.15] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
          <section className="hidden lg:block">
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 font-bold">
                F
              </span>
              <span className="text-lg font-semibold">FyxxLabs</span>
            </Link>
            <h1 className="mt-8 text-5xl font-black leading-tight">
              Reprends le controle
              <span className="block bg-gradient-to-r from-violet-300 via-white to-cyan-300 bg-clip-text text-transparent">
                de ta croissance.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Connecte-toi et transforme ta boutique avec des recommandations IA, un dashboard premium et des actions a fort impact.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                { icon: ShieldCheck, text: "Connexion securisee avec Supabase" },
                { icon: Sparkles, text: "Insights IA prets a executer" },
                { icon: Star, text: "Experience premium pensee pour convertir" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <Icon className="h-4 w-4 text-violet-300" />
                  <span className="text-sm text-slate-200">{text}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full">
            <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <BrandLogo href="/" showText={false} className="text-white" />
                <Link href="/" className="text-sm text-slate-300 hover:text-white">
                  Retour accueil
                </Link>
              </div>

              <h2 className="text-3xl font-bold tracking-tight">Connexion</h2>
              <p className="mt-2 text-sm text-slate-300">
                Accede a ton tableau de bord FyxxLabs.
              </p>

              <div className="mt-6">
                <AuthOAuthButtons redirectTo={redirectTo} />
              </div>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-white/10" />
                OU AVEC EMAIL
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
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
                    className="h-11 rounded-xl border-white/15 bg-slate-900/50 text-white placeholder:text-slate-500"
                    placeholder="vous@exemple.com"
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
                    className="h-11 rounded-xl border-white/15 bg-slate-900/50 text-white placeholder:text-slate-500"
                    placeholder="********"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-violet-600 text-base font-semibold hover:bg-violet-500"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-300">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="font-semibold text-violet-300 hover:text-white">
                  S'inscrire
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
