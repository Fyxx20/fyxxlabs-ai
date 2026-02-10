import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createShopifyProduct } from "@/lib/connectors/shopify";
import { isOpenAIAvailable, callOpenAIJson } from "@/lib/ai/openaiClient";
import * as cheerio from "cheerio";

export const maxDuration = 60;

/* ─── Scrape product data from any URL ─── */

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
  specs: Record<string, string>;
  brand: string | null;
  category: string | null;
  url: string;
  source: string; // "aliexpress" | "amazon" | "generic"
}

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
    if (res.ok || ct.includes("text/html")) {
      return await res.text();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/* ─── Multi-strategy fetch for blocked sites (AliExpress, etc.) ─── */
async function fetchWithStrategies(url: string): Promise<string | null> {
  const strategies = [
    { label: 'desktop', url, headers: BROWSER_HEADERS },
    { label: 'googlebot', url: url.replace('fr.aliexpress.com', 'www.aliexpress.com'), headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html',
    }},
    { label: 'mobile', url: url.replace(/https?:\/\/[^/]*aliexpress\.com/, 'https://m.aliexpress.com'), headers: {
      ...BROWSER_HEADERS,
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    }},
    { label: 'minimal', url: url.replace('fr.aliexpress.com', 'www.aliexpress.com'), headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
    }},
  ];

  for (const s of strategies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(s.url, { signal: controller.signal, headers: s.headers, redirect: 'follow' });
      clearTimeout(timeout);
      const html = await res.text();
      console.log(`[fetchWithStrategies] ${s.label}: status=${res.status} len=${html.length}`);
      
      // Check if it's a real page (has og:title or imagePathList or product data)
      const hasData = html.includes('og:title') || html.includes('imagePathList') || html.includes('runParams');
      const isBlocked = html.includes('Just a moment') || html.includes('cf-browser-verification') || html.includes('challenge-form');
      
      if (hasData && !isBlocked && html.length > 5000) {
        console.log(`[fetchWithStrategies] ${s.label}: SUCCESS → using this response`);
        return html;
      }
      console.log(`[fetchWithStrategies] ${s.label}: SKIP (hasData=${hasData}, isBlocked=${isBlocked})`);
    } catch (err) {
      console.log(`[fetchWithStrategies] ${s.label}: ERROR ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }
  return null;
}

function detectSource(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("aliexpress")) return "aliexpress";
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("temu")) return "temu";
  if (lower.includes("alibaba")) return "alibaba";
  if (lower.includes("ebay")) return "ebay";
  return "generic";
}

/* ─── AliExpress-specific: extract data from inline JS (CSR page) ─── */
function extractAliExpressData(html: string, url: string): Partial<ScrapedProduct> | null {
  const partial: Partial<ScrapedProduct> = {};

  // Images from imagePathList
  const imgMatch = html.match(/"imagePathList":\s*\[([^\]]+)\]/);
  if (imgMatch) {
    const imgs = imgMatch[1].match(/"(https?:\/\/[^"]+)"/g)?.map(s => s.replace(/"/g, ''));
    if (imgs && imgs.length > 0) partial.images = imgs.slice(0, 8);
  }

  // Title from og:title or summImagePathList alt or name in script
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]*content="([^"]+)"/);
  if (ogTitle) {
    partial.title = ogTitle[1]
      .replace(/\s*[-|]\s*(AliExpress|Aliexpress).*$/i, '')
      .replace(/\s+\d{6,}$/, '') // remove trailing product ID
      .trim();
  }
  // Also try script-embedded title
  if (!partial.title || partial.title.length < 5) {
    const subjectMatch = html.match(/"subject"\s*:\s*"([^"]+)"/);
    if (subjectMatch) partial.title = subjectMatch[1].trim();
  }
  // Title from URL-encoded image alt text in summImagePathList
  if (!partial.title || partial.title.length < 5) {
    const summMatch = html.match(/"summImagePathList":\s*\["([^"]+)"/);
    if (summMatch) {
      const decoded = decodeURIComponent(summMatch[1].split('/').pop()?.replace(/\.jpg.*$/, '').replace(/-/g, ' ') ?? '');
      if (decoded.length > 10) partial.title = decoded;
    }
  }

  // Price from various script patterns
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
      const cleaned = m[1].replace(/[^\d.,]/g, '').replace(',', '.');
      if (cleaned && parseFloat(cleaned) > 0) {
        partial.price = cleaned;
        break;
      }
    }
  }

  // Currency
  const currMatch = html.match(/"currencyCode"\s*:\s*"([A-Z]{3})"/);
  if (currMatch) partial.currency = currMatch[1];
  if (!partial.currency) {
    if (url.includes('fr.aliexpress')) partial.currency = 'EUR';
    else partial.currency = 'USD';
  }

  // Category
  const catMatch = html.match(/"categoryName"\s*:\s*"([^"]+)"/);
  if (catMatch) partial.category = catMatch[1];

  // Description from og:description
  const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]*content="([^"]+)"/);
  if (ogDesc) partial.description = ogDesc[1].trim();

  // Only return if we got at least a title
  if (partial.title && partial.title.length >= 3) return partial;
  return null;
}

/* ─── AliExpress API fallback: fetch item via mobile + Googlebot ─── */
async function fetchAliExpressAPI(url: string): Promise<ScrapedProduct | null> {
  // Extract item ID from URL
  const idMatch = url.match(/\/item\/(\d+)/);
  if (!idMatch) return null;
  const itemId = idMatch[1];

  // Strategy 1: Mobile page (lighter, less blocking)
  const mobileFetch = async (): Promise<ScrapedProduct | null> => {
    try {
      const mobileUrl = `https://m.aliexpress.com/item/${itemId}.html`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(mobileUrl, {
        signal: controller.signal,
        headers: {
          ...BROWSER_HEADERS,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      const html = await res.text();
      console.log('[AliExpress mobile] status:', res.status, 'len:', html.length);
      const aliData = extractAliExpressData(html, url);
      if (aliData?.title) {
        return {
          title: aliData.title,
          description: aliData.description ?? '',
          price: aliData.price ?? null,
          currency: aliData.currency ?? 'EUR',
          images: aliData.images ?? [],
          specs: {},
          brand: null,
          category: aliData.category ?? null,
          url,
          source: 'aliexpress',
        };
      }
    } catch (e) { console.log('[AliExpress mobile] error:', e instanceof Error ? e.message : e); }
    return null;
  };

  // Strategy 2: Googlebot UA (sites don't block Google)
  const googlebotFetch = async (): Promise<ScrapedProduct | null> => {
    try {
      const gUrl = `https://www.aliexpress.com/item/${itemId}.html`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(gUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      const html = await res.text();
      console.log('[AliExpress googlebot] status:', res.status, 'len:', html.length);
      const aliData = extractAliExpressData(html, url);
      if (aliData?.title) {
        return {
          title: aliData.title,
          description: aliData.description ?? '',
          price: aliData.price ?? null,
          currency: aliData.currency ?? 'EUR',
          images: aliData.images ?? [],
          specs: {},
          brand: null,
          category: aliData.category ?? null,
          url,
          source: 'aliexpress',
        };
      }
    } catch (e) { console.log('[AliExpress googlebot] error:', e instanceof Error ? e.message : e); }
    return null;
  };

  // Try mobile first, then Googlebot
  return await mobileFetch() ?? await googlebotFetch();
}

function scrapeProduct(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);
  const source = detectSource(url);

  // Title
  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    "";
  // Clean title (remove "| AliExpress", "- Amazon", etc.)
  title = title
    .replace(/\s*[-|]\s*(AliExpress|Amazon|Temu|eBay|Alibaba).*$/i, "")
    .replace(/\s+\d{6,}$/, "") // remove trailing product ID (AliExpress)
    .trim();

  // Description
  let description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";

  // Try JSON-LD for richer data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonLdProduct: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "");
      if (json["@type"] === "Product") jsonLdProduct = json;
      if (Array.isArray(json["@graph"])) {
        const prod = json["@graph"].find(
          (g: Record<string, unknown>) => g["@type"] === "Product"
        );
        if (prod) jsonLdProduct = prod;
      }
    } catch {
      /* ignore */
    }
  });

  if (jsonLdProduct != null) {
    if (!title && jsonLdProduct.name) title = String(jsonLdProduct.name);
    if (!description && jsonLdProduct.description)
      description = String(jsonLdProduct.description);
  }

  // Price
  let price: string | null = null;
  let currency: string | null = null;

  if (jsonLdProduct != null) {
    const offers = Array.isArray(jsonLdProduct.offers)
      ? jsonLdProduct.offers[0]
      : jsonLdProduct.offers;
    if (offers && typeof offers === "object") {
      const o = offers as Record<string, unknown>;
      price = String(o.price ?? o.lowPrice ?? "");
      currency = String(o.priceCurrency ?? "");
    }
  }

  if (!price) {
    const priceEl = $(
      '[data-price], .product-price, .price, [class*="price"], [itemprop="price"]'
    ).first();
    const priceText = priceEl.attr("content") || priceEl.text();
    const m = priceText?.match(/(\d+[.,]\d{1,2})/);
    if (m) price = m[1].replace(",", ".");
  }

  // Currency fallback
  if (!currency) {
    const currEl = $('[itemprop="priceCurrency"]').first();
    currency = currEl.attr("content") || null;
    if (!currency) {
      if (/€/.test(html.slice(0, 5000))) currency = "EUR";
      else if (/\$/.test(html.slice(0, 5000))) currency = "USD";
      else if (/£/.test(html.slice(0, 5000))) currency = "GBP";
    }
  }

  // Images
  const images: string[] = [];
  const seenImgs = new Set<string>();

  // OG image first
  const ogImg = $('meta[property="og:image"]').attr("content");
  if (ogImg && !seenImgs.has(ogImg)) {
    seenImgs.add(ogImg);
    images.push(ogImg);
  }

  // JSON-LD images
  if (jsonLdProduct?.image) {
    const imgs = Array.isArray(jsonLdProduct.image)
      ? jsonLdProduct.image
      : [jsonLdProduct.image];
    for (const img of imgs) {
      const src = typeof img === "string" ? img : (img as Record<string, unknown>)?.url;
      if (src && typeof src === "string" && !seenImgs.has(src)) {
        seenImgs.add(src);
        images.push(src);
      }
    }
  }

  // Gallery images
  const gallerySelectors = [
    ".gallery img",
    ".product-images img",
    ".product-gallery img",
    '[class*="gallery"] img',
    '[class*="slider"] img',
    '[class*="carousel"] img',
    '[data-role="image"] img',
    ".image-view img",
    ".magnifier-image",
  ];
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const src =
        $(el).attr("data-src") ||
        $(el).attr("data-zoom-image") ||
        $(el).attr("data-large") ||
        $(el).attr("src");
      if (src && src.startsWith("http") && !seenImgs.has(src) && images.length < 10) {
        seenImgs.add(src);
        images.push(src);
      }
    });
  }

  // Generic large images if still none
  if (images.length < 3) {
    $("img").each((_, el) => {
      if (images.length >= 10) return;
      const src = $(el).attr("data-src") || $(el).attr("src");
      const width = parseInt($(el).attr("width") ?? "0", 10);
      const height = parseInt($(el).attr("height") ?? "0", 10);
      if (
        src &&
        src.startsWith("http") &&
        !seenImgs.has(src) &&
        (width > 200 || height > 200 || (!width && !height))
      ) {
        // Skip tiny icons / logos
        if (/logo|icon|flag|sprite|avatar/i.test(src)) return;
        seenImgs.add(src);
        images.push(src);
      }
    });
  }

  // Specs / attributes
  const specs: Record<string, string> = {};
  $(
    "table.product-specs tr, table.specification tr, .detail-value, [class*='spec'] tr, [class*='attribute'] tr"
  ).each((_, el) => {
    const cells = $(el).find("td, th");
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const val = $(cells[1]).text().trim();
      if (key && val && key.length < 60) specs[key] = val;
    }
  });

  // Brand
  let brand: string | null = null;
  if (jsonLdProduct?.brand) {
    brand =
      typeof jsonLdProduct.brand === "string"
        ? jsonLdProduct.brand
        : String(
            (jsonLdProduct.brand as Record<string, unknown>)?.name ?? ""
          ) || null;
  }
  if (!brand) {
    brand =
      $('[itemprop="brand"]').first().text().trim() ||
      $(".brand, .product-brand, [class*='brand']")
        .first()
        .text()
        .trim() ||
      null;
  }

  // Category
  let category: string | null =
    $('[itemprop="category"]').first().text().trim() ||
    $(".breadcrumb a, .breadcrumbs a, [class*='breadcrumb'] a")
      .last()
      .text()
      .trim() ||
    null;

  // Fallback description from product detail
  if (!description || description.length < 30) {
    const detailText = $(
      ".product-description, .product-detail, .description, [class*='description'], [itemprop='description']"
    )
      .first()
      .text()
      .trim();
    if (detailText && detailText.length > description.length) {
      description = detailText.slice(0, 2000);
    }
  }

  // ─── AliExpress enrichment: extract data from inline JS ───
  if (source === 'aliexpress') {
    const aliData = extractAliExpressData(html, url);
    if (aliData) {
      if ((!title || title.length < 3) && aliData.title) title = aliData.title;
      if ((!description || description.length < 10) && aliData.description) description = aliData.description;
      if (!price && aliData.price) price = aliData.price;
      if (!currency && aliData.currency) currency = aliData.currency;
      if (!category && aliData.category) category = aliData.category;
      if (images.length === 0 && aliData.images) {
        for (const img of aliData.images) {
          if (!seenImgs.has(img)) { seenImgs.add(img); images.push(img); }
        }
      }
    }
  }

  return {
    title,
    description,
    price: price || null,
    currency: currency || null,
    images: images.slice(0, 8),
    specs,
    brand,
    category,
    url,
    source,
  };
}

