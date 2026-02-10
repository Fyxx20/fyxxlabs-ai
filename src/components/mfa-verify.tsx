"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, LogOut } from "lucide-react";

export function MfaVerify({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noFactorState, setNoFactorState] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNoFactorState(false);
    setLoading(true);
    const supabase = createClient();
    const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(listErr.message);
      setLoading(false);
      return;
    }
    const totpFactor = (factorsData as { totp?: { id: string }[] })?.totp?.[0] ?? (factorsData as { data?: { totp?: { id: string }[] } })?.data?.totp?.[0];
    if (!totpFactor) {
      setNoFactorState(true);
      setError("Aucun facteur TOTP enregistré pour ce compte. La 2FA n’a peut‑être pas été finalisée (il faut entrer un code une fois après le QR).");
      setLoading(false);
      return;
    }
    const factorId = typeof totpFactor === "object" && totpFactor !== null && "id" in totpFactor ? totpFactor.id : String(totpFactor);
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeErr) {
      setError(challengeErr.message);
      setLoading(false);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setLoading(false);
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }
    onSuccess();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Vérification en deux étapes
        </CardTitle>
        <CardDescription>
          Entre le code à 6 chiffres de ton application d’authentification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="space-y-3">
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              {noFactorState && (
                <p className="text-sm text-muted-foreground">
                  Déconnecte-toi puis reconnecte-toi ; si le problème continue, la 2FA n'a peut-être pas été activée jusqu'au bout (il faut valider un code juste après avoir scanné le QR).
                </p>
              )}
              {noFactorState && (
                <Button type="button" variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter et réessayer
                </Button>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="mfa-verify-code">Code</Label>
            <Input
              id="mfa-verify-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
