import "server-only";
import type { MarketAnalysisResult } from "@/lib/market-analysis";

export type PricingPositioning = "low" | "mid" | "premium";

export interface PhysicalPricingInput {
  market: MarketAnalysisResult;
  sourceCost?: number | null;
  shippingCost?: number | null;
  feePercent?: number;
  targetPositioning?: PricingPositioning;
}

export interface DigitalPricingInput {
  market: MarketAnalysisResult;
  productionCost?: number | null;
  transactionFeePercent?: number;
  targetPositioning?: PricingPositioning;
}

export interface PricingRecommendation {
  currency: string;
  safe: number;
  optimal: number;
  aggressive: number;
  estimatedMinMarginPct: number;
  estimatedOptimalMarginPct: number;
  positioning: PricingPositioning;
  explanation: {
    why: string[];
    competitorLow: number | null;
    competitorAvg: number | null;
    competitorHigh: number | null;
    baselineCost: number;
  };
}

function applyPsychologicalEnding(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const floor = Math.floor(price);
  const decimals = price < 25 ? 0.97 : 0.99;
  return Number((floor + decimals).toFixed(2));
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Number((((numerator - denominator) / denominator) * 100).toFixed(2));
}

function clampByMarket(price: number, low: number | null, high: number | null): number {
  if (low == null || high == null) return price;
  const minBound = low * 0.9;
  const maxBound = high * 1.25;
  return Math.min(Math.max(price, minBound), maxBound);
}

function choosePositioning(
  explicit: PricingPositioning | undefined,
  market: MarketAnalysisResult
): PricingPositioning {
  if (explicit) return explicit;
  if (!market.competitorAvg) return "mid";
  const spread = (market.competitorHigh ?? market.competitorAvg) - (market.competitorLow ?? market.competitorAvg);
  if (spread > market.competitorAvg * 0.6) return "premium";
  return "mid";
}

export function computePhysicalPricing(input: PhysicalPricingInput): PricingRecommendation {
  const feePercent = input.feePercent ?? 2.9;
  const sourceCost = Math.max(0, input.sourceCost ?? input.market.sourcePrice ?? 0);
  const shippingCost = Math.max(0, input.shippingCost ?? 0);
  const baselineCost = sourceCost + shippingCost;
  const competitorAvg = input.market.competitorAvg;
  const positioning = choosePositioning(input.targetPositioning, input.market);

  const marginTarget =
    positioning === "premium" ? 2.4 :
    positioning === "mid" ? 2.0 : 1.7;

  const marketAnchor = competitorAvg ?? (baselineCost > 0 ? baselineCost * marginTarget : 39);
  const safeRaw = baselineCost > 0 ? baselineCost * 1.55 : marketAnchor * 0.82;
  const optimalRaw = Math.max(marketAnchor, baselineCost > 0 ? baselineCost * marginTarget : marketAnchor);
  const aggressiveRaw = Math.max(optimalRaw * 1.14, baselineCost > 0 ? baselineCost * (marginTarget + 0.35) : optimalRaw * 1.14);

  const safe = applyPsychologicalEnding(clampByMarket(safeRaw, input.market.competitorLow, input.market.competitorHigh));
  const optimal = applyPsychologicalEnding(clampByMarket(optimalRaw, input.market.competitorLow, input.market.competitorHigh));
  const aggressive = applyPsychologicalEnding(clampByMarket(aggressiveRaw, input.market.competitorLow, input.market.competitorHigh));

  const netSafe = safe * (1 - feePercent / 100);
  const netOptimal = optimal * (1 - feePercent / 100);

  return {
    currency: input.market.currency,
    safe,
    optimal,
    aggressive,
    estimatedMinMarginPct: pct(netSafe, baselineCost),
    estimatedOptimalMarginPct: pct(netOptimal, baselineCost),
    positioning,
    explanation: {
      why: [
        "Prix basés sur coût source, frais et signaux marché.",
        "Application d'un arrondi psychologique (.97/.99).",
        "Trois scénarios pour tester conversion vs marge.",
      ],
      competitorLow: input.market.competitorLow,
      competitorAvg: input.market.competitorAvg,
      competitorHigh: input.market.competitorHigh,
      baselineCost,
    },
  };
}

export function computeDigitalPricing(input: DigitalPricingInput): PricingRecommendation {
  const transactionFeePercent = input.transactionFeePercent ?? 3.2;
  const baselineCost = Math.max(0, input.productionCost ?? 0);
  const marketAvg = input.market.competitorAvg ?? 39;
  const positioning = choosePositioning(input.targetPositioning, input.market);

  const multiplier =
    positioning === "premium" ? 1.35 :
    positioning === "mid" ? 1.0 : 0.82;
  const anchor = marketAvg * multiplier;

  const safeRaw = Math.max(anchor * 0.82, baselineCost > 0 ? baselineCost * 1.5 : anchor * 0.82);
  const optimalRaw = Math.max(anchor, baselineCost > 0 ? baselineCost * 2.2 : anchor);
  const aggressiveRaw = Math.max(anchor * 1.22, baselineCost > 0 ? baselineCost * 2.8 : anchor * 1.22);

  const safe = applyPsychologicalEnding(clampByMarket(safeRaw, input.market.competitorLow, input.market.competitorHigh));
  const optimal = applyPsychologicalEnding(clampByMarket(optimalRaw, input.market.competitorLow, input.market.competitorHigh));
  const aggressive = applyPsychologicalEnding(clampByMarket(aggressiveRaw, input.market.competitorLow, input.market.competitorHigh));

  const netSafe = safe * (1 - transactionFeePercent / 100);
  const netOptimal = optimal * (1 - transactionFeePercent / 100);

  return {
    currency: input.market.currency,
    safe,
    optimal,
    aggressive,
    estimatedMinMarginPct: pct(netSafe, baselineCost || 1),
    estimatedOptimalMarginPct: pct(netOptimal, baselineCost || 1),
    positioning,
    explanation: {
      why: [
        "Prix calibrés sur valeur perçue et niveau de marché.",
        "Positionnement choisi (low/mid/premium) appliqué au panier.",
        "Structure psychologique et cohérence marge/revenu.",
      ],
      competitorLow: input.market.competitorLow,
      competitorAvg: input.market.competitorAvg,
      competitorHigh: input.market.competitorHigh,
      baselineCost,
    },
  };
}
