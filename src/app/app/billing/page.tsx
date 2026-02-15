import {
  CheckCircle2,
  Crown,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLANS = [
  {
    title: "CREATE",
    oneTimePrice: "14,99",
    oldPrice: "29",
    priceKey: "create_one_time",
    icon: Sparkles,
    features: [
      "1 boutique complète générée par IA",
      "Fiche produit optimisée + branding auto",
      "Pages légales (CGV, RGPD, cookies) + FAQ",
      "Export Shopify prêt + SEO de base",
    ],
    popular: true,
    bg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    color: "text-white",
    cta: "Lancer CREATE",
    billing: "paiement unique",
  },
  {
    title: "PRO",
    oneTimePrice: "39",
    priceKey: "pro_monthly",
    icon: Crown,
    features: [
      "5 créations / jour (max 20 / mois)",
      "Scan illimité + IA illimitée",
      "Winner finder + analyse concurrentielle",
      "Optimisation conversion + dashboard performance",
    ],
    popular: false,
    bg: "bg-gradient-to-br from-green-500 to-teal-600",
    color: "text-white",
    cta: "Choisir PRO",
    billing: "/mois",
  },
  {
    title: "AGENCE",
    oneTimePrice: "79",
    priceKey: "elite_monthly",
    icon: Zap,
    features: [
      "10 créations / jour (max 60 / mois)",
      "Export avancé",
      "Support prioritaire",
      "Gestion multi-projets + rapports avancés",
    ],
    popular: false,
    bg: "bg-gradient-to-br from-purple-500 to-pink-600",
    color: "text-white",
    cta: "Choisir AGENCE",
    billing: "/mois",
  },
];

export default function BillingPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Tarifs FyxxLabs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          CREATE en offre de lancement et abonnements PRO / AGENCE.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.title} className={`relative overflow-hidden border-border/60 ${plan.popular ? "ring-2 ring-primary/30 border-primary/30" : ""}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  OFFRE FONDATEUR
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.bg}`}>
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-lg">{plan.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold tabular-nums">
                    {plan.oneTimePrice} &euro;
                    <span className="text-sm font-normal text-muted-foreground">{plan.billing}</span>
                  </p>
                  {plan.oldPrice ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through">{plan.oldPrice} &euro;</span> prix public
                    </p>
                  ) : null}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <form action="/api/billing/checkout" method="POST">
                  <input type="hidden" name="price_key" value={plan.priceKey} />
                  <Button type="submit" className="w-full">
                    {plan.cta}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
