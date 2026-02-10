"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const CRITERIA: { key: string; label: string }[] = [
  { key: "conversion", label: "Tunnel de conversion" },
  { key: "trust", label: "Signaux de confiance" },
  { key: "offer", label: "Clarté de l'offre" },
  { key: "performance", label: "Performance perçue" },
  { key: "traffic", label: "Trafic & acquisition" },
];

type CriterionKey = (typeof CRITERIA)[number]["key"];

interface IssueLike {
  id: string;
  title: string;
  category?: string;
  why_it_hurts?: string;
  fix_steps?: string[];
}

const CATEGORY_BY_KEY: Record<CriterionKey, string[]> = {
  conversion: ["conversion", "funnel", "ux"],
  trust: ["trust", "confiance"],
  offer: ["offer", "offre", "pricing", "prix"],
  performance: ["performance", "speed", "technique"],
  traffic: ["traffic", "acquisition", "seo"],
};

const TEXT_HINTS_BY_KEY: Record<CriterionKey, string[]> = {
  conversion: ["cta", "panier", "checkout", "cart", "tunnel", "ajouter au panier"],
  trust: ["trust", "confiance", "avis", "review", "badge", "retour", "livraison", "contact"],
  offer: ["offre", "prix", "pricing", "value", "proposition", "bénéfice", "benefit"],
  performance: ["performance", "speed", "script", "image", "viewport", "mobile", "core web"],
  traffic: ["seo", "title", "meta", "h1", "index", "acquisition", "traffic"],
};

function issueMatchesCriterion(issue: IssueLike, key: CriterionKey): boolean {
  const cat = (issue.category ?? "").toLowerCase();
  const text = `${issue.id} ${issue.title} ${issue.why_it_hurts ?? ""}`.toLowerCase();
  const catHints = CATEGORY_BY_KEY[key];
  const textHints = TEXT_HINTS_BY_KEY[key];
  return (
    catHints.some((c) => cat.includes(c)) ||
    textHints.some((h) => text.includes(h))
  );
}

function fallbackByScore(key: CriterionKey, score: number): IssueLike[] {
  // Always show improvement suggestions, even for high scores
  const highScoreMap: Record<CriterionKey, IssueLike> = {
    conversion: {
      id: "tip-conversion",
      title: "Optimiser le tunnel de conversion",
      why_it_hurts: "Même un bon tunnel peut encore être affiné pour maximiser les conversions.",
      fix_steps: [
        "Tester différentes formulations de CTA (ex: \"Ajouter au panier\" vs \"Je commande\").",
        "Réduire le nombre d'étapes entre la fiche produit et la confirmation.",
        "Ajouter un indicateur de progression dans le checkout.",
        "Proposer le guest checkout pour les nouveaux clients.",
      ],
    },
    trust: {
      id: "tip-trust",
      title: "Renforcer les signaux de confiance",
      why_it_hurts: "La confiance peut toujours être améliorée pour réduire les hésitations.",
      fix_steps: [
        "Mettre en avant les avis clients les plus récents.",
        "Ajouter des badges de paiement sécurisé visibles.",
        "Afficher clairement délais de livraison et politique de retour.",
        "Ajouter une page \"À propos\" complète avec l'équipe.",
      ],
    },
    offer: {
      id: "tip-offer",
      title: "Affiner la clarté de l'offre",
      why_it_hurts: "Une offre peut toujours être mieux comprise pour convertir plus.",
      fix_steps: [
        "Tester un sous-titre plus orienté bénéfice sous le H1.",
        "Utiliser l'ancrage de prix (barré / économie visible).",
        "Comparer vos avantages vs la concurrence sur la page produit.",
        "Clarifier les options (tailles, couleurs) avec des visuels.",
      ],
    },
    performance: {
      id: "tip-performance",
      title: "Optimiser les performances techniques",
      why_it_hurts: "Chaque seconde de chargement en moins augmente la conversion.",
      fix_steps: [
        "Compresser les images au format WebP/AVIF.",
        "Lazy-loader les images sous le fold.",
        "Réduire les scripts tiers non essentiels.",
        "Vérifier les Core Web Vitals (LCP, CLS, FID).",
      ],
    },
    traffic: {
      id: "tip-traffic",
      title: "Développer l'acquisition de trafic",
      why_it_hurts: "Plus de trafic qualifié = plus de ventes potentielles.",
      fix_steps: [
        "Optimiser les balises title et meta description des pages clés.",
        "Structurer le contenu autour des intentions de recherche.",
        "Renforcer le maillage interne vers les pages produit.",
        "Considérer un blog ou des guides d'achat pour le SEO.",
      ],
    },
  };

  const lowScoreMap: Record<CriterionKey, IssueLike> = {
    conversion: {
      id: "fallback-conversion",
      title: "Tunnel de conversion sous-optimisé",
      why_it_hurts: "Les visiteurs ne passent pas assez facilement de la découverte à l'achat.",
      fix_steps: [
        "Rendre le CTA principal visible immédiatement (above the fold).",
        "Réduire les distractions sur les pages produit et checkout.",
        "Ajouter des preuves rassurantes près du bouton d'achat.",
      ],
    },
    trust: {
      id: "fallback-trust",
      title: "Signaux de confiance insuffisants",
      why_it_hurts: "Sans éléments de confiance clairs, les visiteurs hésitent avant d'acheter.",
      fix_steps: [
        "Afficher contact, livraison et retours de façon visible.",
        "Ajouter avis clients et badges de confiance.",
        "Renforcer les garanties (paiement sécurisé, politique de retour).",
      ],
    },
    offer: {
      id: "fallback-offer",
      title: "Proposition de valeur peu claire",
      why_it_hurts: "L'utilisateur comprend mal pourquoi acheter chez vous plutôt qu'ailleurs.",
      fix_steps: [
        "Clarifier la promesse en haut de page (H1 + sous-titre).",
        "Mettre en avant les bénéfices et différenciants.",
        "Rendre le pricing plus lisible (ancrage prix, options, garanties).",
      ],
    },
    performance: {
      id: "fallback-performance",
      title: "Performance perçue perfectible",
      why_it_hurts: "Un site lent ou instable réduit l'engagement et la conversion.",
      fix_steps: [
        "Compresser et lazy-loader les images lourdes.",
        "Réduire les scripts non essentiels.",
        "Vérifier l'affichage mobile et le temps de chargement initial.",
      ],
    },
    traffic: {
      id: "fallback-traffic",
      title: "Acquisition et bases SEO à renforcer",
      why_it_hurts: "Le site peut perdre du trafic qualifié et de la visibilité.",
      fix_steps: [
        "Vérifier title/meta/H1 sur les pages clés.",
        "Renforcer maillage interne vers pages produit/catégorie.",
        "Structurer le contenu pour mieux répondre aux intentions de recherche.",
      ],
    },
  };

  return [score >= 60 ? highScoreMap[key] : lowScoreMap[key]];
}

