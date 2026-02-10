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

function detectSource(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("aliexpress")) return "aliexpress";
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("temu")) return "temu";
  if (lower.includes("alibaba")) return "alibaba";
  if (lower.includes("ebay")) return "ebay";
  return "generic";
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
  const category =
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
        const html = await fetchPage(productUrl);
        const product = scrapeProduct(html, productUrl);

        if (!product.title || product.title.length < 3) {
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
