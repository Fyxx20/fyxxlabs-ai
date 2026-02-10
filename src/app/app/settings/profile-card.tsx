"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileCardProps {
  email: string;
  initialName: string;
}

export function ProfileCard({ email, initialName }: ProfileCardProps) {
  const [fullName, setFullName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Erreur" });
      } else {
        setMessage({ type: "success", text: "Profil mis à jour !" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Mon profil
        </CardTitle>
        <CardDescription>Tes informations personnelles.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">L&apos;email ne peut pas être modifié ici.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Nom complet</Label>
            <Input
              id="full-name"
              type="text"
              placeholder="Ton nom"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
