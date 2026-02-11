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
    title: "Create",
    oneTimePrice: "19",
    priceKey: "create_one_time",
    icon: Sparkles,
    features: [
      "Création de votre site web",
      "Personnalisation de votre site",
      "Support technique",
    ],
    popular: true,
    monthlyPrice: 19,
    bg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    color: "text-white",
  },
  {
    title: "Pro",
    oneTimePrice: "49",
    priceKey: "pro_one_time",
    icon: Crown,
    features: [
      "Création de votre site web",
      "Personnalisation de votre site",
      "Support technique",
    ],
    popular: false,
    monthlyPrice: 49,
    bg: "bg-gradient-to-br from-green-500 to-teal-600",
    color: "text-white",
  },
  {
    title: "Enterprise",
    oneTimePrice: "99",
    priceKey: "enterprise_one_time",
    icon: Zap,
    features: [
      "Création de votre site web",
      "Personnalisation de votre site",
      "Support technique",
    ],
    popular: false,
    monthlyPrice: 99,
    bg: "bg-gradient-to-br from-purple-500 to-pink-600",
    color: "text-white",
  },
];

export default function BillingPage() {
  // Replace with your actual entitlements logic
  // For now, show all plans
  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.title} className={`relative overflow-hidden border-border/60 ${plan.popular ? "ring-2 ring-primary/30 border-primary/30" : ""}`}>
              return (
                <div className="container mx-auto py-10">
                  <div className="grid gap-4 lg:grid-cols-3">
                    {PLANS.map((plan) => {
                      const Icon = plan.icon;
                      return (
                        <Card key={plan.title} className={`relative overflow-hidden border-border/60 ${plan.popular ? "ring-2 ring-primary/30 border-primary/30" : ""}`}>
                          {plan.popular && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
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
                            {/* Pricing */}
                            <div>
                              <p className="text-3xl font-bold tabular-nums">
                                {plan.monthlyPrice} &euro;<span className="text-sm font-normal text-muted-foreground">/mois</span>
                              </p>
                            </div>
                            {/* Features */}
                            <ul className="space-y-2">
                              {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            {/* CTA */}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            </Card>
          );
        })}
      </div>
    </div>
  );
}
