"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

export function MfaEnroll({ onEnrolled, onCancelled }: { onEnrolled: () => void; onCancelled: () => void }) {
  const [factorId, setFactorId] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa
      .enroll({ factorType: "totp", friendlyName: "FyxxLabs Authenticator" })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
          return;
        }
        if (data?.id) setFactorId(data.id);
        if (data?.totp?.qr_code) setQrCode(data.totp.qr_code);
        if (data?.totp?.secret) setSecret(data.totp.secret);
      });
  }, []);

  async function handleVerify() {
    if (!factorId || !verifyCode.trim()) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr) {
      setError(challengeErr.message);
      setLoading(false);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode.trim(),
    });
    setLoading(false);
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }
    onEnrolled();
  }

  if (!qrCode && !error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Activer la double authentification (2FA)
        </CardTitle>
        <CardDescription>
          Scanne le QR code avec une app d’authentification (Google Authenticator, Authy, etc.) puis entre le code à 6 chiffres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
        {qrCode && (
          <div className="flex justify-center">
            <img
              src={qrCode.startsWith("data:") ? qrCode : `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`}
              alt="QR Code 2FA"
              className="h-48 w-48 rounded border border-border bg-white p-2"
            />
          </div>
        )}
        {secret && (
          <p className="text-center text-xs text-muted-foreground">
            Secret (si tu ne peux pas scanner) : <code className="break-all rounded bg-muted px-1">{secret}</code>
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Code à 6 chiffres</Label>
          <Input
            id="mfa-code"
            placeholder="000000"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={loading || verifyCode.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer la 2FA"}
          </Button>
          <Button variant="outline" onClick={onCancelled}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
