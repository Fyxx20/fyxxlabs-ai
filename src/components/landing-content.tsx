"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  ArrowRight,
  CheckCircle2,
  ChartLine,
  Clock3,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  SearchCheck,
  Rocket,
} from "lucide-react";

export function LandingContent({
  hasSession,
  hasStore,
}: {
  hasSession: boolean;
  hasStore: boolean;
}) {
  const ctaHref = !hasSession ? "/signup" : hasStore ? "/app/dashboard" : "/onboarding";
  const ctaLabel = hasSession && hasStore ? "Tableau de bord" : "Lancer une analyse";
  const ctaSecondaryLabel = "Voir comment ça fonctionne";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "starter" | "pro" | "elite" | "lifetime">("pro");

  const plans = [
    {
      key: "trial" as const,
      title: "Essai gratuit",
      monthly: "Gratuit",
      yearly: "Gratuit",
      benefits: ["3 jours + 1 scan", "Score global et aperçu pages/produits", "Insights principaux visibles"],
      limitations: ["Chatbot désactivé", "Sections avancées partiellement floutées"],
      tone: "border-border bg-card",
    },
    {
      key: "starter" as const,
      title: "Starter",
      monthly: "9,99 € / mois",
      yearly: "99,99 € / an",
      benefits: ["2 scans / jour", "10 messages chatbot / heure", "Dashboard complet"],
      limitations: ["Pas d'illimité", "Pas d'accès avant-première"],
      tone: "border-primary/25 bg-card",
    },
    {
      key: "pro" as const,
      title: "Pro",
      monthly: "19,99 € / mois",
      yearly: "199,99 € / an",
      benefits: ["10 scans / jour", "Chatbot illimité", "Historique et suivi complets"],
      limitations: ["Scans non illimités", "Pas d'accès avant-première"],
      tone: "border-primary/35 bg-primary/5",
      recommended: true,
    },
    {
      key: "elite" as const,
      title: "Elite",
      monthly: "34,99 € / mois",
      yearly: "349,99 € / an",
      benefits: ["Scans illimités", "Chatbot illimité", "Nouveautés en avant-première"],
      limitations: ["—"],
      tone: "border-emerald-500/30 bg-emerald-500/5",
    },
    {
      key: "lifetime" as const,
      title: "Lifetime",
      monthly: "699 € (paiement unique)",
      yearly: "699 € (paiement unique)",
      benefits: ["Accès à vie", "Scans illimités", "Chatbot illimité + avant-première"],
      limitations: ["Offre one-shot"],
      tone: "border-amber-500/35 bg-amber-500/5",
    },
  ];

  const selectedPlanData = plans.find((p) => p.key === selectedPlan) ?? plans[2];
  const selectedPrice = billingCycle === "monthly" ? selectedPlanData.monthly : selectedPlanData.yearly;
  const billingHrefBase = hasSession ? "/app/billing" : "/signup";
  const billingHref =
    selectedPlan === "trial"
      ? ctaHref
      : `${billingHrefBase}?plan=${selectedPlan}&cycle=${selectedPlan === "lifetime" ? "one_time" : billingCycle}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <BrandLogo href="/" />
          <nav className="flex items-center gap-3 md:gap-6">
            <div className="hidden items-center gap-6 md:flex">
              <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Produit
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Fonctionnement
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Tarifs
              </a>
            </div>
            <Link href="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href={ctaHref}>
              <Button>{ctaLabel}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/60 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.08] via-background to-background" />
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                FyxxLabs - Audit e-commerce orienté conversion
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Transformez vos visiteurs en acheteurs.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground md:text-xl">
                FyxxLabs détecte les freins de conversion, priorise les actions à fort impact et vous donne un plan concret pour améliorer votre boutique.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={ctaHref}>
                  <Button size="lg" className="w-full gap-2 text-base sm:w-auto">
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    {ctaSecondaryLabel}
                  </Button>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Résultats en quelques minutes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Données réelles, sans promesses
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SearchCheck className="h-4 w-4 text-primary" />
                  Essai 3 jours + 1 scan
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Score /100 par pilier CRO",
              "Priorité d'action immédiate",
              "Sections avancées et checklist",
              "Historique et suivi de progression",
            ].map((item) => (
              <div key={item} className="rounded-lg border border-border/70 bg-card px-4 py-3 text-sm text-foreground/90">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {[
              {
                icon: ChartLine,
                title: "Score crédible, lisible, actionnable",
                text: "Sous-scores détaillés par thème: confiance, offre, UX, performance, SEO, friction checkout.",
              },
              {
                icon: MessageSquare,
                title: "Coach IA connecté au scan",
                text: "Réponses structurées basées sur vos données réelles, avec plan d'actions priorisé.",
              },
              {
                icon: Rocket,
                title: "Décisions plus rapides",
                text: "Vous savez quoi corriger en premier, au lieu d'empiler des changements au hasard.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/70 bg-card p-6 shadow-sm"
              >
                <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border/60 bg-muted/30 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Comment ca fonctionne</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Un parcours simple: vous lancez, FyxxLabs analyse, vous corrigez les points qui bloquent la vente.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                title: "Connectez votre boutique",
                desc: "URL simple ou connexion plateforme (Shopify/Woo/Presta) selon votre niveau de profondeur.",
                eta: "1-2 minutes",
                details: [
                  "FyxxLabs vérifie le domaine, la structure des pages et les signaux techniques de base.",
                  "Vous choisissez le mode: scan rapide (URL) ou scan connecté (données business).",
                  "Aucun code à installer, onboarding guidé étape par étape.",
                ],
                icon: SearchCheck,
              },
              {
                step: 2,
                title: "Lancez l'analyse",
                desc: "Progression visible 0-100, logs lisibles, extraction des signaux clés de conversion.",
                eta: "2-5 minutes",
                details: [
                  "Crawl des pages importantes: accueil, produits, collections, panier, checkout (si accessible).",
                  "Détection des éléments qui impactent la conversion: confiance, offre, UX, performance, SEO.",
                  "Comparaison des signaux et génération d'un score global + sous-scores.",
                ],
                icon: ChartLine,
              },
              {
                step: 3,
                title: "Executez le plan",
                desc: "Score, priorités, checklist et coach IA pour passer de l'analyse a l'action.",
                eta: "Dès maintenant",
                details: [
                  "Vous recevez les actions classées par impact/effort (quoi corriger en premier).",
                  "Checklist opérationnelle à exécuter avec suivi de progression.",
                  "Le coach IA vous aide à transformer le diagnostic en plan concret sur 7 jours.",
                ],
                icon: MessageSquare,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <item.icon className="h-6 w-6" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary/80">
                  Étape {item.step} · {item.eta}
                </p>
                <p className="mt-4 font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {item.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-4xl rounded-lg border border-border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
            Après le premier scan, vous obtenez un plan d'action priorisé immédiatement exploitable par votre équipe.
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Tarification claire, sans surprise</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Commencez avec l'essai. Montez en puissance selon votre volume d'analyse.
          </p>
          <div className="mx-auto mt-6 flex w-fit rounded-lg border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-md px-3 py-1.5 text-sm ${billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-md px-3 py-1.5 text-sm ${billingCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Annuel
            </button>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan) => {
              const active = selectedPlan === plan.key;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={plan.key}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedPlan(plan.key);
                  }}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`relative cursor-pointer text-left rounded-xl border p-6 shadow-sm transition ${plan.tone} ${active ? "ring-2 ring-primary" : "hover:-translate-y-0.5 hover:shadow-md"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-foreground">{plan.title}</p>
                    {plan.recommended ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        Recommandé
                      </span>
                    ) : active ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Sélectionné
                      </span>
                    ) : null}
                  </div>
                  {plan.key === "trial" && (
                    <p className="mt-1 text-sm text-muted-foreground">3 jours · 1 scan</p>
                  )}
                  {plan.key !== "trial" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {billingCycle === "monthly" || plan.key === "lifetime" ? plan.monthly : plan.yearly}
                    </p>
                  )}
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Ce que tu as</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {plan.benefits.map((b) => (
                        <li key={b}>✔ {b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Ce que tu n'as pas</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {plan.limitations.map((l) => (
                        <li key={l}>✖ {l}</li>
                      ))}
                    </ul>
                  </div>
                  {active && (
                    <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary/40" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mx-auto mt-4 max-w-6xl rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium text-foreground">
              Plan sélectionné: {selectedPlanData.title} - {selectedPrice}
            </p>
            <p className="mt-1 text-muted-foreground">
              Clique sur n'importe quelle carte pour changer instantanément de modèle avant de continuer.
            </p>
          </div>
          <p className="mx-auto mt-4 max-w-xl text-center text-xs text-muted-foreground">
            Annulable à tout moment sur les plans mensuels/annuels.
          </p>
          <Link href={billingHref} className="mx-auto mt-6 block max-w-sm">
            <Button className="w-full" size="lg">
              {selectedPlan === "trial" ? "Commencer l'essai gratuit" : `Choisir ${selectedPlanData.title}`}
            </Button>
          </Link>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {selectedPlan === "trial"
              ? "Tu peux démarrer gratuitement en quelques clics."
              : hasSession
                ? "Tu seras redirigé vers la facturation."
                : "Crée ton compte pour activer ce plan."}
          </p>
        </div>
      </section>

      <section id="faq" className="border-t border-border/60 bg-muted/20 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">FAQ</h2>
          <div className="mx-auto mt-12 max-w-2xl space-y-6">
            {[
              {
                q: "Mon site n'est pas sur Shopify, ça fonctionne ?",
                a: "Oui. FyxxLabs analyse n'importe quelle boutique via son URL (Shopify, site sur mesure, etc.).",
              },
              {
                q: "Que fait l'analyse exactement ?",
                a: "Elle charge la page d'accueil et les pages clés (produit, panier, etc.), extrait le contenu visible et les éléments importants. Un score et des recommandations sont générés à partir de ces données.",
              },
              {
                q: "Puis-je annuler à tout moment ?",
                a: "Oui. Vous gérez votre abonnement depuis Paramètres ; l'annulation prend effet en fin de période.",
              },
              {
                q: "Le coach IA invente-t-il des chiffres ?",
                a: "Non. FyxxLabs est conçu pour s'appuyer sur les données détectées et expliciter les hypothèses.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4"
              >
                <p className="font-medium text-foreground">{faq.q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-10">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 md:flex-row md:justify-between">
          <BrandLogo href="/" />
          <Link href={ctaHref}>
            <Button variant="outline" size="sm">
              {ctaLabel}
            </Button>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/mentions-legales" className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              CGU
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Confidentialité
            </Link>
            <a href="mailto:contact@storepilot.ai" className="hover:text-foreground">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
