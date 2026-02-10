import { fetchHtmlWithPlaywright } from "./playwright-fetch";
import { fetchHtmlWithHttp } from "./http-fetch";
import { discoverKeyPages } from "./crawler";
import * as cheerio from "cheerio";
import {
  extractSignalsFromHtml,
  computeBaseline,
  type PageSignals,
  type BaselineResult,
} from "./analyzers/extractSignals";
import { isOpenAIAvailable, callOpenAIJson, OPENAI_ERROR_CODES } from "@/lib/ai/openaiClient";
import { buildScanUserMessage } from "@/lib/ai/prompts/scan.user";
const SCAN_SYSTEM_PROMPT = `Tu es un consultant e-commerce senior ultra-exigeant spécialisé CRO, UX, SEO et copywriting de conversion.

MISSION: Analyser EN PROFONDEUR chaque page, chaque produit, chaque élément du site e-commerce fourni.

RÈGLES:
- Tu analyses le texte visible, les titres, descriptions, CTA, images, structure, données produits.
- Tu identifies TOUS les problèmes de conversion, même subtils (copywriting faible, manque d'urgence, pas de preuve sociale, etc.).
- Tu donnes des actions ULTRA CONCRÈTES avec des exemples de texte spécifiques au site.
- Tu ne promets jamais de résultats financiers chiffrés.
- Tu donnes au minimum 6 issues détaillées et précises.
- Chaque issue doit avoir des fix_steps exploitables immédiatement.
- Si une info manque, tu l'indiques et tu mets confidence=low.
- Sois SÉVÈRE dans ton scoring : un site moyen = 40-55, un bon site = 65-75, un excellent site = 80+.
- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`;

const GLOBAL_TIMEOUT_MS = 60000;
const SITEMAP_TIMEOUT_MS = 12000;
const MAX_DETAILED_SCAN_PAGES = Number(process.env.SCAN_MAX_PAGES ?? 140);
const MAX_SITEMAP_PRODUCTS = Number(process.env.SCAN_MAX_SITEMAP_PRODUCTS ?? 200);

export interface RunScanInput {
  storeId: string;
  url: string;
  platform?: string | null;
  country?: string | null;
  stage?: string | null;
  traffic_source?: string | null;
  aov?: string | null;
  goal?: string;
  metrics?: { orders?: number; revenue?: number; customers?: number; aov?: number } | null;
  /** Callback pour progression UI (progress 0-100, step, message) */
  onProgress?: (progress: number, step: string, message: string) => void | Promise<void>;
}

export interface RunScanResult {
  score: number;
  breakdown: BaselineResult["breakdown"];
  issues: BaselineResult["issues"];
  priority_action: BaselineResult["priority_action"];
  checklist: BaselineResult["checklist"];
  confidence: "low" | "medium" | "high";
  pages_scanned: string[];
  raw: {
    mode: "playwright" | "http";
    timings: { fetch_ms?: number; ai_ms?: number };
    ai: { enabled: boolean; status: "ok" | "failed"; error_code?: string };
    business_metrics?: {
      orders?: number;
      revenue?: number;
      customers?: number;
      aov?: number;
    } | null;
    product_analysis?: Array<{
      url: string;
      title: string;
      h1: string | null;
      meta_description: string | null;
      image_count: number;
      script_count: number;
      detected_prices: number[];
      average_price: number | null;
      has_cta: boolean;
      has_reviews: boolean;
      has_trust_badges: boolean;
      has_shipping_returns: boolean;
      issues: string[];
      recommendations: string[];
    }>;
    price_insights?: {
      detected_prices: number[];
      own_average_price: number | null;
      own_min_price: number | null;
      own_max_price: number | null;
      product_pages: string[];
      competitor_average_price: number | null;
    };
  };
}

