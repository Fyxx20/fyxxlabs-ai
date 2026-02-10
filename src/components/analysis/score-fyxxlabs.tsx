"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 70
      ? "hsl(152 69% 45%)"
      : clamped >= 40
        ? "hsl(38 92% 50%)"
        : "hsl(0 84% 60%)";

  const bgColor =
    clamped >= 70
      ? "hsl(152 69% 45% / 0.15)"
      : clamped >= 40
        ? "hsl(38 92% 50% / 0.15)"
        : "hsl(0 84% 60% / 0.15)";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ width: size, height: size }}
          >
            <motion.span
              className="text-4xl font-bold tabular-nums text-foreground"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {clamped}
            </motion.span>
            <span className="text-xs font-medium text-muted-foreground">/100</span>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">Score FyxxLabs</p>
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
