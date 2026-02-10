import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  CreditCard,
  CheckCircle2,
  Crown,
  Zap,
  Sparkles,
  Clock,
  ExternalLink,
  Star,
} from "lucide-react";

const PLANS = [
  {
    title: "Starter",
    monthlyPrice: "9,99",
    yearlyPrice: "99,99",
    yearlyCaption: "2 mois offerts",
    monthlyKey: "starter_monthly",
    yearlyKey: "starter_yearly",
    icon: Zap,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    features: [
      "2 scans / jour",
      "10 messages chatbot / heure",
      "Tableau de bord complet",
    ],
  },
  {
    title: "Pro",
    monthlyPrice: "19,99",
    yearlyPrice: "199,99",
    yearlyCaption: "2 mois offerts",
    monthlyKey: "pro_monthly",
    yearlyKey: "pro_yearly",
    icon: Crown,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    popular: true,
    features: [
      "10 scans / jour",
      "Chatbot illimit\u00e9",
      "Tableau de bord complet",
    ],
  },
  {
    title: "Elite",
    monthlyPrice: "34,99",
    yearlyPrice: "349,99",
    yearlyCaption: "2 mois offerts",
    monthlyKey: "elite_monthly",
    yearlyKey: "elite_yearly",
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    features: [
      "Scans illimit\u00e9s",
      "Chatbot illimit\u00e9",
      "Acc\u00e8s nouveaut\u00e9s en avant-premi\u00e8re",
    ],
  },
];

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_started_at, trial_ends_at, scans_used")
    .eq("user_id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, trial_start, trial_end, plan, current_period_end, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  const entitlements = getEntitlements(profile ?? null, subscription ?? null);
  const trialEnd = entitlements.trialEndsAt;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {entitlements.isLifetime
            ? "Acc\u00e8s \u00e0 vie \u2014 aucune facturation."
            : "G\u00e9rez votre abonnement et choisissez le plan adapt\u00e9 \u00e0 vos besoins."}
        </p>
      </div>

      {/* Lifetime badge */}
      {entitlements.isLifetime && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <Star className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Acc\u00e8s \u00e0 vie
              </p>
              <p className="text-sm text-muted-foreground">
                Scans et chatbot illimit\u00e9s, acc\u00e8s \u00e0 toutes les fonctionnalit\u00e9s.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current status */}
      {!entitlements.isLifetime && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Statut</p>
                {entitlements.isPro && (
                  <Badge variant="success" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Actif
                  </Badge>
                )}
                {entitlements.isTrialActive && (
                  <Badge variant="warning" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    Essai
                  </Badge>
                )}
                {!entitlements.isPro && !entitlements.isTrialActive && (
                  <Badge variant="secondary" className="text-xs">Gratuit</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {entitlements.isPro
                  ? `Abonn\u00e9 \u2014 prochaine facturation le ${periodEnd ? formatDate(periodEnd) : "N/A"}`
                  : entitlements.isTrialActive && trialEnd
                    ? `Essai actif \u2014 ${Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))} jours restants`
                    : "Essai termin\u00e9 \u2014 passez \u00e0 un abonnement pour tout d\u00e9bloquer."}
              </p>
            </div>
            {subscription?.stripe_customer_id && (
              <form action="/api/billing/portal" method="POST">
                <Button type="submit" variant="outline" size="sm" className="shrink-0">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Portail Stripe
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans grid */}
      {!entitlements.isLifetime && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {entitlements.isPro ? "Changer de plan" : "Choisir un abonnement"}
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card
                  key={plan.title}
                  className={`relative overflow-hidden border-border/60 ${
                    plan.popular ? "ring-2 ring-primary/30 border-primary/30" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                      POPULAIRE
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.bg}`}
                      >
                        <Icon className={`h-5 w-5 ${plan.color}`} />
                      </div>
                      <CardTitle className="text-lg">{plan.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Pricing */}
                    <div>
                      <p className="text-3xl font-bold tabular-nums">
                        {plan.monthlyPrice} &euro;
                        <span className="text-sm font-normal text-muted-foreground">
                          /mois
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ou {plan.yearlyPrice} &euro;/an &mdash; {plan.yearlyCaption}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="flex gap-2 pt-2">
                      <form
                        action="/api/billing/checkout"
                        method="POST"
                        className="flex-1"
                      >
                        <input
                          type="hidden"
                          name="price_key"
                          value={plan.monthlyKey}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                        >
                          Mensuel
                        </Button>
                      </form>
                      <form
                        action="/api/billing/checkout"
                        method="POST"
                        className="flex-1"
                      >
                        <input
                          type="hidden"
                          name="price_key"
                          value={plan.yearlyKey}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full"
                          variant="outline"
                        >
                          Annuel
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Lifetime teaser */}
          <Card className="mt-4 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <Star className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  Lifetime &mdash; 699 &euro;
                </p>
                <p className="text-sm text-muted-foreground">
                  Acc\u00e8s illimit\u00e9 \u00e0 vie. Contactez le support pour activer cette offre.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