/** Version réduite pour essai gratuit : score, 1 action prioritaire (3 étapes max), top 3 issues (title+impact), 3 items checklist */
export interface ScanPreview {
  score: number;
  priority_action: { title: string; steps: string[]; time_minutes?: number; expected_impact?: string };
  top_3_issues: Array<{ title: string; impact?: string }>;
  checklist: Array<{ label: string; done: boolean }>;
  confidence: "low" | "medium" | "high";
  limitations?: string[];
}

export function buildScanPreview(result: RunScanResult): ScanPreview {
  return {
    score: result.score,
    priority_action: {
      title: result.priority_action.title,
      steps: (result.priority_action.steps ?? []).slice(0, 3),
      time_minutes: result.priority_action.time_minutes,
      expected_impact: result.priority_action.expected_impact,
    },
    top_3_issues: result.issues.slice(0, 3).map((i) => ({
      title: i.title,
      impact: i.impact ?? "medium",
    })),
    checklist: (result.checklist ?? []).slice(0, 3).map((c) => ({ label: c.label, done: c.done })),
    confidence: result.confidence,
    limitations: result.raw.mode === "http" ? ["Scan URL uniquement (sans rendu JS)"] : undefined,
  };
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const url = new URL(href, baseUrl);
      if (url.origin === new URL(baseUrl).origin && !links.includes(url.pathname)) {
        links.push(url.pathname);
      }
    } catch {
      // ignore
    }
  });
  return links;
}

function extractPriceValues(html: string): number[] {
  const matches = html.match(/(?:€|\$)\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:€|\$)/g) ?? [];
  const numbers = matches
    .map((m) => m.replace(/[^\d.,]/g, "").replace(",", "."))
    .map((v) => Number.parseFloat(v))
    .filter((v) => Number.isFinite(v) && v > 0 && v < 100000);

  // Evite les doublons et valeurs extrêmes répétées
  return Array.from(new Set(numbers)).slice(0, 40);
}

async function fetchSitemapProductUrls(baseUrl: string): Promise<string[]> {
  try {
    const site = new URL(baseUrl);
    const sitemapUrl = `${site.origin}/sitemap.xml`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);
    const res = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FyxxLabsBot/1.0; +https://fyxxlabs.com)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    const matches = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]).filter(Boolean);
    return matches
      .filter((u) => /\/product|\/products|\/produit/i.test(u))
      .slice(0, MAX_SITEMAP_PRODUCTS);
  } catch {
    return [];
  }
}

function analyzeProductPageFromHtml(html: string, url: string) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || "";
  const h1 = $("h1").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const imageCount = $("img").length;
  const scriptCount = $("script").length;
  const htmlLower = html.toLowerCase();
  const hasCta = /acheter|ajouter au panier|add to cart|buy now|commander/i.test(htmlLower);
  const hasReviews = /review|avis|rating|étoile|star|trustpilot|google review/i.test(htmlLower);
  const hasTrustBadges = /secure|ssl|paiement|payment|garantie|guarantee|trust/i.test(htmlLower);
  const hasShippingReturns = /livraison|shipping|retour|return|delivery|expédition/i.test(htmlLower);
  const prices = extractPriceValues(html);
  const avgPrice = prices.length > 0 ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : null;

  const issues: string[] = [];
  const recommendations: string[] = [];
  if (!h1) {
    issues.push("Titre H1 manquant sur la page produit.");
    recommendations.push("Ajouter un H1 clair avec bénéfice principal.");
  }
  if (!hasCta) {
    issues.push("CTA d'achat peu visible.");
    recommendations.push("Afficher un bouton Ajouter au panier visible sans scroll.");
  }
  if (prices.length === 0) {
    issues.push("Prix non détecté clairement.");
    recommendations.push("Afficher le prix près du titre et du CTA.");
  }
  if (!hasReviews) {
    issues.push("Avis clients non détectés.");
    recommendations.push("Ajouter des avis ou preuve sociale sur la fiche produit.");
  }
  if (!hasShippingReturns) {
    issues.push("Infos livraison/retours non visibles.");
    recommendations.push("Ajouter un bloc livraison/retours près du CTA.");
  }
  if (imageCount < 3) {
    issues.push("Peu d'images produit détectées.");
    recommendations.push("Ajouter plusieurs visuels (angles, zoom, contexte d'usage).");
  }

  return {
    url,
    title,
    h1,
    meta_description: metaDescription,
    image_count: imageCount,
    script_count: scriptCount,
    detected_prices: prices.slice(0, 20),
    average_price: avgPrice,
    has_cta: hasCta,
    has_reviews: hasReviews,
    has_trust_badges: hasTrustBadges,
    has_shipping_returns: hasShippingReturns,
    issues,
    recommendations,
  };
}