function statusFromScore(score: number): "ok" | "warning" | "problem" {
  if (score >= 70) return "ok";
  if (score >= 40) return "warning";
  return "problem";
}

function statusLabel(status: "ok" | "warning" | "problem"): string {
  switch (status) {
    case "ok":
      return "OK";
    case "warning":
      return "À améliorer";
    case "problem":
      return "Problème";
    default:
      return "—";
  }
}

export function AnalyzedCriteriaCards({
  scores,
  canViewDetails,
  issues = [],
  className,
}: {
  scores: Record<string, number>;
  canViewDetails: boolean;
  issues?: IssueLike[];
  className?: string;
}) {
  const [selected, setSelected] = useState<CriterionKey | null>(null);

  const issuesByCriterion = useMemo(() => {
    const byKey: Record<CriterionKey, IssueLike[]> = {
      conversion: [],
      trust: [],
      offer: [],
      performance: [],
      traffic: [],
    };

    for (const issue of issues) {
      for (const key of Object.keys(CATEGORY_BY_KEY) as CriterionKey[]) {
        if (issueMatchesCriterion(issue, key)) {
          byKey[key].push(issue);
          break;
        }
      }
    }
    return byKey;
  }, [issues]);

  const selectedLabel = CRITERIA.find((c) => c.key === selected)?.label ?? "";
  const selectedScore = selected ? Math.round(scores[selected] ?? 0) : 0;
  const selectedIssues = selected
    ? (
      issuesByCriterion[selected].length > 0
        ? issuesByCriterion[selected]
        : fallbackByScore(selected, selectedScore)
    )
    : [];

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Éléments analysés par FyxxLabs
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Critères mesurés sur votre boutique. Détails complets avec une version supérieure FyxxLabs.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CRITERIA.map(({ key, label }) => {
          const value = scores[key] ?? 0;
          const status = statusFromScore(value);
          return (
            <Card
              key={key}
              className={cn(
                "overflow-hidden transition-colors",
                canViewDetails && "cursor-pointer hover:border-primary/40"
              )}
              onClick={() => canViewDetails && setSelected(key)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {Math.round(value)}/100
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      status === "ok" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                      status === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                      status === "problem" && "bg-destructive/15 text-destructive"
                    )}
                  >
                    {statusLabel(status)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      status === "ok" && "bg-emerald-500/80",
                      status === "warning" && "bg-amber-500/80",
                      status === "problem" && "bg-destructive/80"
                    )}
                    style={{ width: `${Math.min(100, value)}%` }}
                  />
                </div>
                {!canViewDetails && (
                  <p className="text-xs text-muted-foreground">
                    Débloquez l'analyse complète pour les détails.
                  </p>
                )}
                {canViewDetails && (
                  <p className="text-xs text-primary/90">
                    Cliquer pour voir les problèmes et correctifs.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={selected != null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedLabel}</DialogTitle>
            <DialogDescription>
              Score actuel : <span className="font-semibold text-foreground">{selectedScore}/100</span>
            </DialogDescription>
          </DialogHeader>

          {selectedIssues.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              Excellent ! Aucun problème détecté pour ce thème. Continue à surveiller ce critère régulièrement.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedIssues.map((issue) => (
                <div key={issue.id} className="rounded-lg border border-border p-4">
                  <h4 className="font-medium text-foreground">{issue.title}</h4>
                  {issue.why_it_hurts && (
                    <p className="mt-1 text-sm text-muted-foreground">{issue.why_it_hurts}</p>
                  )}
                  {(issue.fix_steps ?? []).length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground/90">
                      {(issue.fix_steps ?? []).map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
