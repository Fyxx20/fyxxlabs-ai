import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createShopifyProduct,
  createShopifyCollection,
} from "@/lib/connectors/shopify";
import { callOpenAIJson } from "@/lib/ai/openaiClient";
import * as cheerio from "cheerio";

export const maxDuration = 60;

/* ─── Shared scraper (same as import-product) ─── */

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

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
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

/* ─── Multi-strategy fetch for AliExpress ─── */
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
  ];

  for (const s of strategies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(s.url, { signal: controller.signal, headers: s.headers, redirect: 'follow' });
      clearTimeout(timeout);
      const html = await res.text();
      const hasData = html.includes('og:title') || html.includes('imagePathList') || html.includes('runParams');
      const isBlocked = html.includes('Just a moment') || html.includes('cf-browser-verification') || html.includes('challenge-form');
      if (hasData && !isBlocked && html.length > 5000) return html;
    } catch { /* next strategy */ }
  }
  return null;
}

/* ─── AliExpress-specific: extract data from inline JS ─── */
function extractAliExpressData(html: string, url: string): Partial<ScrapedProduct> | null {
  const partial: Partial<ScrapedProduct> = {};

  const imgMatch = html.match(/"imagePathList":\s*\[([^\]]+)\]/);
  if (imgMatch) {
    const imgs = imgMatch[1].match(/"(https?:\/\/[^"]+)"/g)?.map(s => s.replace(/"/g, ''));
    if (imgs && imgs.length > 0) partial.images = imgs.slice(0, 8);
  }

  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]*content="([^"]+)"/);
  if (ogTitle) {
    partial.title = ogTitle[1].replace(/\s*[-|]\s*(AliExpress|Aliexpress).*$/i, '').replace(/\s+\d{6,}$/, '').trim();
  }
  if (!partial.title || partial.title.length < 5) {
    const subjectMatch = html.match(/"subject"\s*:\s*"([^"]+)"/);
    if (subjectMatch) partial.title = subjectMatch[1].trim();
  }

  const pricePatterns = [/"formattedPrice"\s*:\s*"([^"]+)"/, /"minPrice"\s*:\s*"([^"]+)"/, /"discountPrice"\s*:\s*"([^"]+)"/];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) { const c = m[1].replace(/[^\d.,]/g, '').replace(',', '.'); if (c && parseFloat(c) > 0) { partial.price = c; break; } }
  }

  if (url.includes('fr.aliexpress')) partial.currency = 'EUR'; else partial.currency = 'USD';

  const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]*content="([^"]+)"/);
  if (ogDesc) partial.description = ogDesc[1].trim();

  const catMatch = html.match(/"categoryName"\s*:\s*"([^"]+)"/);
  if (catMatch) partial.category = catMatch[1];

  if (partial.title && partial.title.length >= 3) return partial;
  return null;
}

