import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CreditCard, CheckCircle2 } from "lucide-react";

const PLANS = [
  {
    title: "Starter",
    monthlyPrice: "9,99 € / mois",
    yearlyPrice: "99,99 € / an",
    yearlyCaption: "2 mois offerts",
    monthlyKey: "starter_monthly",
    yearlyKey: "starter_yearly",
    features: ["2 scans / jour", "10 messages chatbot / heure", "Tableau de bord complet"],
  },
  {
    title: "Pro",
    monthlyPrice: "19,99 € / mois",
    yearlyPrice: "199,99 € / an",
    yearlyCaption: "2 mois offerts",
    monthlyKey: "pro_monthly",
    yearlyKey: "pro_yearly",
    features: ["10 scans / jour", "Chatbot illimité", "Tableau de bord complet"],
  },
  {
    title: "Elite",
    monthlyPrice: "34,99 € / mois",
    yearlyPrice: "349,99 € / an",
    yearlyCaption: "2 mois offerts",
    monthlyKey: "elite_monthly",
    yearlyKey: "elite_yearly",
    features: ["Scans illimités", "Chatbot illimité", "Accès nouveautés en avant-première"],
  },
] as const;

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Facturation
        </h1>
        <p className="text-muted-foreground">
          {entitlements.isLifetime
            ? "Accès à vie — aucune facturation."
            : "Essai gratuit 3 jours (1 scan), puis abonnement selon ton volume."}
        </p>
      </div>

      {entitlements.isLifetime && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Lifetime access
            </CardTitle>
            <CardDescription>
              Accès illimité aux scans, au coach IA et à l’historique. Aucune page pricing ni facturation.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!entitlements.isLifetime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Statut
            </CardTitle>
            <CardDescription>
              {entitlements.isPro
                ? "Tu es abonné. Tu peux gérer ton abonnement ci-dessous."
                : entitlements.isTrialActive
                  ? "Essai actif: 1 scan total, chatbot désactivé, sections avancées partiellement floutées."
                  : "Essai terminé. Passe sur une version supérieure pour débloquer toutes les analyses et le chatbot."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entitlements.isTrialActive && trialEnd && (
              <p className="text-sm">
                <strong>Jours restants :</strong>{" "}
                {Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))}{" "}
                (jusqu’au {formatDate(trialEnd)})
              </p>
            )}
            {entitlements.isPro && periodEnd && (
              <p className="text-sm">
                <strong>Prochaine facturation :</strong> {formatDate(periodEnd)}
              </p>
            )}
            {entitlements.isPro && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Abonnement actif
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {!entitlements.isLifetime && (
        <Card>
          <CardHeader>
            <CardTitle>Gérer mon abonnement</CardTitle>
            <CardDescription>
              Modifie ton moyen de paiement, annule ou consulte tes factures via Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <form action="/api/billing/portal" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={!subscription?.stripe_customer_id}
                >
                  Changer moyen de paiement
                </Button>
              </form>
              <form action="/api/billing/portal" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={!subscription?.stripe_customer_id}
                >
                  Annuler l'abonnement
                </Button>
              </form>
              <form action="/api/billing/portal" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={!subscription?.stripe_customer_id}
                >
                  Voir les factures
                </Button>
              </form>
            </div>
            {subscription?.stripe_customer_id ? (
              <p className="text-xs text-muted-foreground">
                Toutes ces actions sont sécurisées et gérées via ton portail client Stripe.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Le portail Stripe n'est pas encore lié à ce compte. Finalise un abonnement ou contacte le support.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!entitlements.isLifetime && (
        <Card>
          <CardHeader>
            <CardTitle>{entitlements.isPro ? "Changer de plan" : "Choisir un abonnement"}</CardTitle>
            <CardDescription>
              Tu gardes un aperçu utile en gratuit, puis tu débloques progressivement la puissance FyxxLabs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div key={plan.title} className="rounded-lg border border-border p-4">
                  <p className="font-semibold">{plan.title}</p>
                  <p className="mt-2 text-sm font-medium">{plan.monthlyPrice}</p>
                  <p className="text-xs text-muted-foreground">{plan.yearlyPrice} - {plan.yearlyCaption}</p>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-2">
                    <form action="/api/billing/checkout" method="POST" className="flex-1">
                      <input type="hidden" name="price_key" value={plan.monthlyKey} />
                      <Button type="submit" size="sm" className="w-full">
                        Mensuel
                      </Button>
                    </form>
                    <form action="/api/billing/checkout" method="POST" className="flex-1">
                      <input type="hidden" name="price_key" value={plan.yearlyKey} />
                      <Button type="submit" size="sm" variant="outline" className="w-full">
                        Annuel
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="font-semibold">Lifetime - 699 €</p>
              <p className="text-sm text-muted-foreground">
                Scans et chatbot illimités, accès à vie, nouveautés en avant-première.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Offre activable manuellement (support/admin) pour éviter les erreurs de facturation unique.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
