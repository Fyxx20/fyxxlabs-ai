const SCORE_KEYS = ["conversion", "trust", "offer", "performance", "traffic"] as const;

export function computeDisplayScore(
  scores: Record<string, unknown> | null | undefined,
  fallback: number | null | undefined
): number {
  const values = SCORE_KEYS
    .map((k) => Number(scores?.[k]))
    .filter((v) => Number.isFinite(v));

  if (values.length > 0) {
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  const fromFallback = Number(fallback);
  return Number.isFinite(fromFallback) ? fromFallback : 0;
}
