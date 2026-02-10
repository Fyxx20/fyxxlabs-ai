import * as cheerio from "cheerio";

const ABOVE_THE_FOLD_CHARS = 12000;
const CTA_KEYWORDS = /acheter|ajouter au panier|commander|buy|add to cart|commander/i;
const PRICE_REGEX = /\d+\s*[,.]?\d*\s*[€$]|[€$]\s*\d+/i;
const SHIPPING_RETURN_KEYWORDS = /livraison|shipping|retour|return|delivery|expédition/i;
const CONTACT_KEYWORDS = /mailto:|tel:|contact|nous contacter|contactez/i;
const REVIEW_KEYWORDS = /review|avis|rating|étoile|star|trustpilot|google review/i;
const TRUST_KEYWORDS = /secure|ssl|paiement|payment|garantie|guarantee|trust/i;

export interface StructuredProductData {
  name?: string;
  description?: string;
  price?: string;
  currency?: string;
  availability?: string;
  brand?: string;
  ratingValue?: string;
  reviewCount?: string;
  sku?: string;
  image?: string;
}

export interface PageSignals {
  url: string;
  title: string;
  metaDescription: string | null;
  h1: string | null;
  h2Count: number;
  hasCta: boolean;
  hasPrice: boolean;
  hasShippingReturns: boolean;
  hasContact: boolean;
  hasReviews: boolean;
  hasTrustBadges: boolean;
  scriptCount: number;
  imageCount: number;
  hasViewportMobile: boolean;
  hasProductLinks: boolean;
  hasCartLinks: boolean;
  ctaAboveFold: boolean;
  priceAboveFold: boolean;
  /** Visible text content (truncated to ~800 chars) for AI analysis */
  visibleText: string;
  /** Word count of full visible text */
  wordCount: number;
  /** H2 headings list for page structure analysis */
  h2Texts: string[];
  /** JSON-LD structured data if present (Product, Organization, etc.) */
  structuredData: StructuredProductData[];
  /** Whether page has canonical URL set */
  hasCanonical: boolean;
  /** Whether page has Open Graph tags */
  hasOpenGraph: boolean;
  /** Whether page has alt text on images */
  imageAltRatio: number;
  /** Page type detected */
  pageType: "home" | "product" | "collection" | "cart" | "about" | "contact" | "other";
}

