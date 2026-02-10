import * as cheerio from "cheerio";

const KEY_PATHS = [
  "/product",
  "/products",
  "/collection",
  "/collections",
  "/cart",
  "/checkout",
  "/contact",
  "/about",
  "/shipping",
  "/returns",
  "/pages",
];

export function extractPageData(html: string, baseUrl: string): {
  title: string;
  metaDescription: string | null;
  h1: string | null;
  visibleText: string;
  hasPrice: boolean;
  hasCTA: boolean;
  hasReviews: boolean;
  hasTrustBadges: boolean;
  hasShippingReturns: boolean;
  links: string[];
} {
  const $ = cheerio.load(html);

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const h1 = $("h1").first().text().trim() || null;

  $("script, style, nav, footer, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const visibleText = bodyText.slice(0, 15000);

  const htmlLower = html.toLowerCase();
  const hasPrice =
    /\d+\s*[,.]?\d*\s*€|€\s*\d+|price|prix|add to cart|ajouter au panier/i.test(htmlLower) ||
    $("[data-price], .price, .product-price").length > 0;
  const hasCTA =
    /button|btn|cta|acheter|buy|commander|add to cart|ajouter/i.test(htmlLower) &&
    ($("button, a.btn, [role='button'], input[type='submit']").length > 0 ||
      /acheter|ajouter|commander|buy now/i.test(visibleText));
  const hasReviews =
    /review|avis|rating|étoile|star|trustpilot|google review/i.test(htmlLower);
  const hasTrustBadges =
    /secure|ssl|paiement|payment|livraison|delivery|retour|return|garantie|guarantee|trust/i.test(htmlLower) ||
    $("img[alt*='trust'], img[alt*='secure'], [class*='badge'], [class*='trust']").length > 0;
  const hasShippingReturns =
    /livraison|shipping|retour|return|delivery|expédition/i.test(visibleText);

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const url = new URL(href, baseUrl);
      if (url.origin === new URL(baseUrl).origin) {
        const path = url.pathname;
        if (!links.includes(path)) links.push(path);
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return {
    title,
    metaDescription,
    h1,
    visibleText,
    hasPrice,
    hasCTA,
    hasReviews,
    hasTrustBadges,
    hasShippingReturns,
    links,
  };
}

export function discoverKeyPages(links: string[], baseUrl: string, maxPages: number = 8): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>([base.pathname.replace(/\/$/, "") || "/"]);
  const result: string[] = [];
  for (const path of links) {
    if (result.length >= maxPages) break;
    const normalized = path.replace(/\/$/, "") || "/";
    if (seen.has(normalized)) continue;
    const lower = path.toLowerCase();
    const isKey = KEY_PATHS.some((p) => lower.includes(p));
    if (isKey) {
      seen.add(normalized);
      result.push(new URL(path, baseUrl).href);
    }
  }
  return result;
}