/* ─── AI Prompt to generate Shopify-ready product ─── */

const IMPORT_SYSTEM_PROMPT = `Tu es un expert en e-commerce et copywriting. Tu transformes des données produit brutes en fiches produit Shopify optimisées pour la conversion.

MISSION: À partir des données d'un produit source (AliExpress, Amazon, etc.), créer une fiche produit professionnelle, persuasive et SEO-friendly.

Tu dois générer:
1. "title": Titre optimisé (max 70 chars, accrocheur, bénéfice principal)
2. "body_html": Description HTML complète et persuasive avec:
   - Accroche émotionnelle en haut
   - Liste à puces des bénéfices (pas juste caractéristiques)
   - Détails techniques si pertinent
   - Preuve sociale implicite ("Déjà adopté par des milliers de clients")
   - Bien structuré avec <h3>, <ul><li>, <p>, <strong>
3. "seo_title": Titre SEO (max 60 chars)
4. "seo_description": Meta description SEO (max 155 chars, avec appel à l'action)
5. "tags": Tags/catégories pertinents (séparés par virgules)
6. "product_type": Type de produit Shopify
7. "suggested_price": Prix de vente suggéré (marge ~2-3x si prix source connu, sinon estimation marché)
8. "compare_at_price": Ancien prix barré (pour afficher une réduction)
9. "improvements": Liste des améliorations apportées

RÈGLES:
- TOUJOURS rédiger en français
- Supprime toute référence à la plateforme source (AliExpress, Amazon, etc.)
- Ne mentionne JAMAIS le prix d'achat / prix source
- Utilise des mots puissants : Premium, Exclusif, Livraison Rapide
- Ajoute des emojis pertinents dans la description ✨🎯💪
- Le body_html doit faire au minimum 200 mots
- Réponds UNIQUEMENT en JSON valide`;

