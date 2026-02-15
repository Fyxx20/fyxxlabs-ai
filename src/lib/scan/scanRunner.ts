import { fetchHtmlWithHttp, fetchMultipleHttp } from "./http-fetch";
import { discoverKeyPages } from "./crawler";
import * as cheerio from "cheerio";
import {
  extractSignalsFromHtml,
  computeBaseline,
  type PageSignals,
  type BaselineResult,
} from "./analyzers/extractSignals";
import { isOpenAIAvailable, callOpenAIJsonWithSchema, OPENAI_ERROR_CODES } from "@/lib/ai/openaiClient";
import { buildScanUserMessage } from "@/lib/ai/prompts/scan.user";
import { auditImageQuality } from "@/lib/image-optimizer";
import { z } from "zod";
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

/** Regex matching common product URL patterns across e-commerce platforms */
const PRODUCT_URL_REGEX = /\/product|\/products|\/produit|\/item|\/p\/|\/shop\/|\/boutique\/|\/catalogue\//i;
const COLLECTION_URL_REGEX = /\/collection|\/collections|\/categor|\/shop$|\/boutique$|\/catalogue|\/catalog/i;

const ScanAiSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  breakdown: z
    .object({
      clarity: z.number().min(0).max(100).optional(),
      trust: z.number().min(0).max(100).optional(),
      ux: z.number().min(0).max(100).optional(),
      offer: z.number().min(0).max(100).optional(),
      speed: z.number().min(0).max(100).optional(),
      funnel: z.number().min(0).max(100).optional(),
    })
    .optional(),
  priority_action: z
    .object({
      title: z.string().optional(),
      steps: z.array(z.string()).optional(),
      time_minutes: z.number().optional(),
      expected_impact: z.string().optional(),
    })
    .optional(),
  issues: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        why: z.string().optional(),
        fix_steps: z.array(z.string()).optional(),
        impact: z.string().optional(),
        confidence: z.string().optional(),
      })
    )
    .optional(),
  checklist: z.array(z.object({ label: z.string().optional(), done: z.boolean().optional() })).optional(),
  notes: z.object({ confidence: z.string().optional(), limitations: z.array(z.string()).optional() }).optional(),
});

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
  /** Shopify API products when connected */
  shopifyProducts?: Array<{
    id: number;
    title: string;
    body_html: string;
    handle: string;
    product_type: string;
    tags: string;
    images: Array<{ src: string; alt: string | null }>;
    variants: Array<{ price: string; sku: string }>;
  }> | null;
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
    image_audit?: {
      analyzed_count: number;
      weak_count: number;
      average_score: number;
      items: Array<{
        url: string;
        score: number;
        weakSignals: string[];
        shouldImprove: boolean;
      }>;
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
  const UA = "Mozilla/5.0 (compatible; FyxxLabsBot/1.0; +https://fyxxlabs.com)";

  async function fetchXml(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": UA } });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  try {
    const site = new URL(baseUrl);
    const productUrls: string[] = [];

    // 1. Fetch main sitemap
    const mainXml = await fetchXml(`${site.origin}/sitemap.xml`);
    if (!mainXml) return [];

    const allLocs = Array.from(mainXml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]).filter(Boolean);

    // 2. Check if it's a sitemap index (contains sub-sitemaps)
    const subSitemaps = allLocs.filter((u) => /sitemap.*\.xml/i.test(u) || u.endsWith(".xml"));
    const directProducts = allLocs.filter((u) => PRODUCT_URL_REGEX.test(u) && !u.endsWith(".xml"));

    // Add direct product URLs
    productUrls.push(...directProducts);

    // 3. Fetch sub-sitemaps that likely contain products
    const productSitemaps = subSitemaps.filter((u) => /product|produit/i.test(u));
    // Also try generic sub-sitemaps if no product-specific ones found
    const toFetch = productSitemaps.length > 0 ? productSitemaps : subSitemaps.slice(0, 3);

    const fetchPromises = toFetch.slice(0, 5).map(async (sitemapUrl) => {
      const xml = await fetchXml(sitemapUrl);
      if (!xml) return [];
      return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g))
        .map((m) => m[1])
        .filter(Boolean)
        .filter((u) => !u.endsWith(".xml"));
    });

    const subResults = await Promise.all(fetchPromises);
    for (const urls of subResults) {
      productUrls.push(...urls);
    }

    // Dedupe and return
    return Array.from(new Set(productUrls)).slice(0, MAX_SITEMAP_PRODUCTS);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Cloudflare / WAF challenge page detection                         */
/* ------------------------------------------------------------------ */
const BLOCKED_TITLE_PATTERNS = [
  /just a moment/i,
  /checking your browser/i,
  /attention required/i,
  /access denied/i,
  /please wait/i,
  /security check/i,
  /pardon our interruption/i,
  /one more step/i,
  /verify you are human/i,
  /cf-browser-verification/i,
  /ddos-guard/i,
  /un instant/i,              // French Cloudflare
  /vérification/i,            // French verification
];

