"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

export function DeleteAccountCard() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirmText !== "SUPPRIMER") return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        setLoading(false);
      } else {
        router.push("/login");
      }
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  }

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Trash2 className="h-5 w-5" />
          Supprimer mon compte
        </CardTitle>
        <CardDescription>
          Supprime définitivement ton compte et toutes tes données. Cette action est irréversible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showConfirm ? (
          <Button variant="destructive" onClick={() => setShowConfirm(true)}>
            Supprimer mon compte
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="text-sm">
                <p className="font-medium text-red-700 dark:text-red-300">
                  Attention : cette action est irréversible !
                </p>
                <p className="mt-1 text-red-600/80 dark:text-red-400/80">
                  Toutes tes données, boutiques, scans et abonnements seront supprimés définitivement.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Tape <span className="font-mono font-bold text-red-600 dark:text-red-400">SUPPRIMER</span> pour confirmer :
              </p>
              <Input
                type="text"
                placeholder="SUPPRIMER"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="max-w-xs border-red-500/30"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== "SUPPRIMER" || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer la suppression
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                  setError("");
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
