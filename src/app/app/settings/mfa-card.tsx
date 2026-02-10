"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2, Loader2 } from "lucide-react";
import { MfaEnroll } from "@/components/mfa-enroll";

export function MfaCard() {
  const [factors, setFactors] = useState<{ totp?: { id: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        setFactors(data ?? null);
      })
      .finally(() => setLoading(false));
  }, [showEnroll]);

  async function handleUnenroll() {
    if (!factors?.totp?.[0] || !confirm("Désactiver la 2FA ? Tu pourras la réactiver plus tard.")) return;
    setUnenrolling(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factors.totp[0].id });
    setUnenrolling(false);
    if (error) return;
    setFactors({ totp: [] });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (showEnroll) {
    return (
      <MfaEnroll
        onEnrolled={() => {
          setShowEnroll(false);
          setFactors({ totp: [{ id: "enrolled" }] });
        }}
        onCancelled={() => setShowEnroll(false)}
      />
    );
  }

  const hasMfa = factors?.totp && factors.totp.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Double authentification (2FA)
        </CardTitle>
        <CardDescription>
          Renforce la sécurité de ton compte avec un code à 6 chiffres (Google Authenticator, Authy, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasMfa ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">2FA activée</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnenroll} disabled={unenrolling}>
              {unenrolling ? "Désactivation…" : "Désactiver"}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowEnroll(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Activer la double authentification
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
