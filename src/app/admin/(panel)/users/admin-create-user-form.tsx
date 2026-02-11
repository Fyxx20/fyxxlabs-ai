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
    <Card className="border-white/10 bg-slate-900/70 text-slate-100">
      <CardHeader>
        <CardTitle>Créer un utilisateur</CardTitle>
        <CardDescription className="text-slate-300">
          Email + mot de passe ou lien magique (à envoyer manuellement).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-white/15 bg-slate-950 text-slate-100 placeholder:text-slate-400"
            />
          </div>
          {!magicLink && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="border-white/15 bg-slate-950 text-slate-100 placeholder:text-slate-400"
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
            <Label htmlFor="magic" className="text-slate-200">Générer un lien magique (pas de mot de passe)</Label>
          </div>
          {message && (
            <p className={`text-sm ${message.startsWith("Erreur") ? "text-rose-300" : "text-emerald-300"}`}>
              {message}
            </p>
          )}
          <Button type="submit" disabled={loading} className="bg-violet-600 text-white hover:bg-violet-500">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Créer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
