import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { computeDigitalPricing, computePhysicalPricing } from "./pricing-engine";

describe("pricing-engine", () => {
  it("returns ordered physical price scenarios with positive margins", () => {
    const result = computePhysicalPricing({
      market: {
        currency: "EUR",
        sourcePrice: 12,
        competitorSignals: [],
        competitorLow: 24,
        competitorAvg: 35,
        competitorHigh: 49,
        confidence: 0.7,
      },
      sourceCost: 12,
      shippingCost: 3,
    });

    expect(result.safe).toBeGreaterThan(0);
    expect(result.optimal).toBeGreaterThan(result.safe);
    expect(result.aggressive).toBeGreaterThan(result.optimal);
    expect(result.estimatedMinMarginPct).toBeGreaterThan(0);
  });

  it("returns coherent digital pricing around market anchor", () => {
    const result = computeDigitalPricing({
      market: {
        currency: "EUR",
        sourcePrice: null,
        competitorSignals: [],
        competitorLow: 19,
        competitorAvg: 39,
        competitorHigh: 89,
        confidence: 0.6,
      },
      targetPositioning: "premium",
    });

    expect(result.currency).toBe("EUR");
    expect(result.optimal).toBeGreaterThanOrEqual(result.safe);
    expect(result.aggressive).toBeGreaterThanOrEqual(result.optimal);
    expect(["low", "mid", "premium"]).toContain(result.positioning);
  });
});
