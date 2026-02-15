import "server-only";

export interface CompetitorSignal {
  url?: string;
  price: number;
  currency: string;
  confidence: number;
  source: "manual" | "scraped";
}

export interface PhysicalMarketAnalysisInput {
  sourcePrice?: number | null;
  currency?: string | null;
  competitorUrls?: string[];
  manualCompetitorPrices?: number[];
}

export interface DigitalMarketAnalysisInput {
  productType: string;
  complexity: "low" | "mid" | "high";
  audienceMaturity: "cold" | "warm" | "expert";
  promiseStrength: "low" | "mid" | "high";
  country?: string | null;
  manualCompetitorPrices?: number[];
}

export interface MarketAnalysisResult {
  currency: string;
  sourcePrice: number | null;
  competitorSignals: CompetitorSignal[];
  competitorLow: number | null;
  competitorAvg: number | null;
  competitorHigh: number | null;
  confidence: number;
}

function toCurrencyFallback(currency: string | null | undefined): string {
  return (currency ?? "").trim().toUpperCase() || "EUR";
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function parseLikelyPrice(content: string): number | null {
  const matches = content.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s?(€|eur|usd|\$|£)/gi) ?? [];
  if (!matches.length) return null;
  const parsed = matches
    .map((m) => {
      const n = m.match(/(\d{1,5}(?:[.,]\d{1,2})?)/)?.[1];
      return n ? Number(n.replace(",", ".")) : NaN;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!parsed.length) return null;
  // Take median-like central value to avoid random banner prices.
  const sorted = [...parsed].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

async function scrapeCompetitorPrice(url: string): Promise<CompetitorSignal | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const html = await res.text();
    const price = parseLikelyPrice(html);
    if (!price) return null;
    return {
      url,
      price,
      currency: "EUR",
      confidence: 0.45,
      source: "scraped",
    };
  } catch {
    return null;
  }
}

function aggregateSignals(
  sourcePrice: number | null,
  currency: string,
  signals: CompetitorSignal[]
): MarketAnalysisResult {
  const prices = signals.map((s) => s.price).filter((n) => Number.isFinite(n) && n > 0);
  const competitorLow = prices.length ? Math.min(...prices) : null;
  const competitorHigh = prices.length ? Math.max(...prices) : null;
  const competitorAvg = prices.length ? avg(prices) : null;
  const confidenceBase = prices.length >= 5 ? 0.85 : prices.length >= 3 ? 0.7 : prices.length >= 1 ? 0.5 : 0.25;

  return {
    currency,
    sourcePrice,
    competitorSignals: signals,
    competitorLow,
    competitorAvg,
    competitorHigh,
    confidence: confidenceBase,
  };
}

export async function analyzePhysicalMarket(
  input: PhysicalMarketAnalysisInput
): Promise<MarketAnalysisResult> {
  const currency = toCurrencyFallback(input.currency);
  const sourcePrice = input.sourcePrice ?? null;
  const signals: CompetitorSignal[] = [];

  for (const p of input.manualCompetitorPrices ?? []) {
    if (Number.isFinite(p) && p > 0) {
      signals.push({
        price: Number(p),
        currency,
        confidence: 0.9,
        source: "manual",
      });
    }
  }

  const urls = (input.competitorUrls ?? []).slice(0, 6);
  if (urls.length) {
    const results = await Promise.all(urls.map((u) => scrapeCompetitorPrice(u)));
    for (const s of results) {
      if (s) signals.push(s);
    }
  }

  return aggregateSignals(sourcePrice, currency, signals);
}

export async function analyzeDigitalMarket(
  input: DigitalMarketAnalysisInput
): Promise<MarketAnalysisResult> {
  const currency = "EUR";
  const signals: CompetitorSignal[] = [];

  for (const p of input.manualCompetitorPrices ?? []) {
    if (Number.isFinite(p) && p > 0) {
      signals.push({
        price: Number(p),
        currency,
        confidence: 0.9,
        source: "manual",
      });
    }
  }

  // If no market prices are provided, create strategic baseline anchors.
  if (!signals.length) {
    const typeFactor =
      input.productType.toLowerCase().includes("course") ? 1.8 :
      input.productType.toLowerCase().includes("template") ? 1.1 : 1;
    const complexityFactor = input.complexity === "high" ? 1.6 : input.complexity === "mid" ? 1.25 : 1;
    const audienceFactor = input.audienceMaturity === "expert" ? 1.4 : input.audienceMaturity === "warm" ? 1.15 : 1;
    const promiseFactor = input.promiseStrength === "high" ? 1.45 : input.promiseStrength === "mid" ? 1.2 : 1;
    const baseline = Math.max(9, 19 * typeFactor * complexityFactor * audienceFactor * promiseFactor);
    signals.push(
      { price: Number((baseline * 0.8).toFixed(2)), currency, confidence: 0.35, source: "manual" },
      { price: Number((baseline * 1.0).toFixed(2)), currency, confidence: 0.35, source: "manual" },
      { price: Number((baseline * 1.25).toFixed(2)), currency, confidence: 0.35, source: "manual" },
    );
  }

  return aggregateSignals(null, currency, signals);
}
