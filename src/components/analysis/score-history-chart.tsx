"use client";

import { cn } from "@/lib/utils";

type Point = { date: string; score: number };

export function ScoreHistoryChart({
  data,
  className,
  height = 120,
}: {
  data: Point[];
  className?: string;
  height?: number;
}) {
  if (!data.length) return null;

  const scores = data.map((d) => d.score);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;
  const width = 400;
  const padding = { top: 8, right: 8, bottom: 24, left: 32 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const x = (i: number) => padding.left + (i / (data.length - 1 || 1)) * innerWidth;
  const y = (score: number) =>
    padding.top + innerHeight - ((score - min) / range) * innerHeight;

  const points = data.map((d, i) => `${x(i)},${y(d.score)}`).join(" ");

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[120px] w-full min-w-[280px] max-w-full"
        preserveAspectRatio="none"
        aria-label="Score dans le temps"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
          points={points}
        />
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={x(i)}
            cy={y(d.score)}
            r="3"
            className="fill-primary"
          />
        ))}
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        Score dans le temps ({data.length} analyse{data.length > 1 ? "s" : ""})
      </p>
    </div>
  );
}
