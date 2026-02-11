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
    priceKey: "agence_monthly",
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
    <div className="relative space-y-8 overflow-hidden py-4 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_50%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.14),transparent_45%)]" />

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-widest text-violet-200">Pricing FyxxLabs</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Choisis ton plan de croissance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Trois offres claires: Create pour lancer, Pro pour scaler, Agence pour opérer plusieurs projets clients.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.title} className={`relative overflow-hidden border-white/10 bg-white/[0.04] backdrop-blur-xl ${plan.popular ? "ring-2 ring-violet-400/40 border-violet-400/40" : ""}`}>
              {plan.popular && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-violet-500 px-3 py-1 text-[10px] font-bold text-white">
                  POPULAIRE
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.bg}`}>
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-lg text-white">{plan.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold tabular-nums">
                  {plan.oneTimePrice ?? plan.monthlyPrice} &euro;
                  <span className="ml-1 text-sm font-normal text-slate-300">{plan.priceLabel}</span>
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="price_key" value={plan.priceKey} />
                  <Button className={`w-full ${plan.popular ? "bg-violet-600 hover:bg-violet-500" : ""}`}>{`Choisir ${plan.title}`}</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300 backdrop-blur-xl">
        <p className="font-semibold text-white">Résumé rapide</p>
        <p className="mt-2">
          Pro: 5 créations/jour (20/mois). Agence: 10 créations/jour (60/mois), support prioritaire et export avancé.
        </p>
      </section>
    </div>
  );
}
