"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthOAuthButtons } from "@/components/auth-oauth-buttons";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight, CheckCircle2, Sparkles, WandSparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getOrCreateDeviceId(): string {
    const key = "fyxx_device_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const generated = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, generated);
    return generated;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceId: getOrCreateDeviceId() }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Erreur lors de la creation du compte.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);
      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      router.push("/app/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Erreur reseau. Reessaye.");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-violet-600/[0.24] blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-cyan-500/[0.2] blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-600/[0.15] blur-3xl" />
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
              Cree un compte.
              <span className="block bg-gradient-to-r from-violet-300 via-white to-cyan-300 bg-clip-text text-transparent">
                Debloque une boutique incroyable.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              En quelques clics, tu accedes a l'IA FyxxLabs pour analyser, optimiser et faire passer ton e-commerce au niveau superieur.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                "Analyse IA de conversion immediate",
                "Actions prioritaires pretes a executer",
                "Dashboard premium pense pour scaler",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm text-slate-200">{item}</span>
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

              <h2 className="text-3xl font-bold tracking-tight">Creer mon compte</h2>
              <p className="mt-2 text-sm text-slate-300">
                Analyse gratuite de ta boutique Shopify. Aucun paiement requis.
              </p>

              <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Offre de lancement : onboarding instantane + recommandations IA.
                </span>
              </div>

              <div className="mt-6">
                <AuthOAuthButtons redirectTo="/app/dashboard" />
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 rounded-xl border-white/15 bg-slate-900/50 text-white placeholder:text-slate-500"
                    placeholder="Minimum 6 caracteres"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-violet-600 text-base font-semibold hover:bg-violet-500"
                >
                  <span className="inline-flex items-center gap-2">
                    {loading ? "Creation..." : "Creer mon compte"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </span>
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-300">
                Deja un compte ?{" "}
                <Link href="/login" className="font-semibold text-violet-300 hover:text-white">
                  Se connecter
                </Link>
              </p>
              <p className="mt-2 text-center text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <WandSparkles className="h-3.5 w-3.5" />
                  Pret a impressionner des la premiere visite.
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
