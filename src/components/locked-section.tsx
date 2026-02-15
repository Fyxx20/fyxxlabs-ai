"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const BENEFITS = [
  "Checklist complète",
  "Toutes les issues détaillées avec correctifs",
  "Assistant FyxxLabs inclus sur PRO et AGENCE",
  "Fonctionnalités avancées selon plan",
];

interface LockedSectionProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onUnlockClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function LockedSection({
  title = "Accès partiel — passe sur une version supérieure FyxxLabs",
  subtitle = "CREATE 14,99 € (offre fondateur), PRO 39 €/mois, AGENCE 79 €/mois.",
  ctaLabel = "Débloquer l'analyse complète",
  onUnlockClick,
  className = "",
  children,
}: LockedSectionProps) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-border ${className}`}>
      {children && (
        <div className="pointer-events-none select-none blur-sm">
          {children}
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-6">
        <Lock className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium text-foreground text-center">{title}</p>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {subtitle}
        </p>
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="text-primary">•</span> {b}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button asChild>
            <Link href="/app/billing">{ctaLabel}</Link>
          </Button>
          {onUnlockClick && (
            <Button variant="outline" onClick={onUnlockClick}>
              Plus tard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