/* ─── POST : scrape + AI generate + optionally import ─── */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { action, productUrl, storeId, generatedProduct } = body as {
      action: "scrape" | "generate" | "import";
      productUrl?: string;
      storeId?: string;
      generatedProduct?: {
        title: string;
        body_html: string;
        seo_title: string;
        seo_description: string;
        tags: string;
        product_type: string;
        suggested_price: string;
        compare_at_price: string;
        images: string[];
      };
    };

    /* ── Step 1: Scrape ── */
    if (action === "scrape") {
      if (!productUrl) {
        return NextResponse.json(
          { error: "URL du produit requise" },
          { status: 400 }
        );
      }

      try {
        const isAli = detectSource(productUrl) === 'aliexpress';
        let html: string | null = null;
        
        if (isAli) {
          // AliExpress: try multiple strategies (datacenter IPs often blocked)
          html = await fetchWithStrategies(productUrl);
        }
        
        if (!html) {
          html = await fetchPage(productUrl);
        }

        let product = scrapeProduct(html, productUrl);

        // If title extraction failed, try AliExpress mobile fallback
        if ((!product.title || product.title.length < 3) && isAli) {
          const aliProduct = await fetchAliExpressAPI(productUrl);
          if (aliProduct) product = aliProduct;
        }

        if (!product.title || product.title.length < 3) {
          console.log('[import-product] scrape failed, title:', JSON.stringify(product.title), 'images:', product.images.length);
          return NextResponse.json(
            {
              error:
                "Impossible d'extraire les données du produit. Vérifiez l'URL.",
            },
            { status: 422 }
          );
        }

        return NextResponse.json({ product });
      } catch (err) {
        console.log('[import-product] fetch error:', err instanceof Error ? err.message : err);
        // On fetch error, try AliExpress fallback if applicable
        if (detectSource(productUrl) === 'aliexpress') {
          const aliProduct = await fetchAliExpressAPI(productUrl);
          if (aliProduct) return NextResponse.json({ product: aliProduct });
        }
        return NextResponse.json(
          {
            error: `Erreur lors du scraping : ${err instanceof Error ? err.message : "Inconnue"}`,
          },
          { status: 500 }
        );
      }
    }

    /* ── Step 2: AI Generate ── */
    if (action === "generate") {
      if (!body.scrapedProduct) {
        return NextResponse.json(
          { error: "Données produit manquantes" },
          { status: 400 }
        );
      }

      if (!isOpenAIAvailable()) {
        return NextResponse.json(
          { error: "OpenAI non configuré" },
          { status: 500 }
        );
      }

      const scraped = body.scrapedProduct as ScrapedProduct;

      const userPrompt = `Voici les données du produit source (${scraped.source}) :

TITRE: ${scraped.title}
DESCRIPTION: ${scraped.description.slice(0, 1500)}
PRIX SOURCE: ${scraped.price ? `${scraped.price} ${scraped.currency ?? ""}` : "Non disponible"}
MARQUE: ${scraped.brand ?? "Non spécifiée"}
CATÉGORIE: ${scraped.category ?? "Non spécifiée"}
SPÉCIFICATIONS: ${Object.entries(scraped.specs).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join(", ") || "Aucune"}
NOMBRE D'IMAGES: ${scraped.images.length}

Génère la fiche produit Shopify optimisée en JSON avec les champs: title, body_html, seo_title, seo_description, tags, product_type, suggested_price, compare_at_price, improvements.`;

      try {
        const result = await callOpenAIJson({
          system: IMPORT_SYSTEM_PROMPT,
          user: userPrompt,
          temperature: 0.5,
          maxTokens: 3000,
        });

        return NextResponse.json({
          generated: result,
          images: scraped.images,
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

    /* ── Step 3: Import to Shopify ── */
    if (action === "import") {
      if (!storeId || !generatedProduct) {
        return NextResponse.json(
          { error: "storeId et produit requis" },
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

      const result = await createShopifyProduct(storeId, {
        title: generatedProduct.title,
        body_html: generatedProduct.body_html,
        product_type: generatedProduct.product_type || undefined,
        tags: generatedProduct.tags || undefined,
        images: generatedProduct.images.map((src) => ({ src })),
        variants: [
          {
            price: generatedProduct.suggested_price,
            compare_at_price: generatedProduct.compare_at_price || undefined,
            title: "Default",
          },
        ],
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error ?? "Erreur Shopify" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        productId: result.productId,
        handle: result.handle,
      });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("[import-product]", err);
    return NextResponse.json(
      {
        error: `Erreur serveur : ${err instanceof Error ? err.message : "Inconnue"}`,
      },
      { status: 500 }
    );
  }
}