const BLOCKED_BODY_PATTERNS = [
  /cf-browser-verification/i,
  /challenge-form/i,
  /challenge-platform/i,
  /cdn-cgi\/challenge-platform/i,
  /turnstile/i,
  /_cf_chl_opt/i,
  /ray id/i,
  /managed by\s+cloudflare/i,
  /ddos-guard/i,
  /please enable cookies/i,
  /enable javascript and cookies/i,
];

function isBlockedPage(html: string): boolean {
  // Fast check on <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  if (title && BLOCKED_TITLE_PATTERNS.some((p) => p.test(title))) return true;

  // Body markers (check only first 5000 chars for speed)
  const head = html.slice(0, 5000);
  if (BLOCKED_BODY_PATTERNS.some((p) => p.test(head))) return true;

  // Very short page with no real content → likely a challenge
  const textLen = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().length;
  if (textLen < 200 && /challenge|verify|captcha/i.test(html)) return true;

  return false;
}

function analyzeProductPageFromHtml(html: string, url: string) {
  // Skip blocked pages
  if (isBlockedPage(html)) return null;
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

async function emitProgress(
  onProgress: RunScanInput["onProgress"],
  progress: number,
  step: string,
  message: string
) {
  if (onProgress) await Promise.resolve(onProgress(progress, step, message));
}

/** Extract links from a collection/category page to find more product URLs */
async function discoverLinksFromPage(url: string, baseOrigin: string): Promise<string[]> {
  try {
    const html = await fetchHtmlWithHttp(url);
    return extractLinks(html, baseOrigin);
  } catch {
    return [];
  }
}

/** Fetch products from Shopify public /products.json endpoint (no auth needed) */
async function fetchShopifyPublicProducts(baseUrl: string): Promise<Array<{
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
}>> {
  try {
    const origin = new URL(baseUrl).origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const productsUrl = `${origin}/products.json?limit=250`;
    console.log(`[scan] Trying public products.json: ${productsUrl}`);
    const res = await fetch(productsUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    console.log(`[scan] products.json response: ${res.status} ${res.statusText}`);
    if (!res.ok) return [];
    const data = await res.json();
    const products = data?.products;
    if (!Array.isArray(products) || products.length === 0) {
      console.log(`[scan] products.json: no products array found`);
      return [];
    }
    console.log(`[scan] products.json: found ${products.length} products`);

    return products.map((p: Record<string, unknown>) => {
      const title = String(p.title ?? "");
      const bodyHtml = String(p.body_html ?? "");
      const handle = String(p.handle ?? "");
      const tags = String(p.tags ?? "");
      const images = Array.isArray(p.images) ? p.images : [];
      const variants = Array.isArray(p.variants) ? p.variants : [];

      const prices = variants
        .map((v: Record<string, unknown>) => parseFloat(String(v.price ?? "0")))
        .filter((v: number) => Number.isFinite(v) && v > 0);
      const avgPrice = prices.length > 0 ? Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2)) : null;
      const descLower = bodyHtml.toLowerCase();
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (bodyHtml.replace(/<[^>]*>/g, "").trim().length < 50) {
        issues.push("Description produit trop courte ou absente.");
        recommendations.push("Rédiger une description persuasive avec bénéfices.");
      }
      if (images.length < 3) {
        issues.push(`Seulement ${images.length} image(s) — insuffisant.`);
        recommendations.push("Ajouter au moins 3-5 images.");
      }
      const imagesWithoutAlt = images.filter((img: Record<string, unknown>) => !img.alt || String(img.alt).trim().length === 0).length;
      if (imagesWithoutAlt > 0) {
        issues.push(`${imagesWithoutAlt} image(s) sans texte alternatif.`);
        recommendations.push("Ajouter un alt descriptif à chaque image pour le SEO.");
      }
      if (prices.length === 0) {
        issues.push("Aucun prix détecté.");
        recommendations.push("Vérifier que les variantes ont des prix définis.");
      }
      if (!tags || tags.trim().length === 0) {
        issues.push("Aucun tag défini.");
        recommendations.push("Ajouter des tags pour la navigation et le SEO.");
      }
      if (!/livraison|shipping|retour|return|delivery/i.test(descLower)) {
        issues.push("Aucune mention livraison/retours.");
        recommendations.push("Mentionner les conditions de livraison et retours.");
      }

      return {
        url: `${origin}/products/${handle}`,
        title,
        h1: title,
        meta_description: bodyHtml.replace(/<[^>]*>/g, "").slice(0, 160) || null,
        image_count: images.length,
        script_count: 0,
        detected_prices: prices.slice(0, 20),
        average_price: avgPrice,
        has_cta: true,
        has_reviews: /review|avis|rating/i.test(descLower),
        has_trust_badges: /secure|paiement|garantie|guarantee|trust/i.test(descLower),
        has_shipping_returns: /livraison|shipping|retour|return/i.test(descLower),
        issues,
        recommendations,
      };
    });
  } catch {
    return [];
  }
}

