"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaywallModal } from "@/components/paywall-modal";

export function StartScanButton({
  storeId,
  storeName,
  disabled,
  className,
}: {
  storeId: string;
  storeName?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.code === "PAYWALL_SCAN_LIMIT" && data.show_paywall) {
          setPaywallOpen(true);
        } else {
          alert(data.error ?? "Erreur");
        }
        return;
      }
      setConfirmOpen(false);
      router.push(`/app/scans/${data.id}?new=1`);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert((e as Error).message ?? "Impossible de lancer le scan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={disabled || loading}
            className={cn("gap-2", className)}
          >
            <Zap className="h-4 w-4" />
            {loading ? "Lancement…" : "Lancer une analyse"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lancer une analyse</DialogTitle>
            <DialogDescription>
              Nous allons analyser {storeName ? `« ${storeName} »` : "ta boutique"}.
              Durée estimée : 2 à 4 minutes. Tu seras redirigé vers la page de suivi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleStart} disabled={loading} className="gap-2">
              <Zap className="h-4 w-4" />
              {loading ? "Lancement…" : "Démarrer l'analyse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
