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
}

export function buildScanUserMessage(input: ScanUserPromptInput): string {
  const { store, signals, pagesAnalyzed, metrics, modeUrlOnly } = input;
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
    "Produis le JSON avec: score (0-100), breakdown (clarity, trust, ux, offer, speed, funnel chacun 0-100), priority_action (title, steps[], time_minutes, expected_impact), issues[] (id, title, why, fix_steps[], impact, confidence), checklist[] ({label, done: false}), notes (confidence, limitations[])."
  );
  return lines.join("\n");
}