/** Extract product data from HTML using JSON-LD, Shopify JS objects, and product card patterns */
function extractProductsFromHtml(html: string, pageUrl: string): Array<{
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
}> {
  // Skip blocked/challenge pages entirely
  if (isBlockedPage(html)) return [];

  const products: ReturnType<typeof extractProductsFromHtml> = [];
  const seenTitles = new Set<string>();
  const $ = cheerio.load(html);
  const origin = (() => { try { return new URL(pageUrl).origin; } catch { return ""; } })();
  const htmlLower = html.toLowerCase();
  
  // 1. Extract from JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "");
      const items = json["@type"] === "Product" ? [json] 
        : Array.isArray(json["@graph"]) ? json["@graph"].filter((g: Record<string, unknown>) => g["@type"] === "Product")
        : json["@type"] === "ItemList" && Array.isArray(json.itemListElement) 
          ? json.itemListElement.map((i: Record<string, unknown>) => i.item).filter((i: unknown) => i && (i as Record<string, unknown>)["@type"] === "Product")
        : [];
      
      for (const item of items) {
        const title = String(item.name ?? "").trim();
        if (!title || seenTitles.has(title.toLowerCase())) continue;
        seenTitles.add(title.toLowerCase());
        const desc = String(item.description ?? "");
        const imgCount = Array.isArray(item.image) ? item.image.length : (item.image ? 1 : 0);
        const prices: number[] = [];
        const offers = Array.isArray(item.offers) ? item.offers : (item.offers ? [item.offers] : []);
        for (const offer of offers) {
          const p = parseFloat(String(offer.price ?? "0"));
          if (Number.isFinite(p) && p > 0) prices.push(p);
        }
        const avgPrice = prices.length > 0 ? Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2)) : null;
        const productUrl = String(item.url ?? item["@id"] ?? pageUrl);
        const issues: string[] = [];
        const recommendations: string[] = [];
        if (desc.length < 50) { issues.push("Description produit trop courte."); recommendations.push("Enrichir la description avec des bénéfices."); }
        if (imgCount < 3) { issues.push(`Seulement ${imgCount} image(s) détectée(s).`); recommendations.push("Ajouter au moins 3-5 images produit."); }
        if (prices.length === 0) { issues.push("Prix non détecté."); recommendations.push("Ajouter un prix visible."); }
        products.push({
          url: productUrl, title, h1: title,
          meta_description: desc.slice(0, 160) || null,
          image_count: imgCount, script_count: 0,
          detected_prices: prices, average_price: avgPrice,
          has_cta: /acheter|ajouter|add to cart|buy now|commander/i.test(htmlLower),
          has_reviews: /review|avis|rating|étoile|star/i.test(htmlLower),
          has_trust_badges: /secure|paiement|garantie|guarantee|trust/i.test(htmlLower),
          has_shipping_returns: /livraison|shipping|retour|return|delivery/i.test(htmlLower),
          issues, recommendations,
        });
      }
    } catch { /* invalid JSON-LD */ }
  });

  // 2. Extract from Shopify embedded JS (meta.product, ShopifyAnalytics, etc.)
  const scriptTexts = $("script").map((_, el) => $(el).html() ?? "").get().join("\n");
  
  // Shopify meta.product pattern
  const metaProductMatch = scriptTexts.match(/meta\.product\s*=\s*(\{[\s\S]*?\});/);
  if (metaProductMatch) {
    try {
      const p = JSON.parse(metaProductMatch[1]);
      const title = String(p.type ?? p.vendor ?? "").trim();
      // This is usually page-level metadata, not individual products
    } catch { /* ignore */ }
  }

  // Shopify product JSON in script tags (common pattern: var product = {...})
  const productJsonRegex = /(?:var|let|const)\s+(?:product|productData|__product)\s*=\s*(\{[\s\S]*?\});/g;
  let productJsonMatch: RegExpExecArray | null;
  while ((productJsonMatch = productJsonRegex.exec(scriptTexts)) !== null) {
    try {
      const p = JSON.parse(productJsonMatch[1]);
      const title = String(p.title ?? p.name ?? "").trim();
      if (!title || seenTitles.has(title.toLowerCase())) continue;
      seenTitles.add(title.toLowerCase());
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const prices = variants
        .map((v: Record<string, unknown>) => parseFloat(String(v.price ?? "0")) / (String(v.price ?? "0").includes(".") ? 1 : 100))
        .filter((v: number) => Number.isFinite(v) && v > 0);
      const images = Array.isArray(p.images) ? p.images : (Array.isArray(p.media) ? p.media : []);
      const avgPrice = prices.length > 0 ? Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2)) : null;
      const handle = String(p.handle ?? "");
      products.push({
        url: handle ? `${origin}/products/${handle}` : pageUrl,
        title, h1: title,
        meta_description: String(p.description ?? "").replace(/<[^>]*>/g, "").slice(0, 160) || null,
        image_count: images.length, script_count: 0,
        detected_prices: prices.slice(0, 20), average_price: avgPrice,
        has_cta: true,
        has_reviews: /review|avis|rating/i.test(htmlLower),
        has_trust_badges: /secure|paiement|garantie|trust/i.test(htmlLower),
        has_shipping_returns: /livraison|shipping|retour|return/i.test(htmlLower),
        issues: [], recommendations: [],
      });
    } catch { /* invalid JSON */ }
  }

  // 3. Extract product cards from HTML (common patterns across platforms)
  const productSelectors = [
    ".product-card", ".product-item", ".product-grid-item", "[data-product-id]",
    ".ProductItem", ".grid-product", ".product_card", ".card--product",
    ".product-block", ".product-miniature", ".product-tile",
    "[data-product]", "[data-product-handle]", "[data-item-id]",
    ".card", ".grid__item", ".collection-product",
    'a[href*="/products/"]', 'a[href*="/product/"]',
    'a[href*="/shop/"]', 'a[href*="/item/"]', 'a[href*="/p/"]',
  ];
  
  for (const selector of productSelectors) {
    $(selector).each((_, el) => {
      if (products.length >= 50) return; // cap
      const $el = $(el);
      
      // Find product link
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (!href || href === "/" || href === "#") return;
      // Skip non-product links (account, cart, policies etc.)
      if (/\/(account|cart|login|signup|contact|about|policy|policies|terms|privacy|faq|blog|news|search)/i.test(href)) return;
      
      let productUrl: string;
      try { productUrl = new URL(href, pageUrl).href; } catch { return; }
      
      // Find product title
      const title = (
        $el.find("h2, h3, h4, .product-title, .product-name, .product-card__title, .card__heading, [class*='title'], [class*='name']").first().text().trim() ||
        $el.find("a").first().text().trim() ||
        $el.attr("aria-label")?.trim() || ""
      );
      if (!title || title.length < 3 || title.length > 200 || seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());
      
      // Find price — look more broadly
      const priceEl = $el.find(".price, .product-price, [class*='price'], [class*='Price'], .money, .amount, [data-price], span:contains('€'), span:contains('$')").first();
      const priceText = priceEl.text() || $el.text();
      const priceMatch = priceText?.match(/(\d+[.,]\d{2})\s*[€$£]|[€$£]\s*(\d+[.,]\d{2})|(\d+[.,]\d{2})/);
      const priceStr = priceMatch ? (priceMatch[1] || priceMatch[2] || priceMatch[3]) : null;
      const price = priceStr ? parseFloat(priceStr.replace(",", ".")) : null;
      const prices = price && Number.isFinite(price) && price > 0.5 && price < 50000 ? [price] : [];
      
      // Only add if it looks like a real product (has price OR has product-like attributes)
      const hasProductAttr = $el.attr("data-product-id") || $el.attr("data-product") || $el.attr("data-item-id") || $el.attr("data-product-handle");
      if (prices.length === 0 && !hasProductAttr && !(/product|item|shop/i.test(href))) return;
      
      // Count images
      const imgCount = $el.find("img").length || 1;
      
      products.push({
        url: productUrl, title, h1: title,
        meta_description: null,
        image_count: imgCount, script_count: 0,
        detected_prices: prices,
        average_price: prices.length > 0 ? prices[0] : null,
        has_cta: $el.find("button, .btn, [type='submit']").length > 0,
        has_reviews: $el.find("[class*='review'], [class*='rating'], [class*='star']").length > 0,
        has_trust_badges: false,
        has_shipping_returns: false,
        issues: ["Analyse limitée (données extraites depuis la grille produits)."],
        recommendations: ["Scanner la fiche produit complète pour une analyse détaillée."],
      });
    });
    if (products.length >= 50) break;
  }
  
  return products;
}