async function fetchAliExpressMobile(url: string): Promise<ScrapedProduct | null> {
  const idMatch = url.match(/\/item\/(\d+)/);
  if (!idMatch) return null;
  try {
    const mobileUrl = `https://m.aliexpress.com/item/${idMatch[1]}.html`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(mobileUrl, {
      signal: controller.signal,
      headers: { ...BROWSER_HEADERS, 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const html = await res.text();
    const aliData = extractAliExpressData(html, url);
    if (aliData?.title) {
      return { title: aliData.title, description: aliData.description ?? '', price: aliData.price ?? null, currency: aliData.currency ?? 'EUR', images: aliData.images ?? [], brand: null, category: aliData.category ?? null, url };
    }
  } catch { /* ignore */ }
  return null;
}

function scrapeProduct(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    "";
  title = title.replace(/\s*[-|]\s*(AliExpress|Amazon|Temu|eBay|Alibaba).*$/i, "").trim();
  // Remove trailing AliExpress product ID
  title = title.replace(/\s+\d{6,}$/, '').trim();

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
        const prod = json["@graph"].find((g: Record<string, unknown>) => g["@type"] === "Product");
        if (prod) jsonLd = prod;
      }
    } catch { /* ignore */ }
  });

  if (jsonLd != null) {
    if (!title && jsonLd.name) title = String(jsonLd.name);
    if (!description && jsonLd.description) description = String(jsonLd.description);
  }

  let price: string | null = null;
  let currency: string | null = null;
  if (jsonLd != null) {
    const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
    if (offers && typeof offers === "object") {
      price = String(offers.price ?? offers.lowPrice ?? "");
      currency = String(offers.priceCurrency ?? "");
    }
  }
  if (!price) {
    const m = html.match(/(\d+[.,]\d{1,2})\s*[€$£]|[€$£]\s*(\d+[.,]\d{1,2})/);
    if (m) price = (m[1] || m[2]).replace(",", ".");
  }

  // Images
  const images: string[] = [];
  const seenImgs = new Set<string>();
  const ogImg = $('meta[property="og:image"]').attr("content");
  if (ogImg) { seenImgs.add(ogImg); images.push(ogImg); }

  if (jsonLd?.image) {
    const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    for (const img of imgs) {
      const src = typeof img === "string" ? img : img?.url;
      if (src && typeof src === "string" && !seenImgs.has(src)) { seenImgs.add(src); images.push(src); }
    }
  }

  const gallerySelectors = [
    ".gallery img", ".product-images img", ".product-gallery img",
    '[class*="gallery"] img', '[class*="slider"] img', '[class*="carousel"] img',
    ".magnifier-image",
  ];
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const src = $(el).attr("data-src") || $(el).attr("data-zoom-image") || $(el).attr("src");
      if (src && src.startsWith("http") && !seenImgs.has(src) && images.length < 8) {
        seenImgs.add(src); images.push(src);
      }
    });
  }

  if (images.length < 3) {
    $("img").each((_, el) => {
      if (images.length >= 8) return;
      const src = $(el).attr("data-src") || $(el).attr("src");
      if (src && src.startsWith("http") && !seenImgs.has(src) && !/logo|icon|flag|sprite|avatar/i.test(src)) {
        seenImgs.add(src); images.push(src);
      }
    });
  }

  const brand = jsonLd?.brand
    ? (typeof jsonLd.brand === "string" ? jsonLd.brand : String(jsonLd.brand?.name ?? ""))
    : ($('[itemprop="brand"]').first().text().trim() || null);

  let category: string | null =
    $('[itemprop="category"]').first().text().trim() ||
    $(".breadcrumb a, .breadcrumbs a, [class*='breadcrumb'] a").last().text().trim() ||
    null;

  if (!description || description.length < 30) {
    const detailText = $(".product-description, .description, [itemprop='description']").first().text().trim();
    if (detailText && detailText.length > description.length) description = detailText.slice(0, 2000);
  }

  // AliExpress enrichment from inline JS
  const isAli = url.toLowerCase().includes('aliexpress');
  if (isAli) {
    const aliData = extractAliExpressData(html, url);
    if (aliData) {
      if ((!title || title.length < 3) && aliData.title) title = aliData.title;
      if ((!description || description.length < 10) && aliData.description) description = aliData.description ?? '';
      if (!price && aliData.price) price = aliData.price;
      if (!currency && aliData.currency) currency = aliData.currency;
      if (!category && aliData.category) category = aliData.category ?? null;
      if (images.length === 0 && aliData.images) {
        for (const img of aliData.images) { if (!seenImgs.has(img)) { seenImgs.add(img); images.push(img); } }
      }
    }
  }

  return { title, description, price, currency, images: images.slice(0, 8), brand, category, url };
}

/* ─── AI Prompts ─── */