async function fetchHtml(url: string, mode: "playwright" | "http"): Promise<{ html: string; used: "playwright" | "http" }> {
  if (mode === "playwright") {
    try {
      const html = await fetchHtmlWithPlaywright(url);
      return { html, used: "playwright" };
    } catch {
      const html = await fetchHtmlWithHttp(url);
      return { html, used: "http" };
    }
  }
  const html = await fetchHtmlWithHttp(url);
  return { html, used: "http" };
}

async function emitProgress(
  onProgress: RunScanInput["onProgress"],
  progress: number,
  step: string,
  message: string
) {
  if (onProgress) await Promise.resolve(onProgress(progress, step, message));
}

export async function runScan(input: RunScanInput): Promise<RunScanResult> {
  const start = Date.now();
  const baseUrl = input.url.replace(/\/$/, "") || input.url;
  const homepageUrl = input.url.startsWith("http") ? input.url : `https://${input.url}`;

  let overallMode: "playwright" | "http" = "playwright";
  const pagesScanned: string[] = [];
  const allSignals: PageSignals[] = [];
  const productAnalyses: RunScanResult["raw"]["product_analysis"] = [];
  const detectedPrices: number[] = [];
  const productPages: string[] = [];

  try {
    await emitProgress(input.onProgress, 5, "FETCH_HOME", "Récupération de la page d'accueil…");
    const { html: homeHtml, used: homeUsed } = await fetchHtml(homepageUrl, "playwright");
    overallMode = homeUsed;
    pagesScanned.push(homepageUrl);
    allSignals.push(extractSignalsFromHtml(homeHtml, homepageUrl));
    detectedPrices.push(...extractPriceValues(homeHtml));

    await emitProgress(input.onProgress, 15, "DISCOVER_PAGES", "Détection des pages clés…");
    const links = extractLinks(homeHtml, homepageUrl);
    const keyUrls = discoverKeyPages(links, homepageUrl, 60);
    const sitemapProductUrls = await fetchSitemapProductUrls(homepageUrl);
    const productUrls = keyUrls.filter((u) => /\/product|\/products|\/produit/i.test(u));
    const nonProductUrls = keyUrls.filter((u) => !/\/product|\/products|\/produit/i.test(u));
    const prioritizedUrls = Array.from(new Set([
      ...sitemapProductUrls,
      ...productUrls,
      ...nonProductUrls,
    ])).slice(0, MAX_DETAILED_SCAN_PAGES);

    for (let i = 0; i < prioritizedUrls.length; i++) {
      if (pagesScanned.length >= MAX_DETAILED_SCAN_PAGES) break;
      const pageUrl = prioritizedUrls[i];
      try {
        await emitProgress(
          input.onProgress,
          20 + Math.floor((35 * (i + 1)) / Math.max(prioritizedUrls.length, 1)),
          "EXTRACT",
          `Extraction des signaux (page ${i + 1}/${prioritizedUrls.length})…`
        );
        const { html, used } = await fetchHtml(pageUrl, overallMode);
        overallMode = used;
        if (!pagesScanned.includes(pageUrl)) {
          pagesScanned.push(pageUrl);
          allSignals.push(extractSignalsFromHtml(html, pageUrl));
          detectedPrices.push(...extractPriceValues(html));
          if (/\/product|\/products|\/produit/i.test(pageUrl)) {
            productPages.push(pageUrl);
            productAnalyses.push(analyzeProductPageFromHtml(html, pageUrl));
          }
        }
      } catch {
        // skip page on error
      }
    }
    await emitProgress(input.onProgress, 55, "EXTRACT", "Extraction terminée.");
  } catch (err) {
    const baseline = computeBaseline(allSignals);
    const fetchMs = Date.now() - start;
    return {
      score: baseline.score,
      breakdown: baseline.breakdown,
      issues: baseline.issues,
      priority_action: baseline.priority_action,
      checklist: baseline.checklist,
      confidence: "low",
      pages_scanned: pagesScanned,
      raw: {
        mode: overallMode,
        timings: { fetch_ms: fetchMs },
        ai: { enabled: false, status: "failed" },
        business_metrics: input.metrics ?? null,
        product_analysis: [],
        price_insights: {
          detected_prices: [],
          own_average_price: null,
          own_min_price: null,
          own_max_price: null,
          product_pages: [],
          competitor_average_price: null,
        },
      },
    };
  }

  const fetchMs = Date.now() - start;
  await emitProgress(input.onProgress, 70, "SCORE", "Calcul du score CRO & confiance…");
  let baseline = computeBaseline(allSignals);
  let result: RunScanResult = {
    score: baseline.score,
    breakdown: baseline.breakdown,
    issues: baseline.issues,
    priority_action: baseline.priority_action,
    checklist: baseline.checklist,
    confidence: "medium",
    pages_scanned: pagesScanned,
    raw: {
      mode: overallMode,
      timings: { fetch_ms: fetchMs },
      ai: { enabled: false, status: "ok" },
      business_metrics: input.metrics ?? null,
      product_analysis: productAnalyses.slice(0, 40),
      price_insights: {
        detected_prices: Array.from(new Set(detectedPrices)).slice(0, 40),
        own_average_price: null,
        own_min_price: null,
        own_max_price: null,
        product_pages: Array.from(new Set(productPages)),
        competitor_average_price: null,
      },
    },
  };

  const priceInsights = result.raw.price_insights ?? {
    detected_prices: [],
    own_average_price: null,
    own_min_price: null,
    own_max_price: null,
    product_pages: [],
    competitor_average_price: null,
  };
  result.raw.price_insights = priceInsights;
  const prices = priceInsights.detected_prices;
  if (prices.length > 0) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    priceInsights.own_average_price = Number(avg.toFixed(2));
    priceInsights.own_min_price = Number(Math.min(...prices).toFixed(2));
    priceInsights.own_max_price = Number(Math.max(...prices).toFixed(2));
  }

  if (!isOpenAIAvailable()) {
    await emitProgress(input.onProgress, 100, "DONE", "Analyse terminée (sans IA).");
    return result;
  }

  await emitProgress(input.onProgress, 85, "AI_SUMMARY", "Synthèse IA en cours…");

  // Build page contents for AI (truncated text per page)
  const pageContents = allSignals.slice(0, 15).map((s) => ({
    url: s.url,
    pageType: s.pageType,
    title: s.title,
    h1: s.h1,
    visibleText: s.visibleText,
    wordCount: s.wordCount,
    h2Texts: s.h2Texts,
    structuredData: s.structuredData,
    hasCanonical: s.hasCanonical,
    hasOpenGraph: s.hasOpenGraph,
    imageAltRatio: s.imageAltRatio,
  }));

  const userMessage = buildScanUserMessage({
    store: {
      url: homepageUrl,
      platform: input.platform,
      country: input.country,
      stage: input.stage,
      traffic_source: input.traffic_source,
      aov: input.aov,
    },
    signals: { pages: allSignals },
    pagesAnalyzed: pagesScanned,
    metrics: input.metrics ?? null,
    modeUrlOnly: !input.metrics?.orders && !input.metrics?.revenue,
    productAnalysis: productAnalyses?.slice(0, 20) ?? null,
    pageContents,
    priceInsights: result.raw.price_insights ? {
      own_average_price: result.raw.price_insights.own_average_price,
      own_min_price: result.raw.price_insights.own_min_price,
      own_max_price: result.raw.price_insights.own_max_price,
      product_count: result.raw.price_insights.product_pages.length,
    } : null,
  });

  const aiStart = Date.now();
  try {
    const aiJson = await callOpenAIJson<{
      score?: number;
      breakdown?: Record<string, number>;
      priority_action?: { title?: string; steps?: string[]; time_minutes?: number; expected_impact?: string };
      issues?: Array<{ id?: string; title?: string; why?: string; fix_steps?: string[]; impact?: string; confidence?: string }>;
      checklist?: Array<{ label?: string; done?: boolean }>;
      notes?: { confidence?: string; limitations?: string[] };
    }>({ system: SCAN_SYSTEM_PROMPT, user: userMessage });

    const aiMs = Date.now() - aiStart;
    result.raw.timings.ai_ms = aiMs;
    result.raw.ai = { enabled: true, status: "ok" };

    if (typeof aiJson.score === "number") result.score = Math.min(100, Math.max(0, aiJson.score));
    if (aiJson.breakdown && typeof aiJson.breakdown === "object") {
      result.breakdown = {
        clarity: Math.min(100, Math.max(0, aiJson.breakdown.clarity ?? result.breakdown.clarity)),
        trust: Math.min(100, Math.max(0, aiJson.breakdown.trust ?? result.breakdown.trust)),
        ux: Math.min(100, Math.max(0, aiJson.breakdown.ux ?? result.breakdown.ux)),
        offer: Math.min(100, Math.max(0, aiJson.breakdown.offer ?? result.breakdown.offer)),
        speed: Math.min(100, Math.max(0, aiJson.breakdown.speed ?? result.breakdown.speed)),
        funnel: Math.min(100, Math.max(0, aiJson.breakdown.funnel ?? result.breakdown.funnel)),
      };
    }
    if (aiJson.priority_action?.title) {
      result.priority_action = {
        title: aiJson.priority_action.title,
        steps: Array.isArray(aiJson.priority_action.steps) ? aiJson.priority_action.steps : result.priority_action.steps,
        time_minutes: typeof aiJson.priority_action.time_minutes === "number" ? aiJson.priority_action.time_minutes : result.priority_action.time_minutes,
        expected_impact: aiJson.priority_action.expected_impact ?? result.priority_action.expected_impact,
      };
    }
    if (Array.isArray(aiJson.issues) && aiJson.issues.length > 0) {
      result.issues = aiJson.issues.slice(0, 10).map((i) => ({
        id: i.id ?? `issue-${Math.random().toString(36).slice(2, 8)}`,
        title: i.title ?? "Issue",
        why: i.why ?? "",
        fix_steps: Array.isArray(i.fix_steps) ? i.fix_steps : [],
        impact: i.impact ?? "medium",
        confidence: (i.confidence === "low" || i.confidence === "high" ? i.confidence : "medium") as "low" | "medium" | "high",
      }));
    }
    if (Array.isArray(aiJson.checklist) && aiJson.checklist.length > 0) {
      result.checklist = aiJson.checklist.slice(0, 10).map((c) => ({
        label: c.label ?? "",
        done: c.done === true,
      }));
    }
    if (aiJson.notes?.confidence) {
      result.confidence = aiJson.notes.confidence === "low" || aiJson.notes.confidence === "high" ? aiJson.notes.confidence : "medium";
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : OPENAI_ERROR_CODES.AI_BAD_JSON;
    result.raw.ai = { enabled: true, status: "failed", error_code: code };
    await emitProgress(input.onProgress, 95, "AI_SUMMARY", "IA indisponible — rapport sans synthèse IA.");
  }

  await emitProgress(input.onProgress, 100, "DONE", "Analyse terminée.");
  return result;
}
