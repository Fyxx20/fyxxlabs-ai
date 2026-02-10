"use client";

import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Accès au site",
  "Détection de la plateforme",
  "Analyse de la page d'accueil",
  "Analyse des pages produits",
  "Analyse du tunnel de conversion",
  "Analyse des signaux de confiance",
  "Synthèse globale",
];

function getSimulatedProgress(createdAt: string | null): number {
  if (!createdAt) return 0;
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
  if (elapsed <= 0) return 0;
  const maxProgress = 92;
  const halfLife = 45;
  const progress = maxProgress * (1 - Math.exp(-elapsed / halfLife));
  return Math.min(maxProgress, Math.round(progress));
}

export function ScanProgressTimeline({
  createdAt,
  className,
}: {
  createdAt: string | null;
  className?: string;
}) {
  const progress = getSimulatedProgress(createdAt);
  const stepCount = STEPS.length;
  const completedSteps = Math.floor((progress / 100) * stepCount);
  const currentStep = Math.min(completedSteps, stepCount - 1);

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Progression de l'analyse
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
            {progress}%
          </span>
        </div>
      </div>
      <ul className="space-y-0">
        {STEPS.map((label, i) => {
          const done = i < completedSteps;
          const current = i === currentStep && !done;
          return (
            <li
              key={label}
              className={cn(
                "flex items-start gap-3 border-l-2 pl-4 pb-4 last:pb-0",
                i < STEPS.length - 1 ? "border-muted" : "border-transparent"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  done && "bg-primary text-primary-foreground",
                  current && "bg-primary/20 text-primary",
                  !done && !current && "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : current ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    (done || current) ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {done ? "Terminé" : current ? "En cours" : "En attente"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
