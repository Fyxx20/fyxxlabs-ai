"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Package,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Globe,
  AlertTriangle,
} from "lucide-react";

interface ScanPageData {
  url?: string;
  title?: string;
  hasPrice?: boolean;
  hasCTA?: boolean;
  hasReviews?: boolean;
  hasTrustBadges?: boolean;
  hasShippingReturns?: boolean;
}

interface ScanDataJson {
  homepage?: ScanPageData;
  pages?: ScanPageData[];
  pages_scanned?: string[];
  price_insights?: {
    detected_prices?: number[];
    own_average_price?: number | null;
    own_min_price?: number | null;
    own_max_price?: number | null;
    product_pages?: string[];
    competitor_average_price?: number | null;
  };
  business_metrics?: {
    orders?: number;
    revenue?: number;
    customers?: number;
    aov?: number;
  } | null;
  product_analysis?: Array<{
    url: string;
    title: string;
    h1?: string | null;
    meta_description?: string | null;
    image_count?: number;
    detected_prices?: number[];
    average_price?: number | null;
    has_cta?: boolean;
    has_reviews?: boolean;
    has_shipping_returns?: boolean;
    issues?: string[];
    recommendations?: string[];
  }>;
  analyzedAt?: string;
}

export function ScanDetailDataSections({
  scanDataJson,
  storeName,
  scanId,
}: {
  scanDataJson: unknown;
  storeName?: string | null;
  scanId: string;
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [improveMessage, setImproveMessage] = useState<string | null>(null);
  const data = scanDataJson as ScanDataJson | null | undefined;
  const homepage = data?.homepage;
  const pages = data?.pages ?? [];
  const pagesScanned = data?.pages_scanned ?? [];
  const priceInsights = data?.price_insights;
  const businessMetrics = data?.business_metrics;
  const productAnalysis = data?.product_analysis ?? [];
  const hasAnyData = Boolean(homepage || pages.length > 0 || pagesScanned.length > 0 || productAnalysis.length > 0);

  const productPages = pages.filter((p) => p.url?.toLowerCase().includes("/product") || p.title);
  const withPrice = [homepage, ...pages].filter(Boolean).filter((p) => p?.hasPrice);
  const withReviews = [homepage, ...pages].filter(Boolean).filter((p) => p?.hasReviews);
  const totalPages = pages.length + (homepage ? 1 : 0) || pagesScanned.length;
  const ownAvg = priceInsights?.own_average_price ?? null;
  const ownMin = priceInsights?.own_min_price ?? null;
  const ownMax = priceInsights?.own_max_price ?? null;
  const competitorAvg = priceInsights?.competitor_average_price ?? null;
  const detectedPriceCount = priceInsights?.detected_prices?.length ?? 0;
  const productPagesDetected = priceInsights?.product_pages?.length ?? 0;
  const totalProducts = Math.max(productAnalysis.length, productPagesDetected, productPages.length);

  const productAvgPrices = productAnalysis
    .map((p) => p.average_price)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  const sorted = [...productAvgPrices].sort((a, b) => a - b);
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const benchmark = competitorAvg ?? ownAvg ?? median;

  const productRows = productAnalysis.map((p) => {
    const current = p.average_price ?? null;
    if (!current || !benchmark) {
      return {
        ...p,
        status: "unknown" as const,
        recommended: null as number | null,
        note: "Données insuffisantes pour estimer un prix cible.",
      };
    }

    const low = benchmark * 0.85;
    const high = benchmark * 1.2;
    const isOk = current >= low && current <= high;
    let recommended = current;
    let note = "Prix cohérent avec le benchmark estimé.";

    if (current < low) {
      recommended = benchmark * 0.92;
      note = "Prix potentiellement trop bas : marge possiblement sous-optimale.";
    } else if (current > high) {
      recommended = benchmark * 1.08;
      note = "Prix potentiellement élevé : risque de friction à la conversion.";
    }

    return {
      ...p,
      status: isOk ? ("ok" as const) : ("ko" as const),
      recommended: Number(recommended.toFixed(2)),
      note,
    };
  });
  const displayedCompetitorAvg = competitorAvg ?? (benchmark != null ? Number(benchmark.toFixed(2)) : null);

  async function handleImproveImages() {
    setOptimizing(true);
    setImproveMessage(null);
    try {
      const res = await fetch(`/api/scan/${scanId}/improve-images`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible d'optimiser les images");
      setImproveMessage(
        data.total > 0
          ? `${data.total} image(s) optimisée(s) avec IA.`
          : data.message ?? "Aucune image à optimiser."
      );
    } catch (err) {
      setImproveMessage(err instanceof Error ? err.message : "Erreur optimisation image");
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
        <Button size="sm" variant="outline" disabled={optimizing} onClick={handleImproveImages}>
          {optimizing ? "Optimisation IA en cours..." : "Améliorer les images avec IA"}
        </Button>
        {improveMessage && (
          <p className="text-xs text-muted-foreground">{improveMessage}</p>
        )}
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Onglets d'analyse : <span className="font-medium text-foreground">Vue générale</span> et{" "}
        <span className="font-medium text-foreground">Analyse de produits</span>.
      </div>
      <TabsList>
        <TabsTrigger value="overview">Vue générale</TabsTrigger>
        <TabsTrigger value="products">Analyse de produits</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {!hasAnyData && (
          <Card className="mb-4 border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Données de scan limitées pour cette exécution. Les onglets restent disponibles : relance une analyse pour enrichir les résultats.
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Produits / pages analysées */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-primary" />
                Produits & pages analysés
              </CardTitle>
              <CardDescription>
                {storeName ? `${storeName} — ` : ""}
                synthèse du crawl.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                Pages analysées : <span className="font-semibold text-foreground">{totalPages}</span>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                Produits détectés : <span className="font-semibold text-foreground">{totalProducts}</span>
              </div>
              {homepage?.url && (
                <div className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground" title={homepage.url}>
                    Page d’accueil : {homepage.url}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marché & concurrents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Marché & concurrents
              </CardTitle>
              <CardDescription>
                Analyse du positionnement (données connectées).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayedCompetitorAvg != null ? (
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">
                    Prix moyen concurrence (estimé) : <span className="font-semibold">{displayedCompetitorAvg.toFixed(2)} €</span>
                  </p>
                  {ownAvg != null && (
                    <p className="text-muted-foreground">
                      Écart avec ta boutique :{" "}
                      <span className="font-medium text-foreground">
                        {(ownAvg - displayedCompetitorAvg > 0 ? "+" : "") + (ownAvg - displayedCompetitorAvg).toFixed(2)} €
                      </span>
                    </p>
                  )}
                  {competitorAvg == null && (
                    <p className="text-xs text-muted-foreground">
                      Estimation interne sur scan URL (à affiner avec données connectées).
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Données concurrence non disponibles pour ce scan. Avec URL seule, FyxxLabs fournit un benchmark estimatif interne. Branche Shopify pour une comparaison plus fiable.
                </p>
              )}
              {businessMetrics && (
                <div className="mt-3 rounded-md border border-border bg-muted/20 p-3 text-sm">
                  <p className="font-medium text-foreground">Métriques business récupérées</p>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-muted-foreground">
                    <span>Commandes: <span className="font-medium text-foreground">{businessMetrics.orders ?? "—"}</span></span>
                    <span>Clients: <span className="font-medium text-foreground">{businessMetrics.customers ?? "—"}</span></span>
                    <span>CA: <span className="font-medium text-foreground">{businessMetrics.revenue != null ? `${Number(businessMetrics.revenue).toFixed(2)} €` : "—"}</span></span>
                    <span>Panier moyen: <span className="font-medium text-foreground">{businessMetrics.aov != null ? `${Number(businessMetrics.aov).toFixed(2)} €` : "—"}</span></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prix & offre */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-primary" />
                Prix & offre
              </CardTitle>
              <CardDescription>
                Détection des prix et signaux de conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {withPrice.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  Prix détectés : {detectedPriceCount > 0 ? `${detectedPriceCount} valeur(s)` : withPrice.length > 0 ? `${withPrice.length} page(s)` : "non détecté"}
                </span>
              </div>
              {ownAvg != null && (
                <div className="rounded-md border border-border bg-muted/30 p-2 text-sm">
                  <p>
                    Prix moyen détecté : <span className="font-semibold">{ownAvg.toFixed(2)} €</span>
                  </p>
                  {ownMin != null && ownMax != null && (
                    <p className="text-muted-foreground">
                      Fourchette : {ownMin.toFixed(2)} € - {ownMax.toFixed(2)} €
                    </p>
                  )}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Produits/pages produit détectés : <span className="font-medium text-foreground">{totalProducts}</span>
              </div>
              <div className="flex items-center gap-2">
                {withReviews.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  Avis / preuve sociale : {withReviews.length > 0 ? "oui" : "non détecté"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="products">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              Analyse de produits
            </CardTitle>
            <CardDescription>
              Évaluation produit par produit : prix actuel, statut (OK/KO), estimation prix conseillé et correctifs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Aucun produit détaillé pour ce scan. Lance un scan URL complet ou connecté pour activer cette vue.
              </div>
            ) : (
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {productRows.map((p, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground" title={p.title || p.url}>
                          {p.title || p.url}
                        </p>
                        <p className="truncate text-xs text-muted-foreground" title={p.url}>
                          {p.url}
                        </p>
                      </div>
                      {p.status === "ok" ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Prix OK
                        </Badge>
                      ) : p.status === "ko" ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3.5 w-3.5" />
                          Prix à ajuster
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Données incomplètes
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-md bg-muted/30 p-2">
                        <p className="text-xs text-muted-foreground">Prix actuel</p>
                        <p className="font-medium">{p.average_price != null ? `${p.average_price.toFixed(2)} €` : "—"}</p>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <p className="text-xs text-muted-foreground">Prix conseillé (estimé)</p>
                        <p className="font-medium">{p.recommended != null ? `${p.recommended.toFixed(2)} €` : "—"}</p>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <p className="text-xs text-muted-foreground">Images détectées</p>
                        <p className="font-medium">{p.image_count ?? 0}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">{p.note}</p>

                    {(p.recommendations ?? []).length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground/90">
                        {(p.recommendations ?? []).slice(0, 3).map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