export function extractSignalsFromHtml(html: string, url: string): PageSignals {
  const $ = cheerio.load(html);
  const htmlLower = html.toLowerCase();
  const headHtml = $("head").html() ?? "";
  const bodyHtml = $("body").html() ?? "";
  const topHtml = (headHtml + bodyHtml).slice(0, ABOVE_THE_FOLD_CHARS);

  const title = $("title").first().text().trim() || $('meta[property="og:title"]').attr("content")?.trim() || "";
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const h1 = $("h1").first().text().trim() || null;
  const h2Count = $("h2").length;

  // Extract H2 texts for structure analysis
  const h2Texts: string[] = [];
  $("h2").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt && h2Texts.length < 10) h2Texts.push(txt.slice(0, 80));
  });

  const hasCta =
    CTA_KEYWORDS.test(htmlLower) &&
    ($("button, a.btn, [role='button'], input[type='submit']").length > 0 || CTA_KEYWORDS.test($("body").text()));
  const hasPrice =
    PRICE_REGEX.test(htmlLower) || $("[data-price], .price, .product-price").length > 0;
  const hasShippingReturns = SHIPPING_RETURN_KEYWORDS.test($("body").text());
  const hasContact = CONTACT_KEYWORDS.test(htmlLower) || $('a[href^="mailto:"], a[href^="tel:"]').length > 0;
  const hasReviews = REVIEW_KEYWORDS.test(htmlLower);
  const hasTrustBadges =
    TRUST_KEYWORDS.test(htmlLower) ||
    $("img[alt*='trust'], img[alt*='secure'], [class*='badge'], [class*='trust']").length > 0;

  const scriptCount = $("script").length;
  const imageCount = $("img").length;
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  const hasViewportMobile = /width=device-width|initial-scale=1/i.test(viewport);

  // Extract visible text for AI analysis
  $("script, style, noscript, svg, iframe").remove();
  const fullVisibleText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = fullVisibleText.split(/\s+/).filter(Boolean).length;
  const visibleText = fullVisibleText.slice(0, 800);

  // Extract JSON-LD structured data
  const structuredData: StructuredProductData[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
          structuredData.push({
            name: item.name ?? undefined,
            description: typeof item.description === "string" ? item.description.slice(0, 300) : undefined,
            price: item.offers?.price ?? item.offers?.[0]?.price ?? undefined,
            currency: item.offers?.priceCurrency ?? item.offers?.[0]?.priceCurrency ?? undefined,
            availability: item.offers?.availability ?? undefined,
            brand: item.brand?.name ?? item.brand ?? undefined,
            ratingValue: item.aggregateRating?.ratingValue ?? undefined,
            reviewCount: item.aggregateRating?.reviewCount ?? undefined,
            sku: item.sku ?? undefined,
            image: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          });
        }
      }
    } catch {
      // Ignore invalid JSON-LD
    }
  });

  // Image alt text analysis
  let imagesWithAlt = 0;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.trim().length > 0) imagesWithAlt++;
  });
  const imageAltRatio = imageCount > 0 ? Number((imagesWithAlt / imageCount).toFixed(2)) : 1;

  // Check canonical and OG tags
  const hasCanonical = $('link[rel="canonical"]').length > 0;
  const hasOpenGraph = $('meta[property^="og:"]').length >= 2;

  const links: string[] = [];
  // Re-parse links from full HTML (before script removal)
  const $full = cheerio.load(html);
  $full("a[href]").each((_, el) => {
    const href = $full(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const full = new URL(href, url).pathname.toLowerCase();
      if (!links.includes(full)) links.push(full);
    } catch {
      // ignore
    }
  });
  const hasProductLinks = links.some((p) => p.includes("/product") || p.includes("/products"));
  const hasCartLinks = links.some((p) => p.includes("/cart") || p.includes("/panier"));

  const ctaAboveFold = CTA_KEYWORDS.test(topHtml) && (hasCta || /button|btn|submit/i.test(topHtml));
  const priceAboveFold = PRICE_REGEX.test(topHtml) || $(".price, .product-price").length > 0;

  // Detect page type
  const urlLower = url.toLowerCase();
  let pageType: PageSignals["pageType"] = "other";
  if (urlLower === new URL(url).origin + "/" || urlLower.endsWith("/") && new URL(url).pathname === "/") {
    pageType = "home";
  } else if (/\/product|\/products|\/produit/i.test(urlLower)) {
    pageType = "product";
  } else if (/\/collection|\/collections|\/categor/i.test(urlLower)) {
    pageType = "collection";
  } else if (/\/cart|\/panier|\/checkout/i.test(urlLower)) {
    pageType = "cart";
  } else if (/\/about|\/a-propos|\/qui-sommes/i.test(urlLower)) {
    pageType = "about";
  } else if (/\/contact|\/nous-contacter/i.test(urlLower)) {
    pageType = "contact";
  }

  return {
    url,
    title,
    metaDescription,
    h1,
    h2Count,
    hasCta,
    hasPrice,
    hasShippingReturns,
    hasContact,
    hasReviews,
    hasTrustBadges,
    scriptCount,
    imageCount,
    hasViewportMobile,
    hasProductLinks,
    hasCartLinks,
    ctaAboveFold,
    priceAboveFold,
    visibleText,
    wordCount,
    h2Texts,
    structuredData,
    hasCanonical,
    hasOpenGraph,
    imageAltRatio,
    pageType,
  };
}

export interface BaselineResult {
  score: number;
  breakdown: { clarity: number; trust: number; ux: number; offer: number; speed: number; funnel: number };
  issues: Array<{
    id: string;
    title: string;
    why: string;
    fix_steps: string[];
    impact: string;
    confidence: "low" | "medium" | "high";
  }>;
  priority_action: { title: string; steps: string[]; time_minutes: number; expected_impact: string };
  checklist: Array<{ label: string; done: boolean }>;
}

export function computeBaselineScore(signals: PageSignals[]): number {
  if (signals.length === 0) return 50;
  const home = signals[0];
  let score = 50;
  if (home.h1) score += 5;
  if (home.metaDescription) score += 3;
  if (home.hasCta) score += 8;
  if (home.ctaAboveFold) score += 5;
  if (home.hasPrice) score += 5;
  if (home.priceAboveFold) score += 3;
  if (home.hasContact) score += 5;
  if (home.hasShippingReturns) score += 5;
  if (home.hasTrustBadges) score += 4;
  if (home.hasReviews) score += 4;
  if (home.hasViewportMobile) score += 3;
  if (home.hasProductLinks || home.hasCartLinks) score += 5;
  const heavyScripts = signals.some((s) => s.scriptCount > 40);
  if (!heavyScripts) score += 5;
  return Math.min(100, Math.max(0, score));
}

export function createBaselineBreakdown(signals: PageSignals[]): BaselineResult["breakdown"] {
  const home = signals[0] ?? null;
  const clarity = home?.h1 && home?.metaDescription ? 70 : home?.h1 ? 55 : 40;
  const trust =
    [home?.hasContact, home?.hasShippingReturns, home?.hasTrustBadges, home?.hasReviews].filter(Boolean).length * 25;
  const ux = home?.hasViewportMobile ? 65 : 45;
  const offer = home?.hasPrice && home?.hasCta ? 70 : home?.hasPrice ? 50 : 35;
  const speed = signals.some((s) => s.scriptCount > 50) ? 45 : 65;
  const funnel = home?.hasCartLinks || home?.hasProductLinks ? 65 : 45;
  return {
    clarity: Math.min(100, clarity),
    trust: Math.min(100, trust),
    ux: Math.min(100, ux),
    offer: Math.min(100, offer),
    speed: Math.min(100, speed),
    funnel: Math.min(100, funnel),
  };
}

