import "server-only";

export interface ScanUserPromptInput {
  store: {
    url: string;
    platform?: string | null;
    country?: string | null;
    stage?: string | null;
    traffic_source?: string | null;
    aov?: string | null;
  };
  signals: Record<string, unknown>;
  pagesAnalyzed: string[];
  metrics?: {
    orders?: number;
    revenue?: number;
    customers?: number;
    aov?: number;
  } | null;
  modeUrlOnly?: boolean;
  productAnalysis?: Array<{
    url: string;
    title: string;
    h1: string | null;
    meta_description: string | null;
    image_count: number;
    detected_prices: number[];
    average_price: number | null;
    has_cta: boolean;
    has_reviews: boolean;
    has_trust_badges: boolean;
    has_shipping_returns: boolean;
    issues: string[];
    recommendations: string[];
  }> | null;
  pageContents?: Array<{
    url: string;
    pageType: string;
    title: string;
    h1: string | null;
    visibleText: string;
    wordCount: number;
    h2Texts: string[];
    structuredData: unknown[];
    hasCanonical: boolean;
    hasOpenGraph: boolean;
    imageAltRatio: number;
  }> | null;
  priceInsights?: {
    own_average_price: number | null;
    own_min_price: number | null;
    own_max_price: number | null;
    product_count: number;
  } | null;
}

export function buildScanUserMessage(input: ScanUserPromptInput): string {
  const { store, signals, pagesAnalyzed, metrics, modeUrlOnly, productAnalysis, pageContents, priceInsights } = input;
  const lines: string[] = [
    "## Store",
    `URL: ${store.url}`,
    `Plateforme: ${store.platform ?? "non précisé"}`,
    `Pays: ${store.country ?? "non précisé"}`,
    `Stage: ${store.stage ?? "non précisé"}`,
    `Source trafic: ${store.traffic_source ?? "non précisé"}`,
    `Panier moyen (bucket): ${store.aov ?? "non précisé"}`,
    "",
    "## Signaux extraits (données brutes)",
    JSON.stringify(signals, null, 2),
    "",
    "## Pages analysées",
    ...pagesAnalyzed.map((u) => `- ${u}`),
  ];

  // Add page content summaries for deep analysis
  if (pageContents && pageContents.length > 0) {
    lines.push("", "## Contenu des pages (texte visible tronqué)");
    for (const page of pageContents.slice(0, 15)) {
      lines.push(
        `\n### ${page.pageType.toUpperCase()} — ${page.url}`,
        `Titre: ${page.title}`,
        `H1: ${page.h1 ?? "ABSENT"}`,
        `Mots: ${page.wordCount}`,
        `Canonical: ${page.hasCanonical ? "oui" : "NON"}`,
        `Open Graph: ${page.hasOpenGraph ? "oui" : "NON"}`,
        `Alt images: ${Math.round(page.imageAltRatio * 100)}%`,
      );
      if (page.h2Texts.length > 0) {
        lines.push(`Structure H2: ${page.h2Texts.join(" | ")}`);
      }
      if (page.structuredData.length > 0) {
        lines.push(`Données structurées JSON-LD: ${JSON.stringify(page.structuredData)}`);
      }
      if (page.visibleText) {
        lines.push(`Extrait texte: "${page.visibleText}"`);
      }
    }
  }

  // Add product analysis details
  if (productAnalysis && productAnalysis.length > 0) {
    lines.push("", "## Analyse détaillée des produits");
    lines.push(`Nombre de produits analysés: ${productAnalysis.length}`);
    for (const p of productAnalysis.slice(0, 20)) {
      lines.push(
        `\n### Produit: ${p.title || p.url}`,
        `URL: ${p.url}`,
        `H1: ${p.h1 ?? "ABSENT"}`,
        `Description meta: ${p.meta_description ?? "ABSENTE"}`,
        `Images: ${p.image_count}`,
        `Prix détectés: ${p.detected_prices.length > 0 ? p.detected_prices.join(", ") + " €" : "AUCUN"}`,
        `Prix moyen: ${p.average_price ?? "N/A"}`,
        `CTA achat: ${p.has_cta ? "oui" : "NON"}`,
        `Avis clients: ${p.has_reviews ? "oui" : "NON"}`,
        `Badges confiance: ${p.has_trust_badges ? "oui" : "NON"}`,
        `Livraison/retours: ${p.has_shipping_returns ? "oui" : "NON"}`,
      );
      if (p.issues.length > 0) {
        lines.push(`Problèmes: ${p.issues.join("; ")}`);
      }
    }
  }

  // Add price insights
  if (priceInsights && priceInsights.own_average_price != null) {
    lines.push("", "## Insights prix");
    lines.push(`Prix moyen: ${priceInsights.own_average_price} €`);
    lines.push(`Prix min: ${priceInsights.own_min_price} €`);
    lines.push(`Prix max: ${priceInsights.own_max_price} €`);
    lines.push(`Nombre de produits avec prix: ${priceInsights.product_count}`);
  }

  if (metrics && (metrics.orders != null || metrics.revenue != null || metrics.customers != null)) {
    lines.push("", "## Métriques (intégration plateforme)");
    if (metrics.orders != null) lines.push(`Commandes: ${metrics.orders}`);
    if (metrics.revenue != null) lines.push(`Chiffre d'affaires: ${metrics.revenue}`);
    if (metrics.customers != null) lines.push(`Clients: ${metrics.customers}`);
    if (metrics.aov != null) lines.push(`Panier moyen: ${metrics.aov}`);
  }
  if (modeUrlOnly) {
    lines.push("", "IMPORTANT: Scan en mode URL uniquement (pas de données plateforme). Inclus dans limitations: 'Scan URL uniquement'.");
  }
  lines.push(
    "",
    "Analyse ce site e-commerce EN PROFONDEUR. Évalue CHAQUE page, CHAQUE produit, et donne une analyse détaillée.",
    "Pour chaque problème identifié, donne des fix_steps TRÈS CONCRETS avec des exemples spécifiques au site.",
    "Identifie les problèmes de conversion les plus critiques en priorité.",
    "",
    "Produis le JSON avec: score (0-100), breakdown (clarity, trust, ux, offer, speed, funnel chacun 0-100), priority_action (title, steps[], time_minutes, expected_impact), issues[] (id, title, why, fix_steps[], impact, confidence) — AU MOINS 6 issues détaillées, checklist[] ({label, done: false}), notes (confidence, limitations[])."
  );
  return lines.join("\n");
}