/** Detect if a page is a product page by analyzing its HTML content (not URL) */
function detectProductPageByContent(html: string): boolean {
  if (isBlockedPage(html)) return false;
  const $ = cheerio.load(html);
  const htmlLower = html.toLowerCase();
  
  // Check 1: JSON-LD Product type
  let hasJsonLdProduct = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "");
      if (json["@type"] === "Product" || (Array.isArray(json["@graph"]) && json["@graph"].some((g: Record<string, unknown>) => g["@type"] === "Product"))) {
        hasJsonLdProduct = true;
      }
    } catch {}
  });
  if (hasJsonLdProduct) return true;
  
  // Check 2: Has price AND add-to-cart button → very likely a product page
  const hasPrice = /\d+[.,]\d{2}\s*[€$£]|[€$£]\s*\d+[.,]\d{2}/i.test(html);
  const hasAddToCart = /add.?to.?cart|ajouter.?au.?panier|acheter|buy.?now|commander|in.?den.?warenkorb/i.test(htmlLower);
  if (hasPrice && hasAddToCart) return true;
  
  // Check 3: Shopify product page indicators
  if (/shopify\.com|myshopify\.com/i.test(html)) {
    if (/product-single|product-template|product__info|ProductForm|product-form/i.test(html)) return true;
  }
  
  // Check 4: Common product page CSS classes
  const productPageClasses = [
    ".product-single", ".product-detail", ".product-page", ".product-info",
    ".product__info", ".product-template", "#product-form", "[data-product-form]",
    ".product-description", ".product-gallery", "#ProductPhoto", ".product-images",
    ".woocommerce-product-gallery", ".product_title",
  ];
  for (const selector of productPageClasses) {
    if ($(selector).length > 0) return true;
  }
  
  // Check 5: OG type = product
  if ($('meta[property="og:type"][content="product"]').length > 0) return true;
  if ($('meta[property="product:price:amount"]').length > 0) return true;
  
  return false;
}