const STORE_SYSTEM_PROMPT = `Tu es un expert dropshipping et e-commerce. Tu crées des boutiques Shopify complètes et professionnelles à partir d'un produit source.

MISSION: À partir d'un ou plusieurs produits scrapés, générer toute la structure d'une boutique Shopify prête à vendre.

Tu dois générer un JSON avec cette structure exacte:
{
  "store_concept": {
    "brand_name": "Nom de marque accrocheur (inventé, pas le nom du fournisseur)",
    "tagline": "Slogan court et mémorable",
    "niche": "Le créneau (ex: Tech, Mode, Maison, Fitness...)",
    "target_audience": "Cible visée",
    "brand_color": "Couleur principale hex (ex: #6C5CE7)"
  },
  "products": [
    {
      "source_index": 0,
      "title": "Titre optimisé pour conversion (max 70 chars)",
      "body_html": "Description HTML complète et persuasive (minimum 200 mots) avec <h3>, <ul><li>, <strong>, emojis",
      "seo_title": "Meta title SEO (max 60 chars)",
      "seo_description": "Meta description (max 155 chars)",
      "tags": "tag1, tag2, tag3",
      "product_type": "Type de produit",
      "suggested_price": "29.99",
      "compare_at_price": "49.99",
      "is_hero": true
    }
  ],
  "extra_products": [
    {
      "title": "Produit complémentaire suggéré",
      "body_html": "Description HTML complète",
      "tags": "tag1, tag2",
      "product_type": "Type",
      "suggested_price": "19.99",
      "compare_at_price": "34.99",
      "why": "Pourquoi ce produit complémentaire"
    }
  ],
  "collection": {
    "title": "Nom de la collection",
    "body_html": "Description HTML de la collection"
  }
}

RÈGLES:
- TOUJOURS répondre en français
- Le brand_name ne doit JAMAIS contenir le nom du fournisseur (AliExpress, Amazon, etc.)
- Génère 3-5 extra_products complémentaires au produit principal (accessoires, produits associés)
- Les extra_products doivent être réalistes et dans la même niche
- Les prix doivent avoir une marge x2-x3 si le prix source est connu
- Les descriptions doivent être riches, persuasives, avec des emojis ✨💪🎯
- Les body_html doivent contenir au minimum 150 mots chacun
- Utilise des mots puissants : Premium, Exclusif, Livraison Rapide, Satisfait ou Remboursé
- Ne mentionne JAMAIS le prix d'achat ou la plateforme source
- Réponds UNIQUEMENT en JSON valide`;

