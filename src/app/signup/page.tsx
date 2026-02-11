"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthOAuthButtons } from "@/components/auth-oauth-buttons";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight, Sparkles, Zap, Shield, Star } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Erreur lors de la création du compte.");
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
    } catch {
      setLoading(false);
      setError("Erreur réseau. Réessayez.");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-slate-900" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 top-0 h-80 w-80 rounded-full bg-violet-600/20 blur-[90px]" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-cyan-500/15 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            Crée ton espace FyxxLabs
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight">
            Un compte, puis un{" "}
            <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
              avantage énorme
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Lance ton diagnostic e-commerce en quelques minutes avec des recommandations prêtes à exécuter.
          </p>
          <div className="mt-8 space-y-3 text-slate-300">
            <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-violet-300" /> IA orientée conversion et marge</p>
            <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-cyan-300" /> Données sécurisées et architecture fiable</p>
            <p className="flex items-center gap-2"><Star className="h-4 w-4 text-violet-300" /> Expérience premium, pensée pour vendre</p>
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
              <CardTitle className="text-3xl font-bold text-white">Créer mon compte</CardTitle>
              <CardDescription className="mt-1 text-slate-300">
                Accède à ton diagnostic et à tes recommandations IA.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <AuthOAuthButtons redirectTo="/app/dashboard" />

            <div className="relative my-2 text-center text-xs uppercase tracking-wider text-slate-400">
              <span className="relative z-10 bg-transparent px-2">ou avec email</span>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 rounded-xl border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500 focus-visible:ring-violet-400"
                />
                <p className="text-xs text-slate-400">Minimum 6 caractères</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-violet-600 text-base font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500"
              >
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-400">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Se connecter
              </Link>
            </p>
            <Link
              href="/app/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.08]"
            >
              Voir une démo du dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
