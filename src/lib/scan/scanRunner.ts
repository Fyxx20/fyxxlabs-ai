import { fetchHtmlWithHttp, fetchMultipleHttp } from "./http-fetch";
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
    const directProducts = allLocs.filter((u) => /\/product|\/products|\/produit/i.test(u) && !u.endsWith(".xml"));

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
    const res = await fetch(`${origin}/products.json?limit=250`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const products = data?.products;
    if (!Array.isArray(products) || products.length === 0) return [];

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

/** Extract product data from HTML using JSON-LD structured data and meta tags */
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
  const products: ReturnType<typeof extractProductsFromHtml> = [];
  const $ = cheerio.load(html);
  
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
        const title = String(item.name ?? "");
        if (!title) continue;
        const desc = String(item.description ?? "");
        const imgCount = Array.isArray(item.image) ? item.image.length : (item.image ? 1 : 0);
        const prices: number[] = [];
        
        // Extract price from offers
        const offers = Array.isArray(item.offers) ? item.offers : (item.offers ? [item.offers] : []);
        for (const offer of offers) {
          const p = parseFloat(String(offer.price ?? "0"));
          if (Number.isFinite(p) && p > 0) prices.push(p);
        }
        
        const avgPrice = prices.length > 0 ? Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2)) : null;
        const productUrl = String(item.url ?? item["@id"] ?? pageUrl);
        const issues: string[] = [];
        const recommendations: string[] = [];
        
        if (desc.length < 50) {
          issues.push("Description produit trop courte.");
          recommendations.push("Enrichir la description avec des bénéfices.");
        }
        if (imgCount < 3) {
          issues.push(`Seulement ${imgCount} image(s) détectée(s).`);
          recommendations.push("Ajouter au moins 3-5 images produit.");
        }
        if (prices.length === 0) {
          issues.push("Prix non détecté dans les données structurées.");
          recommendations.push("Ajouter un prix visible et des données structurées.");
        }
        
        products.push({
          url: productUrl,
          title,
          h1: title,
          meta_description: desc.slice(0, 160) || null,
          image_count: imgCount,
          script_count: 0,
          detected_prices: prices,
          average_price: avgPrice,
          has_cta: /acheter|ajouter|add to cart|buy now|commander/i.test(html),
          has_reviews: /review|avis|rating|étoile|star/i.test(html),
          has_trust_badges: /secure|paiement|garantie|guarantee|trust/i.test(html),
          has_shipping_returns: /livraison|shipping|retour|return|delivery/i.test(html),
          issues,
          recommendations,
        });
      }
    } catch {
      // invalid JSON-LD
    }
  });
  
  return products;
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
    
    const [homeHtml, publicProducts] = await Promise.all([
      fetchHtmlWithHttp(homepageUrl),
      fetchShopifyPublicProducts(homepageUrl),
    ]);
    
    pagesScanned.push(homepageUrl);
    seenUrls.add(homepageUrl);
    allSignals.push(extractSignalsFromHtml(homeHtml, homepageUrl));
    detectedPrices.push(...extractPriceValues(homeHtml));

    // Extract products from homepage HTML (many stores embed product JSON-LD)
    const homeProducts = extractProductsFromHtml(homeHtml, homepageUrl);
    
    // Add public products.json results
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
    
    // Add homepage JSON-LD products (if not already from products.json)
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
    const homeLinks = extractLinks(homeHtml, homepageUrl);
    const keyUrls = discoverKeyPages(homeLinks, homepageUrl, 60);

    // ── Phase 3: Deep crawl collections + sitemap in parallel ──
    await emitProgress(input.onProgress, 18, "DISCOVER_PAGES", "Exploration des collections et du sitemap…");
    const collectionUrls = keyUrls
      .filter((u) => /\/collection|\/collections|\/categor/i.test(u))
      .slice(0, 6);
    
    // Launch collection crawl + sitemap fetch in parallel
    const [deepResults, sitemapProductUrls] = await Promise.all([
      Promise.all(collectionUrls.map((url) => discoverLinksFromPage(url, homepageUrl))),
      fetchSitemapProductUrls(homepageUrl),
    ]);

    const deepProductUrls: string[] = [];
    for (const links of deepResults) {
      for (const link of links) {
        if (/\/product|\/products|\/produit/i.test(link)) {
          try { deepProductUrls.push(new URL(link, homepageUrl).href); } catch {}
        }
      }
    }

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
    const productUrlsFromLinks = keyUrls.filter((u) => /\/product|\/products|\/produit/i.test(u));
    const nonProductUrls = keyUrls.filter((u) => !/\/product|\/products|\/produit/i.test(u));

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
    const productUrlsToFetch = allDiscoveredUrls.filter((u) => /\/product|\/products|\/produit/i.test(u));
    const otherUrlsToFetch = allDiscoveredUrls.filter((u) => !/\/product|\/products|\/produit/i.test(u));
    const prioritizedUrls = [...productUrlsToFetch, ...otherUrlsToFetch].slice(0, MAX_DETAILED_SCAN_PAGES);

    await emitProgress(input.onProgress, 25, "EXTRACT", `${prioritizedUrls.length} pages à analyser en parallèle (${productUrlsToFetch.length} produits, ${sitemapProductUrls.length} sitemap)…`);

    // ── Phase 6: Parallel page fetching in batches ──
    const BATCH_SIZE = 8;
    let fetchedCount = 0;
    
    for (let batchStart = 0; batchStart < prioritizedUrls.length; batchStart += BATCH_SIZE) {
      // Time guard: keep 18s for AI analysis + competitor prices
      if (Date.now() - start > GLOBAL_TIMEOUT_MS - 18000) break;

      const batch = prioritizedUrls.slice(batchStart, batchStart + BATCH_SIZE);
      const results = await fetchMultipleHttp(batch, BATCH_SIZE);

      for (const { url, html } of results) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
        fetchedCount++;

        try {
          pagesScanned.push(url);
          allSignals.push(extractSignalsFromHtml(html, url));
          detectedPrices.push(...extractPriceValues(html));

          if (/\/product|\/products|\/produit/i.test(url)) {
            productPages.push(url);
            productAnalyses.push(analyzeProductPageFromHtml(html, url));
          }

          // Also try to extract products from JSON-LD on any page
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
