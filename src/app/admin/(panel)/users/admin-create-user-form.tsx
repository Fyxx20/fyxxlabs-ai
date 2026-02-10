"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function AdminCreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLink, setMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        magicLink ? { email: email.trim(), magic_link: true } : { email: email.trim(), password }
      ),
    });
    setLoading(false);
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message ?? `Utilisateur créé: ${data.email ?? data.user_id}`);
      setEmail("");
      setPassword("");
      router.refresh();
    } else {
      setMessage(`Erreur: ${data.error ?? res.statusText}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un utilisateur</CardTitle>
        <CardDescription>
          Email + mot de passe ou lien magique (à envoyer manuellement).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {!magicLink && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="magic"
              checked={magicLink}
              onChange={(e) => setMagicLink(e.target.checked)}
            />
            <Label htmlFor="magic">Générer un lien magique (pas de mot de passe)</Label>
          </div>
          {message && (
            <p className={`text-sm ${message.startsWith("Erreur") ? "text-destructive" : "text-muted-foreground"}`}>
              {message}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Créer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
