"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Erreur" });
      } else {
        setMessage({ type: "success", text: "Mot de passe mis à jour avec succès !" });
        setNewPassword("");
        setConfirmPassword("");
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
          <KeyRound className="h-5 w-5" />
          Changer le mot de passe
        </CardTitle>
        <CardDescription>
          Modifie ton mot de passe de connexion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 8 caractères"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Répète le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
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
            Mettre à jour le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
