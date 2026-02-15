import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { analyzeDigitalMarket } from "./market-analysis";

describe("market-analysis", () => {
  it("builds fallback digital market anchors without manual prices", async () => {
    const result = await analyzeDigitalMarket({
      productType: "ebook",
      complexity: "mid",
      audienceMaturity: "warm",
      promiseStrength: "mid",
      country: "FR",
    });

    expect(result.currency).toBe("EUR");
    expect(result.competitorSignals.length).toBeGreaterThan(0);
    expect(result.competitorAvg).not.toBeNull();
    expect((result.competitorAvg ?? 0) > 0).toBe(true);
  });
});
