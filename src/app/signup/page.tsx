"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { BrandLogo } from "@/components/brand-logo";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1: Create the user via our server API (auto-confirmed, no email verification)
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

      // Step 2: Sign in immediately with the confirmed credentials
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

      // Success → redirect to dashboard
      router.push("/app/dashboard");
    } catch {
      setLoading(false);
      setError("Erreur réseau. Réessayez.");
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle>Vérifiez votre boîte mail</CardTitle>
            <CardDescription>
              Un lien de confirmation a été envoyé à {email}. Cliquez dessus pour
              activer votre compte. l’analyse incluse, accès restreint après 3 jours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Retour à la connexion
              </Button>
            </Link>
          </CardContent>
        </Card>
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
            <CardTitle>Voir pourquoi ta boutique ne vend pas</CardTitle>
            <CardDescription>
              Diagnostic IA gratuit · 3 minutes · 1 recommandation concrète. Essai 3 jours, puis Starter 9,99 €, Pro 19,99 € ou Elite 34,99 €.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuthOAuthButtons />
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
                  minLength={6}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Création…" : "Voir pourquoi ma boutique ne vend pas"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
