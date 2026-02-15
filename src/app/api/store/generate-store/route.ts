import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createShopifyProduct } from "@/lib/connectors/shopify";
import { callOpenAIJsonWithSchema } from "@/lib/ai/openaiClient";
import { optimizeBatch } from "@/lib/image-optimizer";
import { analyzePhysicalMarket } from "@/lib/market-analysis";
import { computePhysicalPricing } from "@/lib/pricing-engine";
import { DOMAIN_PROMPTS } from "@/lib/ai/prompts/domain-prompts";
import { getEntitlements } from "@/lib/auth/entitlements";
import { createGenerationJobLog, enforceGenerationQuota, finishGenerationJobLog } from "@/lib/generation-guards";
import { getRuntimeFeatureFlags } from "@/lib/feature-flags";
import * as cheerio from "cheerio";
import { z } from "zod";

export const maxDuration = 60;

/* ─── Shared scraper helpers ─── */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

interface ScrapedProduct {
  title: string;
  description: string;
  price: string | null;
  currency: string | null;
  images: string[];
  brand: string | null;
  category: string | null;
  url: string;
}

const PageSchema = z.object({
  brand_name: z.string().min(2),
  brand_color: z.string().min(3),
  banner_text: z.string().min(2),
  product: z.object({
    title: z.string().min(3),
    price: z.number().positive(),
    compare_at_price: z.number().nonnegative(),
    short_description: z.string().min(8),
    features: z.array(z.string().min(2)).min(1),
    tags: z.string().min(1),
    product_type: z.string().min(1),
  }),
  review: z.object({
    rating: z.number().min(0).max(5),
    count: z.number().nonnegative(),
    label: z.string().min(1),
  }),
  hero: z.object({
    headline: z.string().min(3),
    bold_word: z.string().min(1),
    subtext: z.string().min(3),
  }),
  timeline: z.array(z.object({ period: z.string(), text: z.string() })).min(1),
  advantages: z.object({ title: z.string(), items: z.array(z.string()).min(1) }),
  comparison: z.object({
    our_name: z.string(),
    our_subtitle: z.string(),
    other_name: z.string(),
    rows: z.array(z.object({ feature: z.string(), us: z.boolean(), them: z.boolean() })).min(1),
  }),
  statistics: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(1),
  trust_badges: z.array(z.string()).min(1),
  conversion_booster: z
    .object({
      offers: z.array(z.string()).optional(),
      objections: z.array(z.string()).optional(),
      upsell: z.array(z.string()).optional(),
      cross_sell: z.array(z.string()).optional(),
      launch_checklist: z.array(z.string()).optional(),
    })
    .optional(),
});

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok || ct.includes("text/html")) return await res.text();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/* ─── Multi-strategy PARALLEL fetch for AliExpress ─── */
async function fetchAliExpressParallel(url: string): Promise<string | null> {
  const idMatch = url.match(/\/item\/(\d+)/);
  const itemId = idMatch?.[1];
  const wwwUrl = itemId
    ? `https://www.aliexpress.com/item/${itemId}.html`
    : url.replace(/https?:\/\/[^/]*aliexpress\.com/, "https://www.aliexpress.com");
  const mobileUrl = itemId
    ? `https://m.aliexpress.com/item/${itemId}.html`
    : url.replace(/https?:\/\/[^/]*aliexpress\.com/, "https://m.aliexpress.com");

  const strategies = [
    {
      label: "facebook",
      url: wwwUrl,
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    {
      label: "googlebot",
      url: wwwUrl,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    {
      label: "mobile",
      url: mobileUrl,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    },
    {
      label: "twitterbot",
      url: wwwUrl,
      headers: {
        "User-Agent": "Twitterbot/1.0",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    {
      label: "desktop",
      url,
      headers: BROWSER_HEADERS,
    },
  ];

  // Launch ALL strategies in parallel — first valid response wins
  const racePromises = strategies.map(async (s) => {
    try {
      console.log(`[fetchParallel] Starting ${s.label}: ${s.url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(s.url, {
        signal: controller.signal,
        headers: s.headers,
        redirect: "follow",
      });
      clearTimeout(timeout);
      const html = await res.text();
      const hasData =
        html.includes("og:title") ||
        html.includes("imagePathList") ||
        html.includes("summImagePathList");
      const isBlocked =
        html.includes("Just a moment") ||
        html.includes("cf-browser-verification") ||
        html.includes("challenge-form") ||
        html.includes("Maintaining");
      console.log(
        `[fetchParallel] ${s.label}: status=${res.status} len=${html.length} hasData=${hasData} isBlocked=${isBlocked}`
      );
      if (hasData && !isBlocked && html.length > 3000) return html;
      return null;
    } catch (err) {
      console.log(
        `[fetchParallel] ${s.label} failed: ${err instanceof Error ? err.message : err}`
      );
      return null;
    }
  });

  // Race: return the FIRST non-null result, with a 10s total timeout
  const totalTimeout = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.log("[fetchParallel] Total timeout reached (10s)");
      resolve(null);
    }, 10000)
  );

  // Use allSettled to collect all results, prefer one with og:title
  const result = await Promise.race([
    (async () => {
      const results = await Promise.allSettled(racePromises);
      let bestWithOgTitle: string | null = null;
      let firstValid: string | null = null;
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          if (!firstValid) firstValid = r.value;
          if (!bestWithOgTitle && r.value.includes("og:title")) {
            bestWithOgTitle = r.value;
          }
        }
      }
      return bestWithOgTitle ?? firstValid;
    })(),
    totalTimeout,
  ]);

  return result;
}

/* ─── AliExpress-specific: extract data from inline JS ─── */
function extractAliExpressData(
  html: string,
  url: string
): Partial<ScrapedProduct> | null {
  const partial: Partial<ScrapedProduct> = {};

  const imgMatch = html.match(/"imagePathList":\s*\[([^\]]+)\]/);
  if (imgMatch) {
    const imgs = imgMatch[1]
      .match(/"(https?:\/\/[^"]+)"/g)
      ?.map((s) => s.replace(/"/g, ""));
    if (imgs && imgs.length > 0) partial.images = imgs.slice(0, 10);
  }

  const ogTitle = html.match(
    /<meta[^>]+property="og:title"[^>]*content="([^"]+)"/
  );
  if (ogTitle) {
    partial.title = ogTitle[1]
      .replace(/\s*[-|]\s*(AliExpress|Aliexpress).*$/i, "")
      .replace(/\s+\d{6,}$/, "")
      .trim();
  }
  if (!partial.title || partial.title.length < 5) {
    const subjectMatch = html.match(/"subject"\s*:\s*"([^"]+)"/);
    if (subjectMatch) partial.title = subjectMatch[1].trim();
  }
  if (!partial.title || partial.title.length < 5) {
    const summMatch = html.match(/"summImagePathList":\s*\["([^"]+)"/);
    if (summMatch) {
      const decoded = decodeURIComponent(summMatch[1].split('/').pop()?.replace(/\.jpg.*$/, '').replace(/-/g, ' ') ?? '');
      if (decoded.length > 10) partial.title = decoded;
    }
  }

  const pricePatterns = [
    /"formattedPrice"\s*:\s*"([^"]+)"/,
    /"minPrice"\s*:\s*"([^"]+)"/,
    /"discountPrice"\s*:\s*"([^"]+)"/,
    /"actMinPrice"\s*:\s*"([^"]+)"/,
    /"salePrice"\s*:\s*"([^"]+)"/,
  ];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) {
      const c = m[1].replace(/[^\d.,]/g, "").replace(",", ".");
      if (c && parseFloat(c) > 0) {
        partial.price = c;
        break;
      }
    }
  }

  const currMatch = html.match(/"currencyCode"\s*:\s*"([A-Z]{3})"/);
  if (currMatch) partial.currency = currMatch[1];
  if (!partial.currency) {
    if (url.includes("fr.aliexpress")) partial.currency = "EUR";
    else partial.currency = "USD";
  }

  const ogDesc = html.match(
    /<meta[^>]+property="og:description"[^>]*content="([^"]+)"/
  );
  if (ogDesc) partial.description = ogDesc[1].trim();

  const catMatch = html.match(/"categoryName"\s*:\s*"([^"]+)"/);
  if (catMatch) partial.category = catMatch[1];

  if (partial.title && partial.title.length >= 3) return partial;
  return null;
}

/* ─── AliExpress fallback: extract product directly from any HTML ─── */
function extractAliProduct(html: string, url: string): ScrapedProduct | null {
  const aliData = extractAliExpressData(html, url);
  if (aliData?.title) {
    return {
      title: aliData.title,
      description: aliData.description ?? "",
      price: aliData.price ?? null,
      currency: aliData.currency ?? "EUR",
      images: aliData.images ?? [],
      brand: null,
      category: aliData.category ?? null,
      url,
    };
  }
  return null;
}

function scrapeProduct(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    "";
  title = title
    .replace(/\s*[-|]\s*(AliExpress|Amazon|Temu|eBay|Alibaba).*$/i, "")
    .trim();
  title = title.replace(/\s+\d{6,}$/, "").trim();

  let description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonLd: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "");
      if (json["@type"] === "Product") jsonLd = json;
      if (Array.isArray(json["@graph"])) {
        const prod = json["@graph"].find(
          (g: Record<string, unknown>) => g["@type"] === "Product"
        );
        if (prod) jsonLd = prod;
      }
    } catch {
      /* ignore */
    }
  });

  if (jsonLd != null) {
    if (!title && jsonLd.name) title = String(jsonLd.name);
    if (!description && jsonLd.description)
      description = String(jsonLd.description);
  }

  let price: string | null = null;
  let currency: string | null = null;
  if (jsonLd != null) {
    const offers = Array.isArray(jsonLd.offers)
      ? jsonLd.offers[0]
      : jsonLd.offers;
    if (offers && typeof offers === "object") {
      price = String(offers.price ?? offers.lowPrice ?? "");
      currency = String(offers.priceCurrency ?? "");
    }
  }
  if (!price) {
    const m = html.match(
      /(\d+[.,]\d{1,2})\s*[€$£]|[€$£]\s*(\d+[.,]\d{1,2})/
    );
    if (m) price = (m[1] || m[2]).replace(",", ".");
  }

  // Images
  const images: string[] = [];
  const seenImgs = new Set<string>();
  const ogImg = $('meta[property="og:image"]').attr("content");
  if (ogImg) {
    seenImgs.add(ogImg);
    images.push(ogImg);
  }

  if (jsonLd?.image) {
    const imgs = Array.isArray(jsonLd.image)
      ? jsonLd.image
      : [jsonLd.image];
    for (const img of imgs) {
      const src = typeof img === "string" ? img : img?.url;
      if (src && typeof src === "string" && !seenImgs.has(src)) {
        seenImgs.add(src);
        images.push(src);
      }
    }
  }

  const gallerySelectors = [
    ".gallery img",
    ".product-images img",
    ".product-gallery img",
    '[class*="gallery"] img',
    '[class*="slider"] img',
    '[class*="carousel"] img',
    ".magnifier-image",
  ];
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const src =
        $(el).attr("data-src") ||
        $(el).attr("data-zoom-image") ||
        $(el).attr("src");
      if (
        src &&
        src.startsWith("http") &&
        !seenImgs.has(src) &&
        images.length < 10
      ) {
        seenImgs.add(src);
        images.push(src);
      }
    });
  }

  if (images.length < 3) {
    $("img").each((_, el) => {
      if (images.length >= 10) return;
      const src = $(el).attr("data-src") || $(el).attr("src");
      if (
        src &&
        src.startsWith("http") &&
        !seenImgs.has(src) &&
        !/logo|icon|flag|sprite|avatar/i.test(src)
      ) {
        seenImgs.add(src);
        images.push(src);
      }
    });
  }

  const brand = jsonLd?.brand
    ? typeof jsonLd.brand === "string"
      ? jsonLd.brand
      : String(jsonLd.brand?.name ?? "")
    : $('[itemprop="brand"]').first().text().trim() || null;

  let category: string | null =
    $('[itemprop="category"]').first().text().trim() ||
    $(".breadcrumb a, .breadcrumbs a, [class*='breadcrumb'] a")
      .last()
      .text()
      .trim() ||
    null;

  if (!description || description.length < 30) {
    const detailText = $(
      ".product-description, .description, [itemprop='description']"
    )
      .first()
      .text()
      .trim();
    if (detailText && detailText.length > description.length)
      description = detailText.slice(0, 2000);
  }

  // AliExpress enrichment from inline JS
  const isAli = url.toLowerCase().includes("aliexpress");
  if (isAli) {
    // Filter useless AliExpress generic descriptions
    if (description && /smarter shopping|aliexpress\.com/i.test(description)) {
      description = "";
    }

    const aliData = extractAliExpressData(html, url);
    if (aliData) {
      if ((!title || title.length < 3) && aliData.title) title = aliData.title;
      if ((!description || description.length < 10) && aliData.description)
        description = aliData.description ?? "";
      if (!price && aliData.price) price = aliData.price;
      if (!currency && aliData.currency) currency = aliData.currency;
      if (!category && aliData.category) category = aliData.category ?? null;
      // Always merge AliExpress imagePathList images (og:image often returns only 1)
      if (aliData.images && aliData.images.length > 0) {
        for (const img of aliData.images) {
          if (!seenImgs.has(img) && images.length < 10) {
            seenImgs.add(img);
            images.push(img);
          }
        }
      }
    }
  }

  return {
    title,
    description,
    price,
    currency,
    images: images.slice(0, 10),
    brand,
    category,
    url,
  };
}

/* ─── AI Prompt for rich page generation ─── */

const PAGE_SYSTEM_PROMPT = `Tu es un expert mondial en dropshipping, copywriting persuasif de niveau agence, et optimisation de conversion e-commerce. Tu crées les MEILLEURES pages produit Shopify au monde — chaque mot doit vendre, chaque section doit convaincre.

MISSION CRITIQUE: À partir d'un produit scrapé, générer une page produit Shopify PARFAITE qui maximise les conversions et crée un univers de marque premium autour du produit.

TECHNIQUES DE COPYWRITING OBLIGATOIRES:
- Utilise des POWER WORDS: exclusif, premium, révolutionnaire, garanti, prouvé, instantané, secret, tendance
- Crée de l'URGENCE et de la RARETÉ: stock limité, offre temporaire, best-seller
- PREUVE SOCIALE massive: chiffres impressionnants mais crédibles
- Appuie sur les ÉMOTIONS: transformation, confiance, satisfaction, fierté
- BÉNÉFICES avant caractéristiques: ce que le client GAGNE, pas ce que le produit EST
- Parle au client directement (vous) et crée une connexion émotionnelle
- Commence les descriptions par le PROBLÈME du client, puis présente LA solution

Tu dois générer un JSON avec cette structure EXACTE:
{
  "brand_name": "Nom de marque court (2-3 syllabes max), moderne, premium, mémorable — JAMAIS le nom du fournisseur",
  "brand_color": "#hexcolor (couleur premium adaptée à la niche: noir #000000, bleu nuit #1a1a3e, bordeaux #8B0000, vert forêt #1B4332, etc.)",
  "banner_text": "🔥 OFFRE LIMITÉE — Livraison GRATUITE dès 50€ | ⚡ Expédition rapide dans le monde entier",
  "product": {
    "title": "Titre accrocheur optimisé conversion (max 60 chars, avec bénéfice principal intégré)",
    "price": 0,
    "compare_at_price": 0,
    "short_description": "Description PERSUASIVE (3-4 phrases). Commencer par le problème client → présenter le produit comme LA solution → détailler un bénéfice concret → call-to-action subtil. Utiliser des mots qui créent du désir et de l'urgence.",
    "features": ["✨ Bénéfice concret orienté résultat 1", "🎯 Bénéfice qui résout un problème 2", "💪 Bénéfice émotionnel/transformation 3", "🔒 Rassurance qualité/garantie 4", "⭐ Exclusivité/rareté 5"],
    "tags": "tags SEO pertinents séparés par virgules",
    "product_type": "Type de produit catégorisé"
  },
  "review": {
    "rating": 4.8,
    "count": 0,
    "label": "Excellent"
  },
  "hero": {
    "headline": "Phrase d'accroche PUISSANTE (10-15 mots) qui crée une image mentale et vend le RÉSULTAT, pas le produit",
    "bold_word": "mot_le_plus_impactant",
    "subtext": "Sous-titre avec preuve sociale ou bénéfice concret qui renforce la crédibilité (1 phrase max)"
  },
  "timeline": [
    {"period": "📦 Réception", "text": "Déballez votre [produit] et découvrez sa qualité premium dès le premier contact"},
    {"period": "🌟 Jour 1", "text": "Résultat immédiat visible — décrivez la transformation initiale ressentie"},
    {"period": "💪 Première semaine", "text": "Les bénéfices s'accumulent — résultat concret et mesurable au quotidien"},
    {"period": "🏆 Après 1 mois", "text": "Transformation complète — le client ne peut plus s'en passer"},
    {"period": "❤️ Pour toujours", "text": "Satisfaction durable — les clients rachètent et recommandent autour d'eux"}
  ],
  "advantages": {
    "title": "Phrase accrocheuse qui résume POURQUOI ce produit est supérieur (avec chiffre si possible)",
    "items": ["Avantage 1 unique et désirable", "Avantage 2 qui résout un problème concret", "Avantage 3 qualité/durabilité", "Avantage 4 praticité au quotidien", "Avantage 5 exclusivité de l'offre"]
  },
  "comparison": {
    "our_name": "Notre [Nom Produit]",
    "our_subtitle": "Original Premium",
    "other_name": "Copies bas de gamme",
    "rows": [
      {"feature": "Caractéristique valorisante détaillée qui fait la différence 1", "us": true, "them": false},
      {"feature": "Caractéristique valorisante 2 avec détail de qualité", "us": true, "them": false},
      {"feature": "Garantie ou service après-vente important", "us": true, "them": false},
      {"feature": "Point de parité crédible (pour la crédibilité)", "us": true, "them": true},
      {"feature": "Avantage exclusif ultime décisif", "us": true, "them": false}
    ]
  },
  "statistics": [
    {"value": "96%", "label": "des clients recommandent ce produit à leurs proches"},
    {"value": "50K+", "label": "produits vendus dans plus de 45 pays"},
    {"value": "4.8/5", "label": "note moyenne basée sur des milliers d'avis vérifiés"}
  ],
  "faq": [
    {"question": "Pourquoi [produit] est-il le meilleur choix ?", "answer": "Réponse valorisante qui crée confiance — mentionner qualité premium, garantie, et supériorité vs concurrence. 2-3 phrases percutantes."},
    {"question": "Quand vais-je recevoir ma commande ?", "answer": "Réponse rassurante sur délais — mentionner suivi de colis, livraison gratuite si applicable, et fiabilité."},
    {"question": "Que faire si je ne suis pas satisfait ?", "answer": "Politique retour généreuse — satisfaction garantie ou remboursé sous 30 jours, aucun risque pour le client."}
  ],
  "trust_badges": ["Satisfait ou remboursé", "Livraison sécurisée", "Support 24/7"]
}

RÈGLES CRITIQUES DE PRICING:
- Si le prix source est connu: multiplier par 2.5 à 4x pour le prix de vente
- Le compare_at_price doit être 40-60% supérieur au prix de vente (grosse réduction perçue)
- Exemple: prix source 8€ → prix de vente 29.90€, compare_at_price 59.90€
- Arrondir les prix en .90 ou .99 pour un look professionnel

RÈGLES CRITIQUES DE CONTENU:
- TOUJOURS répondre dans la LANGUE DEMANDÉE (par défaut français)
- Le brand_name doit sonner PREMIUM et PROFESSIONNEL (2-3 syllabes, facile à prononcer)
- Les review count réalistes: entre 8000 et 35000 selon la niche
- Les statistiques crédibles: entre 88% et 98%
- La timeline DOIT raconter une HISTOIRE de transformation progressive
- La comparaison DÉVASTANTE pour la concurrence mais crédible (1-2 them: true)
- Le hero headline MÉMORABLE — comme un slogan publicitaire TV
- Le FAQ répond aux 3 objections principales: qualité, délai, garantie
- NE JAMAIS mentionner AliExpress, Amazon, le prix d'achat ou la plateforme source
- Chaque feature commence par un emoji approprié
- La short_description DOIT commencer par le problème du client puis la solution
- Réponds UNIQUEMENT en JSON valide, aucun texte autour du JSON`;

/* ─── Proxy fallback for AliExpress (when datacenter IPs are blocked) ─── */
async function fetchViaProxy(url: string): Promise<string | null> {
  const idMatch = url.match(/\/item\/(\d+)/);
  if (!idMatch) return null;
  const itemId = idMatch[1];
  const targetUrl = `https://www.aliexpress.com/item/${itemId}.html`;

  // Try multiple free scraping proxy services (codetabs works best)
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      console.log(`[fetchViaProxy] Trying: ${proxyUrl.substring(0, 60)}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { Accept: "text/html,application/json,*/*" },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const html = await res.text();
      const hasData =
        html.includes("og:title") ||
        html.includes("imagePathList") ||
        html.includes("summImagePathList");
      const isBlocked =
        html.includes("Just a moment") ||
        html.includes("Maintaining");
      console.log(
        `[fetchViaProxy] status=${res.status} len=${html.length} hasData=${hasData} isBlocked=${isBlocked}`
      );
      if (hasData && !isBlocked && html.length > 3000) return html;
    } catch (err) {
      console.log(
        `[fetchViaProxy] failed: ${err instanceof Error ? err.message : err}`
      );
    }
  }
  return null;
}

/* ─── GET handler: debug AliExpress scraping ─── */
export async function GET(req: NextRequest) {
  const testUrl = req.nextUrl.searchParams.get("url") || "https://fr.aliexpress.com/item/1005008086404944.html";
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
    origLog(...args);
  };

  try {
    const html = await fetchAliExpressParallel(testUrl);
    if (html) {
      const scraped = scrapeProduct(html, testUrl);
      const aliData = extractAliExpressData(html, testUrl);
      console.log = origLog;
      return NextResponse.json({
        success: true,
        htmlLength: html.length,
        scraped: { title: scraped.title, images: scraped.images.length, price: scraped.price, currency: scraped.currency },
        aliData: aliData ? { title: aliData.title, images: aliData.images?.length, price: aliData.price } : null,
        logs,
      });
    }

    // Try proxy
    const proxyHtml = await fetchViaProxy(testUrl);
    console.log = origLog;
    if (proxyHtml) {
      const scraped = scrapeProduct(proxyHtml, testUrl);
      return NextResponse.json({
        success: true,
        via: "proxy",
        htmlLength: proxyHtml.length,
        scraped: { title: scraped.title, images: scraped.images.length, price: scraped.price },
        logs,
      });
    }

    return NextResponse.json({ success: false, message: "All strategies failed", logs });
  } catch (err) {
    console.log = origLog;
    return NextResponse.json({ success: false, error: String(err), logs });
  }
}

/* ─── POST handler ─── */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { action } = body as { action: string };

    /* ══════════ ACTION: Scrape URLs ══════════ */
    if (action === "scrape") {
      const { urls } = body as { urls: string[] };
      if (!urls || urls.length === 0) {
        return NextResponse.json(
          { error: "Au moins un lien requis" },
          { status: 400 }
        );
      }
      if (urls.length > 5) {
        return NextResponse.json(
          { error: "Maximum 5 liens" },
          { status: 400 }
        );
      }

      const results: (ScrapedProduct | null)[] = [];
      for (const url of urls) {
        const isAli = url.toLowerCase().includes("aliexpress");
        try {
          let product: ScrapedProduct | null = null;

          if (isAli) {
            // Step 1: Run ALL AliExpress strategies in parallel
            console.log(`[scrape] AliExpress detected, running parallel strategies...`);
            let html = await fetchAliExpressParallel(url.trim());
            
            // Step 2: If parallel failed, try proxy services
            if (!html) {
              console.log(`[scrape] Parallel strategies failed, trying proxy...`);
              html = await fetchViaProxy(url.trim());
            }

            if (html) {
              console.log(`[scrape] Got HTML (${html.length} chars), extracting product...`);
              const scraped = scrapeProduct(html, url.trim());
              if (scraped.title && scraped.title.length >= 3) {
                product = scraped;
                console.log(`[scrape] Product extracted: "${scraped.title}" | ${scraped.images.length} images`);
              } else {
                // scrapeProduct couldn't get title — try raw extraction
                product = extractAliProduct(html, url.trim());
                if (product) console.log(`[scrape] Raw extraction: "${product.title}" | ${product.images.length} images`);
              }
            } else {
              console.log(`[scrape] All AliExpress strategies failed for ${url}`);
            }
          }

          // Non-AliExpress or AliExpress parallel+proxy failed: try basic fetchPage
          if (!product) {
            try {
              console.log(`[scrape] Trying basic fetchPage for ${url}...`);
              const html = await fetchPage(url.trim());
              if (html) {
                const scraped = scrapeProduct(html, url.trim());
                if (scraped.title && scraped.title.length >= 3) {
                  product = scraped;
                  console.log(`[scrape] fetchPage success: "${scraped.title}"`);
                }
              }
            } catch (e) {
              console.log(`[scrape] fetchPage failed: ${e instanceof Error ? e.message : e}`);
            }
          }

          results.push(product);
        } catch (err) {
          console.log(`[scrape] Error for ${url}: ${err}`);
          results.push(null);
        }
      }

      const scraped = results.filter(Boolean) as ScrapedProduct[];
      if (scraped.length === 0) {
        return NextResponse.json(
          { error: "Impossible d'extraire les produits. Vérifiez les liens." },
          { status: 422 }
        );
      }

      return NextResponse.json({ products: scraped });
    }

    /* ══════════ ACTION: Generate rich page data ══════════ */
    if (action === "optimize-images") {
      const { sourceImages, storeId } = body as { sourceImages?: string[]; storeId?: string };
      if (!Array.isArray(sourceImages) || sourceImages.length === 0) {
        return NextResponse.json({ error: "Aucune image à optimiser" }, { status: 400 });
      }

      const flags = await getRuntimeFeatureFlags();
      if (!flags.enable_ai_image_optimizer) {
        return NextResponse.json(
          { error: "Optimisation image IA désactivée par feature flag." },
          { status: 503 }
        );
      }

      const optimized = await optimizeBatch({
        userId: user.id,
        imageUrls: sourceImages.slice(0, 12),
        context: "physical_builder",
        storeId: storeId ?? null,
      });

      return NextResponse.json({
        optimizedImages: optimized.map((o) => o.outputImageUrl),
      });
    }

    /* ══════════ ACTION: Generate rich page data ══════════ */
    if (action === "generate-page") {
      const { scrapedProduct, brandName, language } = body as {
        scrapedProduct: ScrapedProduct;
        brandName: string;
        selectedImages: string[];
        language: string;
      };

      if (!scrapedProduct) {
        return NextResponse.json(
          { error: "Produit manquant" },
          { status: 400 }
        );
      }

      const flags = await getRuntimeFeatureFlags();
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_started_at, trial_ends_at, scans_used")
        .eq("user_id", user.id)
        .single();
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();
      const entitlements = getEntitlements(profile ?? null, subscription ?? null);
      if (flags.enforce_generation_limits) {
        try {
          await enforceGenerationQuota({ userId: user.id, plan: entitlements.plan });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.startsWith("PLAN_DAILY_LIMIT:")) {
            const limit = msg.split(":")[1];
            return NextResponse.json({ error: `Limite atteinte: ${limit} créations max par jour pour ton plan.` }, { status: 429 });
          }
          if (msg.startsWith("PLAN_MONTHLY_LIMIT:")) {
            const limit = msg.split(":")[1];
            return NextResponse.json({ error: `Limite atteinte: ${limit} créations max par mois pour ton plan.` }, { status: 429 });
          }
          return NextResponse.json({ error: "Ton plan actuel ne permet pas de lancer une génération." }, { status: 403 });
        }
      }

      const jobId = await createGenerationJobLog({
        userId: user.id,
        jobKind: "physical_create",
        source: "builder",
        step: "generate-page",
        inputPayload: {
          source_url: scrapedProduct.url,
          source_title: scrapedProduct.title,
          selected_images_count: Array.isArray((body as { selectedImages?: string[] }).selectedImages)
            ? (body as { selectedImages?: string[] }).selectedImages?.length ?? 0
            : 0,
        },
      });

      const langLabel =
        {
          fr: "français",
          en: "anglais",
          es: "espagnol",
          de: "allemand",
        }[language ?? "fr"] ?? "français";

      const selectedImages = (body as { selectedImages?: string[] }).selectedImages ?? [];
      const sourceImages = selectedImages.length
        ? selectedImages
        : (scrapedProduct.images ?? []).slice(0, 8);

      const optimizedImages = flags.enable_ai_image_optimizer
        ? (await optimizeBatch({
            userId: user.id,
            imageUrls: sourceImages,
            context: "physical_builder",
          })).map((o) => o.outputImageUrl)
        : sourceImages;

      const sourcePriceParsed = scrapedProduct.price
        ? Number(String(scrapedProduct.price).replace(/[^\d.,]/g, "").replace(",", "."))
        : null;
      const pricing = flags.enable_smart_pricing
        ? computePhysicalPricing({
            market: await analyzePhysicalMarket({
              sourcePrice: Number.isFinite(sourcePriceParsed ?? NaN) ? sourcePriceParsed : null,
              currency: scrapedProduct.currency,
            }),
            sourceCost: Number.isFinite(sourcePriceParsed ?? NaN) ? sourcePriceParsed : null,
          })
        : {
            currency: scrapedProduct.currency || "EUR",
            safe: sourcePriceParsed ? Number((sourcePriceParsed * 2).toFixed(2)) : 29.99,
            optimal: sourcePriceParsed ? Number((sourcePriceParsed * 2.6).toFixed(2)) : 39.99,
            aggressive: sourcePriceParsed ? Number((sourcePriceParsed * 3.1).toFixed(2)) : 49.99,
            estimatedMinMarginPct: 30,
            estimatedOptimalMarginPct: 55,
            positioning: "mid" as const,
            explanation: {
              why: ["Mode fallback: smart pricing désactivé par feature flag."],
              competitorLow: null,
              competitorAvg: null,
              competitorHigh: null,
              baselineCost: sourcePriceParsed ?? 0,
            },
          };

      const pricingContext = `
PRICING INTELLIGENT (obligatoire):
- Devise: ${pricing.currency}
- Prix Safe: ${pricing.safe}
- Prix Optimal: ${pricing.optimal}
- Prix Aggressive: ${pricing.aggressive}
- Marge min estimée: ${pricing.estimatedMinMarginPct}%
- Marge optimale estimée: ${pricing.estimatedOptimalMarginPct}%
- Positionnement: ${pricing.positioning}
- Concurrence (low/avg/high): ${pricing.explanation.competitorLow ?? "N/A"} / ${pricing.explanation.competitorAvg ?? "N/A"} / ${pricing.explanation.competitorHigh ?? "N/A"}
Utilise le prix Optimal comme prix principal. Tu peux utiliser Aggressive en compare_at_price si pertinent.`;

      const userPrompt = `GÉNÈRE une page produit Shopify haute conversion COMPLÈTE en ${langLabel}.

DONNÉES DU PRODUIT SOURCE:
- Titre original: ${scrapedProduct.title}
- Description complète: ${scrapedProduct.description?.slice(0, 1500) || "Non disponible"}
- Prix source (fournisseur): ${scrapedProduct.price ? `${scrapedProduct.price} ${scrapedProduct.currency ?? ""}` : "Inconnu"}
- Marque originale: ${scrapedProduct.brand ?? "Inconnue"}
- Catégorie: ${scrapedProduct.category ?? "Inconnue"}
- ${scrapedProduct.images?.length ?? 0} images disponibles
- Images optimisées IA disponibles: ${optimizedImages.length}

${brandName && brandName !== "YOUR BRAND" ? `MARQUE SOUHAITÉE: "${brandName}" — utilise ce nom exactement.` : "INVENTE un nom de marque court, premium et mémorable (2-3 syllabes, facile à prononcer, qui sonne luxe/moderne)."}

${pricingContext}

INSTRUCTIONS:
1. Réécris ENTIÈREMENT le titre et la description — NE copie PAS le texte source
2. Crée un univers de marque cohérent et premium autour du produit
3. Les prix doivent utiliser la devise ${pricing.currency} et rester cohérents avec le pricing intelligent fourni
4. Chaque section doit vendre le produit — AUCUN texte générique ou fade
5. Le copywriting doit créer du DÉSIR, de l'URGENCE et de la CONFIANCE

Génère le JSON complet avec TOUTES les sections: brand_name, brand_color, banner_text, product, review, hero, timeline, advantages, comparison, statistics, faq, trust_badges, conversion_booster.
Dans conversion_booster, donne: offers, objections, upsell, cross_sell, launch_checklist (pragmatiques, actionnables, orientés conversion).`;

      try {
        const result = await callOpenAIJsonWithSchema({
          schema: PageSchema,
          system: `${PAGE_SYSTEM_PROMPT}\n\n${DOMAIN_PROMPTS.copy}\n\n${DOMAIN_PROMPTS.pricing}\n\n${DOMAIN_PROMPTS.branding}\n\n${DOMAIN_PROMPTS.legal}`,
          user: userPrompt,
          temperature: 0.8,
          maxTokens: 4000,
          retries: 2,
        });

        // Override brand_name if user specified one
        if (brandName && brandName !== "YOUR BRAND") {
          (result as Record<string, unknown>).brand_name = brandName;
        }

        const asRecord = result as Record<string, unknown>;
        const product = (asRecord.product as Record<string, unknown> | undefined) ?? {};
        if (!product.price || Number(product.price) <= 0) {
          product.price = pricing.optimal;
        }
        if (!product.compare_at_price || Number(product.compare_at_price) <= Number(product.price)) {
          product.compare_at_price = pricing.aggressive;
        }
        asRecord.product = product;
        asRecord.optimized_images = optimizedImages;
        asRecord.pricing_recommendation = pricing;

        const response = {
          page: asRecord,
          optimizedImages,
          pricing,
        };
        await finishGenerationJobLog({
          jobId,
          success: true,
          outputPayload: {
            optimized_images_count: optimizedImages.length,
            pricing_optimal: pricing.optimal,
          },
        });
        return NextResponse.json(response);
      } catch (err) {
        await finishGenerationJobLog({
          jobId,
          success: false,
          errorMessage: err instanceof Error ? err.message : "AI_GENERATION_FAILED",
        });
        return NextResponse.json(
          {
            error: `Erreur IA : ${err instanceof Error ? err.message : "Inconnue"}`,
          },
          { status: 500 }
        );
      }
    }

    /* ══════════ ACTION: Create product on Shopify (SSE) ══════════ */
    if (action === "create-product") {
      const { storeId, pageData, images } = body as {
        storeId: string;
        pageData: {
          brand_name: string;
          brand_color: string;
          banner_text: string;
          product: {
            title: string;
            price: number;
            compare_at_price: number;
            short_description: string;
            features: string[];
            tags: string;
            product_type: string;
          };
          review: { rating: number; count: number; label: string };
          hero: { headline: string; bold_word: string; subtext: string };
          timeline: Array<{ period: string; text: string }>;
          advantages: { title: string; items: string[] };
          comparison: {
            our_name: string;
            our_subtitle: string;
            other_name: string;
            rows: Array<{ feature: string; us: boolean; them: boolean }>;
          };
          statistics: Array<{ value: string; label: string }>;
          faq: Array<{ question: string; answer: string }>;
          trust_badges: string[];
        };
        images: string[];
      };

      if (!storeId || !pageData) {
        return NextResponse.json(
          { error: "Données manquantes" },
          { status: 400 }
        );
      }

      // Verify store ownership
      const { data: store } = await supabase
        .from("stores")
        .select("id, user_id")
        .eq("id", storeId)
        .single();
      if (!store || store.user_id !== user.id) {
        return NextResponse.json(
          { error: "Boutique non trouvée" },
          { status: 403 }
        );
      }

      // Check Shopify connected
      const { data: integration } = await supabase
        .from("store_integrations")
        .select("status")
        .eq("store_id", storeId)
        .eq("provider", "shopify")
        .eq("status", "connected")
        .maybeSingle();
      if (!integration) {
        return NextResponse.json(
          { error: "Shopify non connecté" },
          { status: 400 }
        );
      }

      // Build rich body_html from all sections
      const bodyHtml = buildProductHtml(pageData);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: Record<string, unknown>) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          };

          send({ type: "progress", percent: 10, label: "🔗 Connexion à votre boutique Shopify…" });
          await new Promise((r) => setTimeout(r, 600));

          send({ type: "progress", percent: 20, label: `📸 Préparation de ${images.length} images…` });
          await new Promise((r) => setTimeout(r, 500));

          send({ type: "progress", percent: 35, label: "📦 Création du produit sur Shopify…" });

          const res = await createShopifyProduct(storeId, {
            title: pageData.product.title,
            body_html: bodyHtml,
            product_type: pageData.product.product_type,
            tags: pageData.product.tags,
            images: images.slice(0, 8).map((src) => ({ src })),
            variants: [
              {
                price: String(pageData.product.price),
                compare_at_price: pageData.product.compare_at_price
                  ? String(pageData.product.compare_at_price)
                  : undefined,
                title: "Default",
              },
            ],
          });

          send({ type: "progress", percent: 65, label: "🎨 Application du design et mise en page…" });
          await new Promise((r) => setTimeout(r, 600));

          send({ type: "progress", percent: 80, label: "🔍 Optimisation SEO et métadonnées…" });
          await new Promise((r) => setTimeout(r, 400));

          send({ type: "progress", percent: 92, label: "✅ Vérification et publication…" });
          await new Promise((r) => setTimeout(r, 300));

          const results = [
            {
              title: pageData.product.title,
              success: res.success,
              error: res.error,
              productId: res.productId,
            },
          ];

          send({
            type: "done",
            success: res.success,
            results,
            brand_name: pageData.brand_name,
          });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    /* ══════════ LEGACY: generate (old format, keep for compat) ══════════ */
    if (action === "generate") {
      const { scrapedProducts } = body as {
        scrapedProducts: ScrapedProduct[];
      };
      if (!scrapedProducts || scrapedProducts.length === 0) {
        return NextResponse.json(
          { error: "Produits manquants" },
          { status: 400 }
        );
      }

      const productDescriptions = scrapedProducts
        .map(
          (p, i) => `
PRODUIT ${i + 1}:
- Titre: ${p.title}
- Description: ${p.description.slice(0, 800)}
- Prix source: ${p.price ? `${p.price} ${p.currency ?? ""}` : "Inconnu"}
- Marque: ${p.brand ?? "Inconnue"}
- Catégorie: ${p.category ?? "Inconnue"}
- Images: ${p.images.length}
`
        )
        .join("\n");

      const userPrompt = `Voici ${scrapedProducts.length} produit(s) source. Génère une boutique Shopify complète.

${productDescriptions}

Génère le JSON avec: store_concept, products, extra_products, et collection.`;

      try {
        const result = await callOpenAIJsonWithSchema({
          schema: z.object({
            store_concept: z.unknown(),
            products: z.array(z.unknown()).optional(),
            extra_products: z.array(z.unknown()).optional(),
            collection: z.unknown().optional(),
          }),
          system: `${PAGE_SYSTEM_PROMPT}\n\n${DOMAIN_PROMPTS.copy}\n\n${DOMAIN_PROMPTS.branding}`,
          user: userPrompt,
          temperature: 0.6,
          maxTokens: 4000,
          retries: 2,
        });
        return NextResponse.json({
          store: result,
          sourceProducts: scrapedProducts,
        });
      } catch (err) {
        return NextResponse.json(
          {
            error: `Erreur IA : ${err instanceof Error ? err.message : "Inconnue"}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("[generate-store]", err);
    return NextResponse.json(
      {
        error: `Erreur serveur : ${err instanceof Error ? err.message : "Inconnue"}`,
      },
      { status: 500 }
    );
  }
}

/* ─── Build rich HTML from page sections ─── */
function buildProductHtml(data: {
  brand_name: string;
  brand_color: string;
  banner_text: string;
  product: {
    title: string;
    price: number;
    compare_at_price: number;
    short_description: string;
    features: string[];
    tags: string;
    product_type: string;
  };
  review: { rating: number; count: number; label: string };
  hero: { headline: string; bold_word: string; subtext: string };
  timeline: Array<{ period: string; text: string }>;
  advantages: { title: string; items: string[] };
  comparison: {
    our_name: string;
    our_subtitle: string;
    other_name: string;
    rows: Array<{ feature: string; us: boolean; them: boolean }>;
  };
  statistics: Array<{ value: string; label: string }>;
  faq: Array<{ question: string; answer: string }>;
  trust_badges: string[];
  conversion_booster?: {
    offers?: string[];
    objections?: string[];
    upsell?: string[];
    cross_sell?: string[];
    launch_checklist?: string[];
  };
}): string {
  const color = data.brand_color || "#000000";

  // Features badges
  const featuresBadges = data.product.features
    .map(
      (f) =>
        `<span style="display:inline-block;padding:6px 14px;margin:4px;background:#f3f4f6;border-radius:20px;font-size:13px;font-weight:500;">✅ ${f}</span>`
    )
    .join("");

  // Trust badges
  const trustBadgesHtml = data.trust_badges
    .map(
      (b) =>
        `<span style="color:${color};font-size:12px;font-weight:600;">${b}</span>`
    )
    .join(" &nbsp;·&nbsp; ");

  // Star rating
  const stars = "★".repeat(Math.floor(data.review.rating)) + (data.review.rating % 1 >= 0.5 ? "½" : "");

  // Timeline
  const timelineHtml = data.timeline
    .map(
      (t, i) =>
        `<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;${
          i < data.timeline.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""
        }">
        <div style="width:10px;height:10px;border-radius:50%;background:${
          i < 3 ? "#1a1a1a" : "#d1d5db"
        };margin-top:4px;flex-shrink:0;"></div>
        <div>
          <p style="font-weight:700;font-size:13px;${
            i >= 3 ? "color:#9ca3af;" : ""
          }">${t.period}</p>
          <p style="font-size:12px;color:#6b7280;">${t.text}</p>
        </div>
      </div>`
    )
    .join("");

  // Comparison table
  const compRows = data.comparison.rows
    .map(
      (r) =>
        `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px;font-size:12px;text-align:left;">${r.feature}</td>
        <td style="padding:10px;text-align:center;">${r.us ? "✅" : "❌"}</td>
        <td style="padding:10px;text-align:center;">${r.them ? "✅" : "❌"}</td>
      </tr>`
    )
    .join("");

  // Statistics
  const statsHtml = data.statistics
    .map(
      (s) =>
        `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:28px;font-weight:900;color:${color};">${s.value}</span>
        <span style="font-size:13px;color:#6b7280;">${s.label}</span>
      </div>`
    )
    .join("");

  // FAQ
  const faqHtml = data.faq
    .map(
      (f) =>
        `<details style="border-bottom:1px solid #e5e7eb;padding:12px 0;">
        <summary style="font-weight:600;font-size:14px;cursor:pointer;">${f.question}</summary>
        <p style="margin-top:8px;font-size:13px;color:#6b7280;line-height:1.6;">${f.answer}</p>
      </details>`
    )
    .join("");
  const offersHtml = (data.conversion_booster?.offers ?? [])
    .map((item) => `<li style="margin:6px 0;">🎯 ${item}</li>`)
    .join("");
  const objectionsHtml = (data.conversion_booster?.objections ?? [])
    .map((item) => `<li style="margin:6px 0;">• ${item}</li>`)
    .join("");
  const upsellHtml = (data.conversion_booster?.upsell ?? [])
    .map((item) => `<li style="margin:6px 0;">⬆️ ${item}</li>`)
    .join("");
  const crossSellHtml = (data.conversion_booster?.cross_sell ?? [])
    .map((item) => `<li style="margin:6px 0;">🔁 ${item}</li>`)
    .join("");
  const launchChecklistHtml = (data.conversion_booster?.launch_checklist ?? [])
    .map((item) => `<li style="margin:6px 0;">✅ ${item}</li>`)
    .join("");

  // Hero headline with bold word
  let heroHeadline = data.hero.headline;
  if (data.hero.bold_word) {
    heroHeadline = heroHeadline.replace(
      new RegExp(data.hero.bold_word, "i"),
      `<em style="font-weight:900;font-style:italic;">${data.hero.bold_word}</em>`
    );
  }

  const discount =
    data.product.compare_at_price > 0
      ? Math.round(
          (1 - data.product.price / data.product.compare_at_price) * 100
        )
      : 0;

  return `
<!-- Description -->
<div style="padding:16px 0;">
  <p style="font-size:14px;color:#4b5563;line-height:1.7;">${data.product.short_description}</p>
</div>

<!-- Advantages -->
<div style="padding:20px 0;">
  <p style="font-size:15px;font-weight:600;margin-bottom:12px;">${data.advantages.title}</p>
  <div style="display:flex;flex-wrap:wrap;gap:6px;">${featuresBadges}</div>
</div>

<!-- Trust Badges -->
<div style="text-align:center;padding:16px 0;">
  ${trustBadgesHtml}
</div>

<!-- Social Proof -->
<div style="text-align:center;padding:12px;background:#fef9c3;border-radius:8px;margin:16px 0;">
  <span style="color:#eab308;font-size:16px;">${stars}</span>
  <strong> ${data.review.label}</strong> | Noté ${data.review.rating} (${data.review.count.toLocaleString("fr-FR")} clients satisfaits)
</div>

<!-- Hero Section -->
<div style="text-align:center;padding:32px 16px;background:#f9fafb;border-radius:12px;margin:24px 0;">
  <h2 style="font-size:22px;font-weight:700;line-height:1.3;margin-bottom:8px;">${heroHeadline}</h2>
  <p style="font-size:13px;color:#9ca3af;">${data.hero.subtext}</p>
</div>

<!-- Timeline -->
<div style="padding:24px 0;">
  <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Votre expérience</h3>
  ${timelineHtml}
</div>

<!-- Comparison -->
<div style="padding:24px 0;">
  <h3 style="text-align:center;font-size:18px;font-weight:700;margin-bottom:4px;">Face à la concurrence</h3>
  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-bottom:16px;">Comparez et découvrez la différence</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:10px;"></th>
        <th style="padding:10px;font-size:12px;font-weight:700;">${data.comparison.our_name}<br><small style="color:#9ca3af;">${data.comparison.our_subtitle}</small></th>
        <th style="padding:10px;font-size:12px;font-weight:700;">${data.comparison.other_name}</th>
      </tr>
    </thead>
    <tbody>${compRows}</tbody>
  </table>
</div>

<!-- Statistics -->
<div style="padding:24px 0;background:#f9fafb;border-radius:12px;margin:16px 0;">
  ${statsHtml}
</div>

<!-- FAQ -->
<div style="padding:24px 0;">
  <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Questions fréquentes</h3>
  ${faqHtml}
</div>

${
  offersHtml
    ? `<div style="padding:16px 0;">
  <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;">Offres recommandées</h3>
  <ul style="padding-left:18px;">${offersHtml}</ul>
</div>`
    : ""
}

${
  objectionsHtml
    ? `<div style="padding:16px 0;">
  <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;">Objections traitées</h3>
  <ul style="padding-left:18px;">${objectionsHtml}</ul>
</div>`
    : ""
}

${
  upsellHtml || crossSellHtml
    ? `<div style="padding:16px 0;background:#f9fafb;border-radius:12px;">
  <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;">Upsell & Cross-sell</h3>
  ${upsellHtml ? `<p style="font-weight:600;margin:6px 0;">Upsell</p><ul style="padding-left:18px;">${upsellHtml}</ul>` : ""}
  ${crossSellHtml ? `<p style="font-weight:600;margin:12px 0 6px;">Cross-sell</p><ul style="padding-left:18px;">${crossSellHtml}</ul>` : ""}
</div>`
    : ""
}

${
  launchChecklistHtml
    ? `<div style="padding:16px 0;">
  <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;">Checklist lancement</h3>
  <ul style="padding-left:18px;">${launchChecklistHtml}</ul>
</div>`
    : ""
}

${
  discount > 0
    ? `<!-- Savings Badge -->
<div style="text-align:center;padding:16px;background:${color};color:white;border-radius:8px;margin:16px 0;">
  <strong style="font-size:16px;">🔥 ÉCONOMISEZ ${discount}% — Offre limitée !</strong>
</div>`
    : ""
}
`.trim();
}
