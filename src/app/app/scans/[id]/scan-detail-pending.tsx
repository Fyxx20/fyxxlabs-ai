"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 12;

export function ScanDetailPending({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        if (cancelled) return;
        if (res.ok) {
          router.replace(`/app/scans/${scanId}`, { scroll: false });
          router.refresh();
          return;
        }
      } catch {
        // ignore
      }
      setAttempt((a) => a + 1);
    };

    const t = setInterval(() => {
      check();
    }, POLL_INTERVAL_MS);
    check();

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [scanId, router]);

  const giveUp = attempt >= MAX_ATTEMPTS;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <CardTitle className="text-center">
            {giveUp ? "Analyse introuvable" : "Création de l'analyse en cours…"}
          </CardTitle>
          <CardDescription className="text-center">
            {giveUp
              ? "L'analyse n'a pas pu être chargée. Elle a peut-être échoué ou a été supprimée."
              : "La page se met à jour automatiquement dans quelques secondes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/app/scans">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux scans
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