/** Build product analyses from Shopify API data (no crawling needed) */
function analyzeShopifyApiProducts(products: NonNullable<RunScanInput["shopifyProducts"]>) {
  return products.map((p) => {
    const prices = p.variants
      .map((v) => parseFloat(v.price))
      .filter((v) => Number.isFinite(v) && v > 0);
    const avgPrice = prices.length > 0 ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : null;
    const hasImages = p.images.length >= 3;
    const hasDescription = (p.body_html ?? "").length > 50;
    const descLower = (p.body_html ?? "").toLowerCase();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!hasDescription) {
      issues.push("Description produit trop courte ou absente.");
      recommendations.push("Rédiger une description persuasive avec bénéfices, pas juste des caractéristiques.");
    }
    if (!hasImages || p.images.length < 3) {
      issues.push(`Seulement ${p.images.length} image(s) — insuffisant.`);
      recommendations.push("Ajouter au moins 3-5 images : angles différents, zoom, mise en situation.");
    }
    const imagesWithoutAlt = p.images.filter((img) => !img.alt || img.alt.trim().length === 0).length;
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} image(s) sans texte alternatif (alt).`);
      recommendations.push("Ajouter un alt descriptif à chaque image pour le SEO.");
    }
    if (prices.length === 0) {
      issues.push("Aucun prix détecté sur les variantes.");
      recommendations.push("Vérifier que les variantes ont des prix définis.");
    }
    if (!p.tags || p.tags.trim().length === 0) {
      issues.push("Aucun tag/catégorie défini.");
      recommendations.push("Ajouter des tags pour améliorer la navigation et le SEO interne.");
    }
    if (!/livraison|shipping|retour|return|delivery/i.test(descLower)) {
      issues.push("Aucune mention livraison/retours dans la description.");
      recommendations.push("Mentionner les conditions de livraison et retours dans la fiche produit.");
    }
    if (!/avis|review|rating|star|étoile/i.test(descLower)) {
      issues.push("Pas de preuve sociale (avis) visible dans la description.");
      recommendations.push("Intégrer des avis clients ou une notation sur la fiche produit.");
    }

    return {
      url: `shopify://products/${p.handle}`,
      title: p.title,
      h1: p.title,
      meta_description: (p.body_html ?? "").replace(/<[^>]*>/g, "").slice(0, 160) || null,
      image_count: p.images.length,
      script_count: 0,
      detected_prices: prices.slice(0, 20),
      average_price: avgPrice,
      has_cta: true, // Shopify products always have add-to-cart
      has_reviews: /review|avis|rating/i.test(descLower),
      has_trust_badges: /secure|paiement|garantie|guarantee|trust/i.test(descLower),
      has_shipping_returns: /livraison|shipping|retour|return/i.test(descLower),
      issues,
      recommendations,
    };
  });
}

/** Quick competitor price estimation via Google Shopping / web search */
async function estimateCompetitorPrices(productTitles: string[], ownAvgPrice: number | null): Promise<number | null> {
  if (productTitles.length === 0 || !ownAvgPrice) return null;
  // Take up to 3 product titles for search
  const queries = productTitles.slice(0, 3);
  const allPrices: number[] = [];

  for (const query of queries) {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " prix")}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9",
        },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const html = await res.text();
      // Extract prices from search results
      const priceMatches = html.match(/(?:€|\$)\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:€|\$)/g) ?? [];
      const nums = priceMatches
        .map((m) => m.replace(/[^\d.,]/g, "").replace(",", "."))
        .map((v) => parseFloat(v))
        .filter((v) => Number.isFinite(v) && v > 1 && v < 50000);
      allPrices.push(...nums);
    } catch {
      // skip
    }
  }

  if (allPrices.length === 0) return null;
  // Filter outliers: keep prices within 5x of own average
  const reasonable = allPrices.filter((p) => p > ownAvgPrice * 0.1 && p < ownAvgPrice * 5);
  if (reasonable.length === 0) return null;
  return Number((reasonable.reduce((a, b) => a + b, 0) / reasonable.length).toFixed(2));
}