/* ─── POST handler ─── */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { action } = body as { action: string };

    /* ── Step 1: Scrape multiple URLs ── */
    if (action === "scrape") {
      const { urls } = body as { urls: string[] };
      if (!urls || urls.length === 0) {
        return NextResponse.json({ error: "Au moins un lien requis" }, { status: 400 });
      }
      if (urls.length > 5) {
        return NextResponse.json({ error: "Maximum 5 liens" }, { status: 400 });
      }

      const results: (ScrapedProduct | null)[] = [];
      for (const url of urls) {
        const isAli = url.toLowerCase().includes('aliexpress');
        try {
          let html: string | null = null;
          
          if (isAli) {
            html = await fetchWithStrategies(url.trim());
          }
          if (!html) {
            html = await fetchPage(url.trim());
          }
          
          const product = scrapeProduct(html, url.trim());
          if (product.title && product.title.length >= 3) {
            results.push(product);
          } else if (isAli) {
            const ali = await fetchAliExpressMobile(url.trim());
            results.push(ali);
          } else {
            results.push(null);
          }
        } catch {
          if (isAli) {
            const ali = await fetchAliExpressMobile(url.trim());
            results.push(ali);
          } else {
            results.push(null);
          }
        }
      }

      const scraped = results.filter(Boolean) as ScrapedProduct[];
      if (scraped.length === 0) {
        return NextResponse.json({ error: "Impossible d'extraire les produits. Vérifiez les liens." }, { status: 422 });
      }

      return NextResponse.json({ products: scraped });
    }

    /* ── Step 2: AI generate full store ── */
    if (action === "generate") {
      const { scrapedProducts } = body as { scrapedProducts: ScrapedProduct[] };
      if (!scrapedProducts || scrapedProducts.length === 0) {
        return NextResponse.json({ error: "Produits manquants" }, { status: 400 });
      }

      const productDescriptions = scrapedProducts.map((p, i) => `
PRODUIT ${i + 1}:
- Titre: ${p.title}
- Description: ${p.description.slice(0, 800)}
- Prix source: ${p.price ? `${p.price} ${p.currency ?? ""}` : "Inconnu"}
- Marque: ${p.brand ?? "Inconnue"}
- Catégorie: ${p.category ?? "Inconnue"}
- Images: ${p.images.length}
`).join("\n");

      const userPrompt = `Voici ${scrapedProducts.length} produit(s) source. Génère une boutique Shopify complète.

${productDescriptions}

Génère le JSON avec: store_concept, products (optimisés pour chaque source), extra_products (3-5 complémentaires), et collection.`;

      try {
        const result = await callOpenAIJson({
          system: STORE_SYSTEM_PROMPT,
          user: userPrompt,
          temperature: 0.6,
          maxTokens: 4000,
        });

        return NextResponse.json({ store: result, sourceProducts: scrapedProducts });
      } catch (err) {
        return NextResponse.json(
          { error: `Erreur IA : ${err instanceof Error ? err.message : "Inconnue"}` },
          { status: 500 }
        );
      }
    }

    /* ── Step 3: Create everything on Shopify (SSE streaming) ── */
    if (action === "create") {
      const { storeId, storeData, sourceProducts } = body as {
        storeId: string;
        storeData: {
          store_concept: { brand_name: string; tagline: string; niche: string };
          products: Array<{
            source_index: number;
            title: string;
            body_html: string;
            tags: string;
            product_type: string;
            suggested_price: string;
            compare_at_price: string;
          }>;
          extra_products: Array<{
            title: string;
            body_html: string;
            tags: string;
            product_type: string;
            suggested_price: string;
            compare_at_price: string;
          }>;
          collection: { title: string; body_html: string };
        };
        sourceProducts: ScrapedProduct[];
      };

      if (!storeId || !storeData) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
      }

      // Verify store ownership
      const { data: store } = await supabase
        .from("stores")
        .select("id, user_id")
        .eq("id", storeId)
        .single();
      if (!store || store.user_id !== user.id) {
        return NextResponse.json({ error: "Boutique non trouvée" }, { status: 403 });
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
        return NextResponse.json({ error: "Shopify non connecté" }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const totalSteps = storeData.products.length + storeData.extra_products.length + 1; // +1 for collection

      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          const createdProductIds: number[] = [];
          const results: Array<{ title: string; success: boolean; error?: string; productId?: number }> = [];
          let current = 0;

          // Create main products (with source images)
          for (const prod of storeData.products) {
            current++;
            const percent = Math.round((current / totalSteps) * 100);
            send({ type: "progress", current, total: totalSteps, percent, label: `📦 ${prod.title}` });

            const sourceImages = sourceProducts[prod.source_index]?.images ?? [];
            const res = await createShopifyProduct(storeId, {
              title: prod.title,
              body_html: prod.body_html,
              product_type: prod.product_type,
              tags: prod.tags,
              images: sourceImages.slice(0, 6).map((src) => ({ src })),
              variants: [{
                price: prod.suggested_price,
                compare_at_price: prod.compare_at_price || undefined,
                title: "Default",
              }],
            });
            results.push({ title: prod.title, success: res.success, error: res.error, productId: res.productId });
            if (res.success && res.productId) createdProductIds.push(res.productId);
          }

          // Create extra products
          for (const extra of storeData.extra_products) {
            current++;
            const percent = Math.round((current / totalSteps) * 100);
            send({ type: "progress", current, total: totalSteps, percent, label: `🛒 ${extra.title}` });

            const res = await createShopifyProduct(storeId, {
              title: extra.title,
              body_html: extra.body_html,
              product_type: extra.product_type,
              tags: extra.tags,
              variants: [{
                price: extra.suggested_price,
                compare_at_price: extra.compare_at_price || undefined,
                title: "Default",
              }],
            });
            results.push({ title: extra.title, success: res.success, error: res.error, productId: res.productId });
            if (res.success && res.productId) createdProductIds.push(res.productId);
          }

          // Create collection
          current++;
          send({ type: "progress", current, total: totalSteps, percent: 95, label: `📁 Collection : ${storeData.collection?.title ?? ""}` });

          let collectionResult = null;
          if (createdProductIds.length > 0 && storeData.collection) {
            collectionResult = await createShopifyCollection(
              storeId,
              { title: storeData.collection.title, body_html: storeData.collection.body_html },
              createdProductIds
            );
          }

          // Final done event
          send({
            type: "done",
            success: true,
            brand_name: storeData.store_concept.brand_name,
            products: results,
            collection: collectionResult,
            total_created: createdProductIds.length,
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

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("[generate-store]", err);
    return NextResponse.json(
      { error: `Erreur serveur : ${err instanceof Error ? err.message : "Inconnue"}` },
      { status: 500 }
    );
  }
}
