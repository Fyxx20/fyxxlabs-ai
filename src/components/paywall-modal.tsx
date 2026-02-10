"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  "Déblocage des sections avancées (concurrence, recommandations détaillées)",
  "Scans quotidiens selon ton plan",
  "Activation du chatbot FyxxLabs (limité ou illimité selon l'offre)",
  "Historique et suivi complet des actions",
];

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShown?: () => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(next: boolean) {
    if (next) {
      setLoading(true);
      try {
        await fetch("/api/paywall/shown", { method: "POST" });
      } finally {
        setLoading(false);
      }
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accès restreint</DialogTitle>
          <DialogDescription>
            Cette fonctionnalité fait partie des versions supérieures FyxxLabs.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="text-primary">•</span> {b}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Essai gratuit: 3 jours avec 1 scan. Ensuite: Starter 9,99 €, Pro 19,99 €, Elite 34,99 € (mensuel) ou annuel.
        </p>
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link href="/app/billing">Voir les abonnements</Link>
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => handleOpenChange(false)}
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
