"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Préparation (URL, robots)",
  "Crawl des pages clés (accueil, produit, collection)",
  "Extraction (prix, CTA, avis, confiance)",
  "Sync données connectées (si applicable)",
  "Analyse CRO & scoring",
  "Analyse concurrence & positionnement",
  "Génération du rapport",
];

const TYPICAL_DURATION_SEC = 150; // ~2 min 30

function getProgress(startedAt: string | null): number {
  if (!startedAt) return 0;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  if (elapsed <= 0) return 0;
  const maxProgress = 98;
  const halfLife = 40;
  const progress = maxProgress * (1 - Math.exp(-elapsed / halfLife));
  return Math.min(maxProgress, Math.round(progress));
}

function getEstimatedSecondsRemaining(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  const progress = getProgress(startedAt) / 100;
  if (progress >= 0.98) return 0;
  const totalEstimated = TYPICAL_DURATION_SEC;
  const remaining = totalEstimated * (1 - progress);
  return Math.max(0, Math.round(remaining));
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "Quelques secondes…";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec} s restantes`;
  if (sec === 0) return `${min} min restante`;
  return `${min} min ${sec} s restantes`;
}

export function ScanProgressBlock({ startedAt }: { startedAt: string | null }) {
  const [progress, setProgress] = useState(() => getProgress(startedAt));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setProgress(getProgress(startedAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const stepCount = STEPS.length;
  const completedSteps = Math.floor((progress / 100) * stepCount);
  const currentStep = Math.min(completedSteps, stepCount - 1);
  const estimatedSec = getEstimatedSecondsRemaining(startedAt);

  return (
    <div className="space-y-8">
      {/* Barre 0-100% animée */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Progression de l'analyse</span>
          <span className="tabular-nums font-semibold text-primary">{progress}%</span>
        </div>
        <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse"
            style={{ width: `${Math.min(progress + 8, 100)}%` }}
          />
        </div>
        {estimatedSec !== null && estimatedSec > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Estimation : {formatTime(estimatedSec)}</span>
          </div>
        )}
      </div>

      {/* Étapes avec check */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">Étapes</h3>
        <ul className="space-y-0">
          {STEPS.map((label, i) => {
            const done = i < completedSteps;
            const current = i === currentStep && !done;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-start gap-3 border-l-2 pl-4 pb-5 last:pb-0",
                  i < STEPS.length - 1 ? "border-muted" : "border-transparent"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                    done && "bg-primary text-primary-foreground",
                    current && "bg-primary/20 text-primary ring-2 ring-primary/40",
                    !done && !current && "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : current ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done || current ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {done ? "Terminé" : current ? "En cours…" : "En attente"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Zone logs simulée */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dernière activité
        </h3>
        <div className="space-y-1 font-mono text-xs text-foreground">
          {completedSteps > 0 && (
            <p className="text-muted-foreground">
              ✓ {STEPS[completedSteps - 1]} — terminé
            </p>
          )}
          {currentStep < stepCount && (
            <p className="text-primary">
              → {STEPS[currentStep]} — en cours…
            </p>
          )}
          {!mounted && (
            <p className="text-muted-foreground">Chargement…</p>
          )}
        </div>
      </div>
    </div>
  );
}
