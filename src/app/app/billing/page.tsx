import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Crown,
  Sparkles,
  Building2,
} from "lucide-react";

const PLANS = [
  {
    title: "Create",
    oneTimePrice: "29",
    priceKey: "create_one_time",
    icon: Sparkles,
    features: [
      "Génération boutique IA",
      "Pages légales auto + branding",
      "Export Shopify",
    ],
    popular: false,
    priceLabel: "paiement unique",
    bg: "bg-gradient-to-br from-indigo-500 to-violet-600",
    color: "text-white",
  },
  {
    title: "Pro",
    monthlyPrice: "39",
    priceKey: "pro_monthly",
    icon: Crown,
    features: [
      "Scan Shopify illimité + score sur 100",
      "Winner Finder + recommandations UX/conversion",
      "5 créations/jour (max 20/mois)",
      "IA illimitée + dashboard performance",
    ],
    popular: true,
    priceLabel: "/mois",
    bg: "bg-gradient-to-br from-violet-600 to-fuchsia-600",
    color: "text-white",
  },
  {
    title: "Agence",
    monthlyPrice: "79",
    priceKey: "elite_monthly",
    icon: Building2,
    features: [
      "Tous les outils du plan Pro",
      "10 créations/jour (max 60/mois)",
      "Export Shopify avancé multi-boutique",
      "Support prioritaire + rapports PDF",
    ],
    popular: false,
    priceLabel: "/mois",
    bg: "bg-gradient-to-br from-cyan-500 to-blue-600",
    color: "text-white",
  },
];

export default function BillingPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.title} className={`relative overflow-hidden border-border/60 ${plan.popular ? "ring-2 ring-primary/30 border-primary/30" : ""}`}>
              {plan.popular && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                  POPULAIRE
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
                <p className="text-3xl font-bold tabular-nums">
                  {plan.oneTimePrice ?? plan.monthlyPrice} &euro;
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{plan.priceLabel}</span>
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="price_key" value={plan.priceKey} />
                  <Button className="w-full">{`Choisir ${plan.title}`}</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
