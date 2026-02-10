import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createShopifyProduct } from "@/lib/connectors/shopify";
import { callOpenAIJson } from "@/lib/ai/openaiClient";
import * as cheerio from "cheerio";

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
    { label: "desktop", url, headers: BROWSER_HEADERS },
    {
      label: "googlebot",
      url: url.replace("fr.aliexpress.com", "www.aliexpress.com"),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
    },
    {
      label: "mobile",
      url: url.replace(
        /https?:\/\/[^/]*aliexpress\.com/,
        "https://m.aliexpress.com"
      ),
      headers: {
        ...BROWSER_HEADERS,
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    },
  ];

  for (const s of strategies) {
    try {
      console.log(`[fetchWithStrategies] Trying ${s.label}: ${s.url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
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
        html.includes("runParams");
      const isBlocked =
        html.includes("Just a moment") ||
        html.includes("cf-browser-verification") ||
        html.includes("challenge-form");
      console.log(
        `[fetchWithStrategies] ${s.label}: len=${html.length} hasData=${hasData} isBlocked=${isBlocked}`
      );
      if (hasData && !isBlocked && html.length > 5000) return html;
    } catch (err) {
      console.log(`[fetchWithStrategies] ${s.label} failed: ${err}`);
    }
  }
  return null;
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

  const pricePatterns = [
    /"formattedPrice"\s*:\s*"([^"]+)"/,
    /"minPrice"\s*:\s*"([^"]+)"/,
    /"discountPrice"\s*:\s*"([^"]+)"/,
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

  if (url.includes("fr.aliexpress")) partial.currency = "EUR";
  else partial.currency = "USD";

  const ogDesc = html.match(
    /<meta[^>]+property="og:description"[^>]*content="([^"]+)"/
  );
  if (ogDesc) partial.description = ogDesc[1].trim();

  const catMatch = html.match(/"categoryName"\s*:\s*"([^"]+)"/);
  if (catMatch) partial.category = catMatch[1];

  if (partial.title && partial.title.length >= 3) return partial;
  return null;
}

async function fetchAliExpressMobile(
  url: string
): Promise<ScrapedProduct | null> {
  const idMatch = url.match(/\/item\/(\d+)/);
  if (!idMatch) return null;
  try {
    const mobileUrl = `https://m.aliexpress.com/item/${idMatch[1]}.html`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(mobileUrl, {
      signal: controller.signal,
      headers: {
        ...BROWSER_HEADERS,
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const html = await res.text();
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
  } catch {
    /* ignore */
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
    const aliData = extractAliExpressData(html, url);
    if (aliData) {
      if ((!title || title.length < 3) && aliData.title) title = aliData.title;
      if ((!description || description.length < 10) && aliData.description)
        description = aliData.description ?? "";
      if (!price && aliData.price) price = aliData.price;
      if (!currency && aliData.currency) currency = aliData.currency;
      if (!category && aliData.category) category = aliData.category ?? null;
      if (images.length === 0 && aliData.images) {
        for (const img of aliData.images) {
          if (!seenImgs.has(img)) {
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

const PAGE_SYSTEM_PROMPT = `Tu es un expert dropshipping, copywriting et conversion e-commerce. Tu génères des pages produit Shopify complètes et ultra-optimisées pour la conversion, similaires aux meilleures boutiques de dropshipping.

MISSION: À partir d'un produit scrapé, générer TOUTES les sections d'une page produit haute conversion.

Tu dois générer un JSON avec cette structure EXACTE:
{
  "brand_name": "Nom de marque inventé (court, mémorable, jamais le nom du fournisseur)",
  "brand_color": "#hexcolor (couleur qui correspond à la niche)",
  "banner_text": "Texte de la bannière promo (ex: Livraison gratuite dès 50€ | Livraison rapide dans le monde entier)",
  "product": {
    "title": "Titre optimisé pour conversion (max 60 chars, en français)",
    "price": 229.9,
    "compare_at_price": 569.9,
    "short_description": "Description persuasive courte (2-3 phrases, bénéfices concrets)",
    "features": ["Feature badge 1", "Feature badge 2", "Feature badge 3", "Feature badge 4", "Feature badge 5"],
    "tags": "tag1, tag2, tag3",
    "product_type": "Type de produit"
  },
  "review": {
    "rating": 4.8,
    "count": 21883,
    "label": "Excellent"
  },
  "hero": {
    "headline": "Phrase d'accroche puissante qui vend le produit (15-20 mots max)",
    "bold_word": "mot_clé_en_italique_gras",
    "subtext": "Sous-titre qui renforce le message principal (1 phrase)"
  },
  "timeline": [
    {"period": "Jour 1", "text": "Ce qui se passe dès réception"},
    {"period": "Première semaine", "text": "Bénéfice après 1 semaine"},
    {"period": "Après 2 semaines", "text": "Résultat visible"},
    {"period": "Après 1 mois", "text": "Bénéfice long terme"},
    {"period": "Toute la saison", "text": "Satisfaction durable"}
  ],
  "advantages": {
    "title": "Phrase qui résume les avantages clés du produit (accrocheur)",
    "items": ["Avantage 1 concret", "Avantage 2 concret", "Avantage 3", "Avantage 4", "Avantage 5"]
  },
  "comparison": {
    "our_name": "Notre [Produit]",
    "our_subtitle": "Original",
    "other_name": "Autres Marques",
    "rows": [
      {"feature": "Caractéristique 1 détaillée", "us": true, "them": false},
      {"feature": "Caractéristique 2 détaillée", "us": true, "them": false},
      {"feature": "Caractéristique 3 détaillée", "us": true, "them": false},
      {"feature": "Caractéristique 4", "us": true, "them": true},
      {"feature": "Caractéristique 5", "us": true, "them": false}
    ]
  },
  "statistics": [
    {"value": "95%", "label": "Statistique sociale persuasive 1"},
    {"value": "92%", "label": "Statistique sociale persuasive 2"},
    {"value": "88%", "label": "Statistique sociale persuasive 3"}
  ],
  "faq": [
    {"question": "Titre FAQ accrocheur qui interpelle", "answer": "Réponse qui rassure et vend (2-3 phrases)"},
    {"question": "Question sur la livraison", "answer": "Réponse rassurante"},
    {"question": "Question sur la qualité", "answer": "Réponse persuasive"}
  ],
  "trust_badges": ["Qualité garantie", "Retours 30 jours", "Livraison suivie"]
}

RÈGLES IMPORTANTES:
- TOUJOURS répondre dans la langue demandée (par défaut français)
- Le brand_name ne doit JAMAIS contenir le nom du fournisseur (AliExpress, Amazon, etc.)
- Les prix doivent avoir une marge x2-x3 par rapport au prix source si connu
- Les features et advantages doivent être des bénéfices CONCRETS pour le client
- La timeline doit raconter une histoire de transformation/satisfaction progressive
- La comparaison doit montrer notre supériorité tout en restant crédible (1-2 "them: true" pour la crédibilité)
- Les statistiques doivent être réalistes et persuasives (85-98%)
- Le hero headline doit être puissant et émotionnel avec UN mot clé en gras
- Le FAQ doit répondre aux objections courantes des clients
- NE JAMAIS mentionner le prix d'achat ou la plateforme source
- Réponds UNIQUEMENT en JSON valide
- Les descriptions doivent évoquer des émotions et des bénéfices, pas juste des caractéristiques techniques`;

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
        return NextResponse.json(
          { error: "Impossible d'extraire les produits. Vérifiez les liens." },
          { status: 422 }
        );
      }

      return NextResponse.json({ products: scraped });
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

      const langLabel =
        {
          fr: "français",
          en: "anglais",
          es: "espagnol",
          de: "allemand",
        }[language ?? "fr"] ?? "français";

      const userPrompt = `Génère une page produit complète et haute conversion en ${langLabel}.

PRODUIT SOURCE:
- Titre: ${scrapedProduct.title}
- Description: ${scrapedProduct.description?.slice(0, 1000) || "Non disponible"}
- Prix source: ${scrapedProduct.price ? `${scrapedProduct.price} ${scrapedProduct.currency ?? ""}` : "Inconnu"}
- Marque: ${scrapedProduct.brand ?? "Inconnue"}
- Catégorie: ${scrapedProduct.category ?? "Inconnue"}
- Nombre d'images: ${scrapedProduct.images?.length ?? 0}

${brandName && brandName !== "YOUR BRAND" ? `Le client souhaite utiliser le nom de marque: "${brandName}"` : "Invente un nom de marque accrocheur et mémorable."}

Génère le JSON complet avec: product, review, hero, timeline, advantages, comparison, statistics, faq, trust_badges.
Les prix doivent être en devise cohérente (€ pour sources EUR, $ sinon).`;

      try {
        const result = await callOpenAIJson({
          system: PAGE_SYSTEM_PROMPT,
          user: userPrompt,
          temperature: 0.7,
          maxTokens: 3000,
        });

        // Override brand_name if user specified one
        if (brandName && brandName !== "YOUR BRAND") {
          (result as Record<string, unknown>).brand_name = brandName;
        }

        return NextResponse.json({ page: result });
      } catch (err) {
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

          send({
            type: "progress",
            percent: 20,
            label: `📦 Création: ${pageData.product.title}`,
          });

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

          send({ type: "progress", percent: 80, label: "✅ Produit créé !" });

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
        const result = await callOpenAIJson({
          system: PAGE_SYSTEM_PROMPT,
          user: userPrompt,
          temperature: 0.6,
          maxTokens: 4000,
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
  discount > 0
    ? `<!-- Savings Badge -->
<div style="text-align:center;padding:16px;background:${color};color:white;border-radius:8px;margin:16px 0;">
  <strong style="font-size:16px;">🔥 ÉCONOMISEZ ${discount}% — Offre limitée !</strong>
</div>`
    : ""
}
`.trim();
}