export function createBaselineIssues(signals: PageSignals[]): BaselineResult["issues"] {
  const home = signals[0];
  const issues: BaselineResult["issues"] = [];
  if (!home) return issues;
  if (!home.h1) {
    issues.push({
      id: "no-h1",
      title: "H1 manquant ou peu explicite",
      why: "Un H1 clair aide le visiteur et le SEO.",
      fix_steps: ["Ajouter un titre H1 unique en haut de page", "Résumer l'offre en une phrase"],
      impact: "medium",
      confidence: "high",
    });
  }
  if (!home.hasCta || !home.ctaAboveFold) {
    issues.push({
      id: "cta-fold",
      title: "CTA principal peu visible above the fold",
      why: "Le visiteur doit voir l'action principale sans scroller.",
      fix_steps: ["Placer un bouton d'action (ex. Ajouter au panier) en haut de page", "Utiliser un contraste fort"],
      impact: "high",
      confidence: "high",
    });
  }
  if (!home.hasContact) {
    issues.push({
      id: "no-contact",
      title: "Page contact ou moyen de contact peu visible",
      why: "La confiance baisse si on ne peut pas vous joindre.",
      fix_steps: ["Ajouter un lien Contact dans le header/footer", "Ou mailto: / numéro visible"],
      impact: "medium",
      confidence: "high",
    });
  }
  if (!home.hasShippingReturns) {
    issues.push({
      id: "no-shipping",
      title: "Infos livraison / retours peu visibles",
      why: "Les acheteurs veulent savoir les délais et conditions.",
      fix_steps: ["Afficher livraison et retours sur la homepage ou en footer", "Lien dédié si possible"],
      impact: "medium",
      confidence: "medium",
    });
  }
  if (!home.hasViewportMobile) {
    issues.push({
      id: "viewport",
      title: "Viewport mobile non configuré",
      why: "Le site peut mal s'afficher sur mobile.",
      fix_steps: ['Ajouter <meta name="viewport" content="width=device-width, initial-scale=1"> dans <head>'],
      impact: "high",
      confidence: "high",
    });
  }
  return issues.slice(0, 5);
}

export function createBaselinePriorityAction(signals: PageSignals[]): BaselineResult["priority_action"] {
  const home = signals[0];
  if (!home?.hasCta || !home.ctaAboveFold) {
    return {
      title: "Mettre un CTA principal visible en haut de page",
      steps: [
        "Identifier l'action principale (ex. Ajouter au panier, Découvrir)",
        "Placer le bouton above the fold avec un libellé clair",
        "Vérifier le contraste (lisibilité)",
      ],
      time_minutes: 30,
      expected_impact: "high",
    };
  }
  if (!home.hasContact) {
    return {
      title: "Rendre le contact facile à trouver",
      steps: [
        "Ajouter un lien Contact dans le menu ou le footer",
        "Vérifier que la page contact ou le formulaire fonctionne",
      ],
      time_minutes: 15,
      expected_impact: "medium",
    };
  }
  return {
    title: "Renforcer la preuve sociale et les garanties",
    steps: [
      "Afficher des avis ou badges (paiement sécurisé, retours)",
      "Mentionner livraison et retours près du CTA ou en footer",
    ],
    time_minutes: 20,
    expected_impact: "medium",
  };
}

export function createBaselineChecklist(signals: PageSignals[]): BaselineResult["checklist"] {
  const home = signals[0];
  const items: BaselineResult["checklist"] = [
    { label: "H1 présent et explicite", done: Boolean(home?.h1) },
    { label: "Meta description présente", done: Boolean(home?.metaDescription) },
    { label: "CTA principal visible above the fold", done: Boolean(home?.ctaAboveFold && home?.hasCta) },
    { label: "Prix visible rapidement", done: Boolean(home?.priceAboveFold || home?.hasPrice) },
    { label: "Lien ou infos contact visibles", done: Boolean(home?.hasContact) },
    { label: "Mentions livraison / retours", done: Boolean(home?.hasShippingReturns) },
    { label: "Badges confiance (paiement, etc.)", done: Boolean(home?.hasTrustBadges) },
    { label: "Avis ou notation présents", done: Boolean(home?.hasReviews) },
    { label: "Viewport mobile configuré", done: Boolean(home?.hasViewportMobile) },
    { label: "Liens vers produits ou panier", done: Boolean(home?.hasProductLinks || home?.hasCartLinks) },
  ];
  return items;
}

export function computeBaseline(signals: PageSignals[]): BaselineResult {
  const score = computeBaselineScore(signals);
  const breakdown = createBaselineBreakdown(signals);
  const issues = createBaselineIssues(signals);
  const priority_action = createBaselinePriorityAction(signals);
  const checklist = createBaselineChecklist(signals);
  return { score, breakdown, issues, priority_action, checklist };
}
