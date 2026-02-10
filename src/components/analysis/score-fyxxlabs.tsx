"use client";

import { cn } from "@/lib/utils";

const CRITERIA_COUNT = 5;

function interpretation(score: number): string {
  if (score >= 70) return "Score supérieur à la moyenne observée sur ce type de boutique.";
  if (score >= 40) return "Score dans la moyenne. Plusieurs axes d'amélioration identifiés.";
  return "Score inférieur à la moyenne observée sur ce type de boutique.";
}

export function ScoreFyxxLabs({
  score,
  className,
  showInterpretation = true,
}: {
  score: number;
  className?: string;
  showInterpretation?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col items-center">
        <div
          className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-muted bg-card"
          aria-label={`Score FyxxLabs ${clamped} sur 100`}
        >
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {clamped}
          </span>
          <span className="absolute -bottom-1 text-xs font-medium text-muted-foreground">
            /100
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">Score FyxxLabs</p>
      </div>
      {showInterpretation && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            {interpretation(clamped)}
          </p>
          <p className="text-xs text-muted-foreground">
            Ce score est calculé à partir de {CRITERIA_COUNT} critères mesurés sur votre boutique.
          </p>
        </div>
      )}
    </div>
  );
}
