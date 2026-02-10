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
  // Return full list of improvement suggestions for each criterion
  const allIssues: Record<CriterionKey, IssueLike[]> = {
    conversion: [
      {
        id: "conv-1",
        title: "CTA principal peu visible ou mal positionné",
        why_it_hurts: "Si le bouton d'achat n'est pas immédiatement visible, les visiteurs quittent sans agir.",
        fix_steps: [
          "Placer le CTA au-dessus du fold sur toutes les pages produit.",
          "Utiliser une couleur contrastée qui se démarque du reste de la page.",
          "Tester une formulation orientée action : « Ajouter au panier » vs « Je commande ».",
        ],
      },
      {
        id: "conv-2",
        title: "Trop d'étapes dans le tunnel d'achat",
        why_it_hurts: "Chaque étape supplémentaire perd 10-20 % des acheteurs potentiels.",
        fix_steps: [
          "Réduire le checkout à 2-3 étapes maximum.",
          "Proposer le guest checkout (achat sans compte).",
          "Ajouter un indicateur de progression pour rassurer l'utilisateur.",
        ],
      },
      {
        id: "conv-3",
        title: "Page panier peu optimisée",
        why_it_hurts: "Le panier est le dernier point de friction avant la conversion.",
        fix_steps: [
          "Afficher un résumé clair : produits, quantités, prix total.",
          "Ajouter des éléments de réassurance (livraison, retours, paiement sécurisé).",
          "Proposer des suggestions complémentaires (cross-sell) pertinentes.",
        ],
      },
      {
        id: "conv-4",
        title: "Absence de micro-engagements",
        why_it_hurts: "Sans interactions progressives, le visiteur n'entre pas dans un parcours d'achat.",
        fix_steps: [
          "Ajouter un bouton « Ajouter à la wishlist » ou « Comparer ».",
          "Permettre la sélection de taille/couleur directement depuis la grille.",
          "Afficher le stock restant ou un compte à rebours pour créer l'urgence.",
        ],
      },
      {
        id: "conv-5",
        title: "Formulaire de paiement non optimisé",
        why_it_hurts: "Un formulaire long ou complexe provoque des abandons de panier.",
        fix_steps: [
          "Activer l'auto-complétion des champs (adresse, carte).",
          "Proposer plusieurs moyens de paiement (CB, PayPal, Apple Pay).",
          "Éliminer les champs non essentiels du formulaire.",
        ],
      },
      {
        id: "conv-6",
        title: "Pas de stratégie de récupération d'abandon",
        why_it_hurts: "70 % des paniers sont abandonnés — sans relance, ces ventes sont perdues.",
        fix_steps: [
          "Mettre en place des emails de relance panier (H+1, J+1, J+3).",
          "Afficher une pop-up d'intention de sortie avec une offre.",
          "Sauvegarder le panier pour les visiteurs qui reviennent.",
        ],
      },
    ],
    trust: [
      {
        id: "trust-1",
        title: "Avis clients absents ou peu visibles",
        why_it_hurts: "92 % des consommateurs lisent les avis avant d'acheter.",
        fix_steps: [
          "Intégrer un widget d'avis (Trustpilot, Google Reviews, Judge.me).",
          "Afficher les avis directement sur les fiches produit.",
          "Mettre en avant les avis récents et vérifiés.",
        ],
      },
      {
        id: "trust-2",
        title: "Badges de confiance absents",
        why_it_hurts: "Sans badges de sécurité, les visiteurs hésitent à entrer leurs coordonnées.",
        fix_steps: [
          "Ajouter des badges « Paiement sécurisé », « SSL », « Satisfait ou remboursé ».",
          "Les placer près du bouton d'achat et dans le footer.",
          "Utiliser les logos des moyens de paiement acceptés (Visa, Mastercard, PayPal).",
        ],
      },
      {
        id: "trust-3",
        title: "Politique de retour floue ou cachée",
        why_it_hurts: "Une politique de retour claire réduit l'anxiété d'achat de 67 %.",
        fix_steps: [
          "Afficher « Retours gratuits sous 30 jours » sur chaque fiche produit.",
          "Créer une page dédiée aux retours facilement accessible.",
          "Simplifier le processus de retour avec une étiquette pré-payée.",
        ],
      },
      {
        id: "trust-4",
        title: "Informations de contact insuffisantes",
        why_it_hurts: "L'absence de coordonnées donne une impression de site non fiable.",
        fix_steps: [
          "Afficher email, téléphone et adresse dans le header ou footer.",
          "Ajouter un chat en direct ou chatbot pour les questions rapides.",
          "Créer une page « À propos » avec l'équipe et l'histoire de la marque.",
        ],
      },
      {
        id: "trust-5",
        title: "Délais de livraison non communiqués",
        why_it_hurts: "Les clients veulent savoir quand ils recevront leur commande avant d'acheter.",
        fix_steps: [
          "Afficher les délais estimés sur chaque fiche produit.",
          "Proposer le suivi de commande en temps réel.",
          "Offrir la livraison gratuite au-dessus d'un seuil (ex: 50 €).",
        ],
      },
      {
        id: "trust-6",
        title: "Pas de preuves sociales",
        why_it_hurts: "Les visiteurs font davantage confiance aux marques validées par d'autres.",
        fix_steps: [
          "Afficher le nombre de clients satisfaits ou de commandes.",
          "Intégrer les logos presse / partenaires si applicable.",
          "Montrer les photos clients (UGC) sur les fiches produit.",
        ],
      },
    ],
    offer: [
      {
        id: "offer-1",
        title: "Proposition de valeur peu claire",
        why_it_hurts: "Si le visiteur ne comprend pas pourquoi acheter chez vous, il part chez un concurrent.",
        fix_steps: [
          "Rédiger un H1 + sous-titre orienté bénéfice client en haut de page.",
          "Mettre en avant 3 avantages différenciants (livraison, qualité, prix).",
          "Comparer vos avantages vs la concurrence directement sur la page.",
        ],
      },
      {
        id: "offer-2",
        title: "Pricing confus ou mal structuré",
        why_it_hurts: "Un prix mal présenté crée de la confusion et freine l'achat.",
        fix_steps: [
          "Afficher le prix clairement près du titre et du CTA.",
          "Utiliser l'ancrage de prix (prix barré + économie visible).",
          "Proposer des packs ou bundles pour augmenter le panier moyen.",
        ],
      },
      {
        id: "offer-3",
        title: "Descriptions produit insuffisantes",
        why_it_hurts: "Sans description détaillée, le client ne sait pas ce qu'il achète.",
        fix_steps: [
          "Rédiger des descriptions orientées bénéfices (pas juste des caractéristiques).",
          "Structurer avec des puces et sous-titres pour la lisibilité.",
          "Ajouter les dimensions, matériaux et instructions d'entretien.",
        ],
      },
      {
        id: "offer-4",
        title: "Images produit de faible qualité",
        why_it_hurts: "L'image est le premier critère de décision en e-commerce.",
        fix_steps: [
          "Proposer au moins 4-5 images par produit (angles différents).",
          "Ajouter un zoom et une vue 360° si possible.",
          "Inclure des photos lifestyle montrant le produit en contexte.",
        ],
      },
      {
        id: "offer-5",
        title: "Options produit mal présentées",
        why_it_hurts: "Si les variantes (taille, couleur) sont confuses, le client hésite.",
        fix_steps: [
          "Utiliser des swatches visuels pour les couleurs.",
          "Afficher un guide des tailles accessible en 1 clic.",
          "Pré-sélectionner la variante la plus populaire.",
        ],
      },
      {
        id: "offer-6",
        title: "Pas de sentiment d'urgence ou de rareté",
        why_it_hurts: "Sans motivation à agir maintenant, le visiteur reporte son achat.",
        fix_steps: [
          "Afficher le stock restant (« Plus que 3 en stock »).",
          "Proposer des offres limitées dans le temps.",
          "Ajouter un bandeau promotionnel pour les nouvelles offres.",
        ],
      },
    ],
    performance: [
      {
        id: "perf-1",
        title: "Images non optimisées",
        why_it_hurts: "Les images lourdes ralentissent le chargement et augmentent le taux de rebond.",
        fix_steps: [
          "Convertir toutes les images en WebP ou AVIF.",
          "Redimensionner les images à la taille d'affichage maximale.",
          "Activer le lazy loading pour les images sous le fold.",
        ],
      },
      {
        id: "perf-2",
        title: "Trop de scripts tiers",
        why_it_hurts: "Chaque script supplémentaire ajoute du temps de chargement et bloque le rendu.",
        fix_steps: [
          "Auditer et supprimer les scripts inutilisés (analytics en double, widgets).",
          "Charger les scripts non-critiques en async ou defer.",
          "Utiliser un tag manager pour contrôler le chargement.",
        ],
      },
      {
        id: "perf-3",
        title: "Core Web Vitals sous les seuils",
        why_it_hurts: "Google pénalise les sites avec de mauvais LCP, CLS ou FID dans les résultats de recherche.",
        fix_steps: [
          "Viser un LCP < 2.5s en optimisant l'image principale.",
          "Réduire le CLS en dimensionnant les images et polices.",
          "Améliorer le FID en réduisant le JavaScript bloquant.",
        ],
      },
      {
        id: "perf-4",
        title: "Expérience mobile dégradée",
        why_it_hurts: "60-70 % du trafic e-commerce est mobile — un site lent sur mobile perd des ventes.",
        fix_steps: [
          "Tester avec Google PageSpeed Insights en mode mobile.",
          "Vérifier que les boutons sont assez grands (48x48px minimum).",
          "S'assurer que le texte est lisible sans zoomer.",
        ],
      },
      {
        id: "perf-5",
        title: "Pas de mise en cache efficace",
        why_it_hurts: "Sans cache, chaque visite recharge tous les assets, ralentissant l'expérience.",
        fix_steps: [
          "Configurer le cache navigateur pour les assets statiques (images, CSS, JS).",
          "Utiliser un CDN pour servir les ressources au plus proche de l'utilisateur.",
          "Activer la compression gzip/brotli sur le serveur.",
        ],
      },
      {
        id: "perf-6",
        title: "Polices web non optimisées",
        why_it_hurts: "Le chargement de polices personnalisées peut bloquer l'affichage du texte.",
        fix_steps: [
          "Utiliser font-display: swap pour afficher le texte immédiatement.",
          "Limiter le nombre de variantes de police chargées.",
          "Pré-charger les polices critiques avec <link rel='preload'>.",
        ],
      },
    ],
    traffic: [
      {
        id: "traffic-1",
        title: "Balises title et meta description mal optimisées",
        why_it_hurts: "Ce sont les premiers éléments vus dans Google — ils déterminent le taux de clic.",
        fix_steps: [
          "Rédiger des title uniques de 50-60 caractères avec le mot-clé principal.",
          "Écrire des meta descriptions engageantes de 150-160 caractères.",
          "Inclure un appel à l'action dans la meta description.",
        ],
      },
      {
        id: "traffic-2",
        title: "Structure Hn désorganisée",
        why_it_hurts: "Une hiérarchie de titres claire aide Google à comprendre le contenu de la page.",
        fix_steps: [
          "Vérifier qu'il y a un seul H1 par page contenant le mot-clé principal.",
          "Structurer le contenu avec des H2/H3 logiques.",
          "Inclure les mots-clés secondaires dans les sous-titres.",
        ],
      },
      {
        id: "traffic-3",
        title: "Maillage interne faible",
        why_it_hurts: "Sans liens internes, Google et vos visiteurs ne découvrent pas vos pages clés.",
        fix_steps: [
          "Lier les pages catégories depuis la homepage.",
          "Ajouter des produits similaires / complémentaires sur chaque fiche.",
          "Créer un fil d'Ariane (breadcrumb) sur toutes les pages.",
        ],
      },
      {
        id: "traffic-4",
        title: "Pas de stratégie de contenu SEO",
        why_it_hurts: "Sans contenu informatif, vous ne captez pas le trafic de recherche informationnel.",
        fix_steps: [
          "Créer un blog avec des guides d'achat et comparatifs.",
          "Répondre aux questions fréquentes (FAQ structurée en JSON-LD).",
          "Publier régulièrement pour montrer la fraîcheur du site.",
        ],
      },
      {
        id: "traffic-5",
        title: "Données structurées manquantes",
        why_it_hurts: "Les rich snippets (étoiles, prix, stock) augmentent le CTR de 20-30 % dans Google.",
        fix_steps: [
          "Ajouter du JSON-LD Product sur chaque fiche produit.",
          "Implémenter BreadcrumbList pour le fil d'Ariane.",
          "Tester les données structurées avec l'outil de test Google.",
        ],
      },
      {
        id: "traffic-6",
        title: "Pas de stratégie d'acquisition multicanal",
        why_it_hurts: "Dépendre d'un seul canal de trafic est risqué pour la pérennité.",
        fix_steps: [
          "Développer une présence sur les réseaux sociaux pertinents.",
          "Mettre en place des campagnes email (newsletter, automation).",
          "Considérer Google Ads et/ou Meta Ads pour le trafic payant.",
        ],
      },
    ],
  };

  const issues = allIssues[key] ?? [];
  
  // For high scores, filter to show fewer issues (3-4 tips)
  if (score >= 70) {
    return issues.slice(0, 3);
  }
  // For medium scores, show 5 issues
  if (score >= 40) {
    return issues.slice(0, 5);
  }
  // For low scores, show all 6 issues
  return issues;
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
    ? (() => {
        const aiIssues = issuesByCriterion[selected];
        const fallback = fallbackByScore(selected, selectedScore);
        if (aiIssues.length >= 3) return aiIssues;
        // Merge: AI issues first, then fill with fallback to show at least 3-6
        const aiIds = new Set(aiIssues.map((i) => i.title.toLowerCase().slice(0, 30)));
        const extras = fallback.filter((f) => !aiIds.has(f.title.toLowerCase().slice(0, 30)));
        return [...aiIssues, ...extras].slice(0, 6);
      })()
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