export async function runScan(input: RunScanInput): Promise<RunScanResult> {
  const start = Date.now();
  const baseUrl = input.url.replace(/\/$/, "") || input.url;
  const homepageUrl = input.url.startsWith("http") ? input.url : `https://${input.url}`;
  const origin = new URL(homepageUrl).origin;

  const pagesScanned: string[] = [];
  const allSignals: PageSignals[] = [];
  const productAnalyses: RunScanResult["raw"]["product_analysis"] = [];
  const detectedPrices: number[] = [];
  const productPages: string[] = [];
  const seenUrls = new Set<string>();

  try {
    // ── Phase 1: Homepage + Shopify products.json in parallel ──
    await emitProgress(input.onProgress, 5, "FETCH_HOME", "Récupération de la page d'accueil et des produits…");
    
    let homeHtml = "";
    let homeBlocked = false;
    const publicProductsPromise = fetchShopifyPublicProducts(homepageUrl);

    // Try homepage, fallback to www variant if blocked/failed
    try {
      homeHtml = await fetchHtmlWithHttp(homepageUrl);
    } catch {
      // Try www variant
      try {
        const parsed = new URL(homepageUrl);
        const wwwUrl = parsed.hostname.startsWith("www.") 
          ? homepageUrl.replace("www.", "")
          : homepageUrl.replace(parsed.hostname, `www.${parsed.hostname}`);
        homeHtml = await fetchHtmlWithHttp(wwwUrl);
      } catch {
        homeHtml = "";
      }
    }

    if (homeHtml && isBlockedPage(homeHtml)) {
      console.log(`[scan] Homepage is behind WAF/Cloudflare — content will be limited`);
      homeBlocked = true;
    }

    const publicProducts = await publicProductsPromise;
    
    pagesScanned.push(homepageUrl);
    seenUrls.add(homepageUrl);

    // Only extract signals from homepage if it's NOT blocked
    if (homeHtml && !homeBlocked) {
      allSignals.push(extractSignalsFromHtml(homeHtml, homepageUrl));
      detectedPrices.push(...extractPriceValues(homeHtml));
    }

    // Extract products from homepage HTML (many stores embed product JSON-LD)
    const homeProducts = extractProductsFromHtml(homeHtml, homepageUrl);
    
    // Add public products.json results
    console.log(`[scan] products.json returned ${publicProducts.length} products`);
    if (publicProducts.length > 0) {
      await emitProgress(input.onProgress, 10, "DISCOVER_PAGES", `${publicProducts.length} produits trouvés via /products.json`);
      for (const p of publicProducts) {
        if (!seenUrls.has(p.url)) {
          seenUrls.add(p.url);
          productAnalyses.push(p);
          detectedPrices.push(...p.detected_prices);
          productPages.push(p.url);
        }
      }
    }
    
    // Add homepage JSON-LD / product card products
    console.log(`[scan] Homepage product extraction found ${homeProducts.length} products`);
    for (const p of homeProducts) {
      if (!seenUrls.has(p.url)) {
        seenUrls.add(p.url);
        productAnalyses.push(p);
        detectedPrices.push(...p.detected_prices);
        productPages.push(p.url);
      }
    }

    // ── Phase 2: Discover pages from homepage links ──
    await emitProgress(input.onProgress, 15, "DISCOVER_PAGES", "Détection de toutes les pages du site…");
    const homeLinks = (homeHtml && !homeBlocked) ? extractLinks(homeHtml, homepageUrl) : [];
    
    // If homepage was blocked, try to discover links by fetching common pages directly
    if (homeLinks.length === 0) {
      console.log(`[scan] No links from homepage (blocked or empty), trying common paths…`);
      const commonPaths = [
        "/shop", "/products", "/collections", "/catalogue", "/store",
        "/boutique", "/nos-produits", "/all", "/categories",
        "/sitemap.xml", "/robots.txt",
      ];
      const commonUrls = commonPaths.map((p) => `${origin}${p}`);
      const commonResults = await fetchMultipleHttp(commonUrls, 5);
      for (const { url, html } of commonResults) {
        if (!isBlockedPage(html)) {
          const links = extractLinks(html, homepageUrl);
          homeLinks.push(...links);
          // Also count as scanned page
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            pagesScanned.push(url);
            allSignals.push(extractSignalsFromHtml(html, url));
            detectedPrices.push(...extractPriceValues(html));
            // Extract any products from this page
            const pageProducts = extractProductsFromHtml(html, url);
            for (const p of pageProducts) {
              if (!seenUrls.has(p.url)) {
                seenUrls.add(p.url);
                productAnalyses.push(p);
                detectedPrices.push(...p.detected_prices);
                productPages.push(p.url);
              }
            }
          }
        }
      }
      console.log(`[scan] Common paths discovery found ${homeLinks.length} links`);
    }
    
    const keyUrls = discoverKeyPages(homeLinks, homepageUrl, 60);
    console.log(`[scan] Homepage links: ${homeLinks.length} total, ${keyUrls.length} key pages`);

    // ── Phase 3: Deep crawl collections + sitemap in parallel ──
    await emitProgress(input.onProgress, 18, "DISCOVER_PAGES", "Exploration des collections et du sitemap…");
    const collectionUrls = keyUrls
      .filter((u) => COLLECTION_URL_REGEX.test(u))
      .slice(0, 6);
    
    // Launch collection crawl + sitemap fetch in parallel
    const [deepResults, sitemapProductUrls] = await Promise.all([
      Promise.all(collectionUrls.map((url) => discoverLinksFromPage(url, homepageUrl))),
      fetchSitemapProductUrls(homepageUrl),
    ]);

    const deepProductUrls: string[] = [];
    for (const links of deepResults) {
      for (const link of links) {
        if (PRODUCT_URL_REGEX.test(link)) {
          try { deepProductUrls.push(new URL(link, homepageUrl).href); } catch {}
        }
      }
    }
    console.log(`[scan] Sitemap: ${sitemapProductUrls.length} URLs, Deep crawl: ${deepProductUrls.length} product URLs from ${collectionUrls.length} collections`);

    // ── Phase 4: If Shopify is connected, import products via API ──
    if (input.shopifyProducts && input.shopifyProducts.length > 0) {
      await emitProgress(input.onProgress, 22, "DISCOVER_PAGES", `${input.shopifyProducts.length} produits Shopify importés via API…`);
      const shopifyAnalyses = analyzeShopifyApiProducts(input.shopifyProducts);
      for (const pa of shopifyAnalyses) {
        if (!seenUrls.has(pa.url)) {
          seenUrls.add(pa.url);
          productAnalyses.push(pa);
          detectedPrices.push(...pa.detected_prices);
          productPages.push(pa.url);
        }
      }
    }

    // ── Phase 5: Build prioritized URL list for parallel fetching ──
    const productUrlsFromLinks = keyUrls.filter((u) => PRODUCT_URL_REGEX.test(u));
    const nonProductUrls = keyUrls.filter((u) => !PRODUCT_URL_REGEX.test(u));

    // Product URLs first (they're more valuable for analysis)
    const allDiscoveredUrls = Array.from(new Set([
      ...sitemapProductUrls,
      ...deepProductUrls,
      ...productUrlsFromLinks,
      ...nonProductUrls,
    ]))
      .filter((u) => !u.endsWith(".xml") && !seenUrls.has(u))
      .map((u) => {
        try { return new URL(u, origin).href; } catch { return null; }
      })
      .filter(Boolean) as string[];

    // Prioritize product URLs
    const productUrlsToFetch = allDiscoveredUrls.filter((u) => PRODUCT_URL_REGEX.test(u));
    const otherUrlsToFetch = allDiscoveredUrls.filter((u) => !PRODUCT_URL_REGEX.test(u));
    const prioritizedUrls = [...productUrlsToFetch, ...otherUrlsToFetch].slice(0, MAX_DETAILED_SCAN_PAGES);

    await emitProgress(input.onProgress, 25, "EXTRACT", `${prioritizedUrls.length} pages à analyser en parallèle (${productUrlsToFetch.length} produits, ${sitemapProductUrls.length} sitemap)…`);

    // ── Phase 6: Parallel page fetching in batches ──
    const BATCH_SIZE = 5;
    let fetchedCount = 0;
    
    console.log(`[scan] Starting parallel fetch of ${prioritizedUrls.length} URLs (${productUrlsToFetch.length} products)`);
    
    for (let batchStart = 0; batchStart < prioritizedUrls.length; batchStart += BATCH_SIZE) {
      // Time guard: keep 18s for AI analysis + competitor prices
      if (Date.now() - start > GLOBAL_TIMEOUT_MS - 18000) {
        console.log(`[scan] Time guard hit at ${Date.now() - start}ms, stopping fetch`);
        break;
      }

      const batch = prioritizedUrls.slice(batchStart, batchStart + BATCH_SIZE);
      const results = await fetchMultipleHttp(batch, BATCH_SIZE);

      for (const { url, html } of results) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
        fetchedCount++;

        // Skip Cloudflare / WAF challenge pages — count but don't analyze
        if (isBlockedPage(html)) {
          pagesScanned.push(url); // Still count as scanned
          continue;
        }

        try {
          pagesScanned.push(url);
          allSignals.push(extractSignalsFromHtml(html, url));
          detectedPrices.push(...extractPriceValues(html));

          // Detect product pages by URL pattern OR by content
          const isProductUrl = PRODUCT_URL_REGEX.test(url);
          const isProductContent = detectProductPageByContent(html);
          
          if (isProductUrl || isProductContent) {
            const productResult = analyzeProductPageFromHtml(html, url);
            if (productResult) {
              productPages.push(url);
              productAnalyses.push(productResult);
            }
          }

          // Also try to extract products from JSON-LD / product cards on any page
          const pageProducts = extractProductsFromHtml(html, url);
          for (const p of pageProducts) {
            if (!seenUrls.has(p.url)) {
              seenUrls.add(p.url);
              productAnalyses.push(p);
              detectedPrices.push(...p.detected_prices);
              productPages.push(p.url);
            }
          }
        } catch {
          // skip page on error
        }
      }

      await emitProgress(
        input.onProgress,
        25 + Math.floor((30 * Math.min(fetchedCount, prioritizedUrls.length)) / Math.max(prioritizedUrls.length, 1)),
        "EXTRACT",
        `${fetchedCount}/${prioritizedUrls.length} pages analysées — ${productAnalyses.length} produits trouvés`
      );
    }

    // ── Fallback: if parallel fetch failed, try individual product URLs ──
    if (fetchedCount === 0 && productUrlsToFetch.length > 0 && Date.now() - start < GLOBAL_TIMEOUT_MS - 20000) {
      console.log(`[scan] Parallel fetch returned 0 results, trying sequential fallback for ${Math.min(10, productUrlsToFetch.length)} product URLs`);
      await emitProgress(input.onProgress, 40, "EXTRACT", "Tentative de récupération individuelle des produits…");
      
      for (const url of productUrlsToFetch.slice(0, 10)) {
        if (Date.now() - start > GLOBAL_TIMEOUT_MS - 18000) break;
        try {
          const html = await fetchHtmlWithHttp(url);
          if (seenUrls.has(url)) continue;
          seenUrls.add(url);

          // Skip Cloudflare / WAF challenge pages
          if (isBlockedPage(html)) {
            pagesScanned.push(url); // Still count
            continue;
          }

          fetchedCount++;
          pagesScanned.push(url);
          allSignals.push(extractSignalsFromHtml(html, url));
          detectedPrices.push(...extractPriceValues(html));
          const productResult = analyzeProductPageFromHtml(html, url);
          if (productResult) {
            productPages.push(url);
            productAnalyses.push(productResult);
          }
          
          const pageProducts = extractProductsFromHtml(html, url);
          for (const p of pageProducts) {
            if (!seenUrls.has(p.url)) {
              seenUrls.add(p.url);
              productAnalyses.push(p);
              detectedPrices.push(...p.detected_prices);
              productPages.push(p.url);
            }
          }
        } catch (err) {
          console.error(`[scan] Sequential fallback failed for ${url}: ${err instanceof Error ? err.message : "unknown"}`);
        }
        // Small delay between sequential requests
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(`[scan] Fetch complete: ${fetchedCount} pages fetched, ${productAnalyses.length} products found`);
    await emitProgress(input.onProgress, 55, "EXTRACT", `Extraction terminée — ${pagesScanned.length} pages, ${productAnalyses.length} produits analysés.`);
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
        mode: "http",
        timings: { fetch_ms: fetchMs },
        ai: { enabled: false, status: "failed" },
        business_metrics: input.metrics ?? null,
        product_analysis: productAnalyses,
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

  const sourceImageUrls = Array.from(
    new Set(
      (input.shopifyProducts ?? [])
        .flatMap((p) => p.images ?? [])
        .map((img) => img.src)
        .filter((u): u is string => typeof u === "string" && u.length > 0)
    )
  ).slice(0, 60);
  const imageAuditItems = sourceImageUrls.map((url) => auditImageQuality(url));
  const imageAuditAverage = imageAuditItems.length
    ? Number(
        (
          imageAuditItems.reduce((sum, item) => sum + item.score, 0) / imageAuditItems.length
        ).toFixed(2)
      )
    : 0;
  const imageAuditWeakCount = imageAuditItems.filter((i) => i.shouldImprove).length;

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
      mode: "http",
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
      image_audit: {
        analyzed_count: imageAuditItems.length,
        weak_count: imageAuditWeakCount,
        average_score: imageAuditAverage,
        items: imageAuditItems.slice(0, 20).map((i) => ({
          url: i.url,
          score: i.score,
          weakSignals: i.weakSignals,
          shouldImprove: i.shouldImprove,
        })),
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

  // ── Competitor price estimation ──
  if (priceInsights.own_average_price && productAnalyses.length > 0) {
    await emitProgress(input.onProgress, 65, "SCORE", "Recherche des prix concurrents…");
    const productTitles = productAnalyses
      .map((p) => p.title)
      .filter((t) => t && t.length > 3);
    const competitorAvg = await estimateCompetitorPrices(productTitles, priceInsights.own_average_price);
    if (competitorAvg) {
      priceInsights.competitor_average_price = competitorAvg;
    }
  }

  if (!isOpenAIAvailable()) {
    await emitProgress(input.onProgress, 100, "DONE", "Analyse terminée (sans IA).");
    return result;
  }

  await emitProgress(input.onProgress, 85, "AI_SUMMARY", "Synthèse IA en cours…");

  // Build page contents for AI (truncated — keep small for speed)
  const pageContents = allSignals.slice(0, 8).map((s) => ({
    url: s.url,
    pageType: s.pageType,
    title: s.title,
    h1: s.h1,
    visibleText: (s.visibleText ?? "").slice(0, 2000),
    wordCount: s.wordCount,
    h2Texts: s.h2Texts?.slice(0, 5),
    hasCanonical: s.hasCanonical,
    hasOpenGraph: s.hasOpenGraph,
    imageAltRatio: s.imageAltRatio,
  }));

  // Build compact signal summary instead of sending all raw signals
  const signalSummary = {
    total_pages: allSignals.length,
    pages_with_h1: allSignals.filter((s) => s.h1).length,
    pages_with_canonical: allSignals.filter((s) => s.hasCanonical).length,
    pages_with_og: allSignals.filter((s) => s.hasOpenGraph).length,
    avg_word_count: Math.round(allSignals.reduce((a, s) => a + (s.wordCount ?? 0), 0) / Math.max(allSignals.length, 1)),
    avg_image_alt_ratio: Number((allSignals.reduce((a, s) => a + (s.imageAltRatio ?? 0), 0) / Math.max(allSignals.length, 1)).toFixed(2)),
    page_types: Object.entries(
      allSignals.reduce((acc, s) => { acc[s.pageType ?? "unknown"] = (acc[s.pageType ?? "unknown"] ?? 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([type, count]) => `${type}: ${count}`).join(", "),
  };

  const userMessage = buildScanUserMessage({
    store: {
      url: homepageUrl,
      platform: input.platform,
      country: input.country,
      stage: input.stage,
      traffic_source: input.traffic_source,
      aov: input.aov,
    },
    signals: signalSummary,
    pagesAnalyzed: pagesScanned.slice(0, 20),
    metrics: input.metrics ?? null,
    modeUrlOnly: !input.metrics?.orders && !input.metrics?.revenue,
    productAnalysis: productAnalyses?.slice(0, 10) ?? null,
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
    const aiJson = await callOpenAIJsonWithSchema({
      schema: ScanAiSchema,
      system: SCAN_SYSTEM_PROMPT,
      user: userMessage,
      retries: 2,
    });

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
