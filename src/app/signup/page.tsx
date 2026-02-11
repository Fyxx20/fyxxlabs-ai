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
              <Button variant="outline" className="w-full">Retour à la connexion</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <BrandLogo className="mx-auto mb-2 h-8 w-8" />
          <CardTitle>Créer mon compte</CardTitle>
          <CardDescription>
            Analyse gratuite de votre boutique Shopify. Aucun paiement requis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-primary"
            />
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-primary"
            />
            <div className="text-xs text-muted-foreground">Minimum 6 caractères</div>
            <Button type="submit" className="w-full mt-2 bg-primary text-primary-foreground font-semibold text-lg rounded-xl shadow-md hover:bg-primary/90 transition-all">
              {loading ? "Création…" : "Voir pourquoi ma boutique ne vend pas"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ? <Link href="/login" className="text-accent underline font-semibold">Se connecter</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  }



