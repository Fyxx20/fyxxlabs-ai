"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, Loader2, ArrowLeft, Sparkles, Target, DollarSign, Users,
  ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Flame, ShieldAlert,
} from "lucide-react";
import Link from "next/link";

const NICHES = [
  "Toutes niches", "Mode & Accessoires", "Tech & Gadgets", "Maison & Déco",
  "Beauté & Soins", "Sport & Fitness", "Animaux", "Bébé & Enfants", "Auto & Moto",
];

const SEASONS = [
  { id: "all", label: "Toute saison" },
  { id: "spring", label: "Printemps" },
  { id: "summer", label: "Été" },
  { id: "fall", label: "Automne" },
  { id: "winter", label: "Hiver" },
];

interface ProductIdea {
  name: string;
  category: string;
  description: string;
  why_winning: string;
  estimated_buy_price: string;
  suggested_sell_price: string;
  estimated_margin: string;
  target_audience: string;
  marketing_angle: string;
  competition_level: "low" | "medium" | "high";
  trend_score: number;
  sourcing_tips: string;
  ad_hook: string;
}

const compLevelConfig = {
  low: { label: "Faible", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  medium: { label: "Moyenne", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  high: { label: "Élevée", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
};

export function WinningProductsClient() {
  const [step, setStep] = useState<"form" | "searching" | "results">("form");
  const [niche, setNiche] = useState("Toutes niches");
  const [budget, setBudget] = useState("");
  const [targetMarket, setTargetMarket] = useState("France / Europe");
  const [season, setSeason] = useState("all");
  const [products, setProducts] = useState<ProductIdea[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [avoidProducts, setAvoidProducts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const search = async () => {
    setStep("searching");
    setError(null);
    try {
      const res = await fetch("/api/store/winning-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, budget, targetMarket, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setProducts(data.products ?? []);
      setInsights(data.market_insights ?? []);
      setAvoidProducts(data.avoid_products ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("form");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            Winning Products
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trouvez les produits gagnants du moment pour votre boutique
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="py-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {step === "form" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-8 md:p-12">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Flame className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Trouvez votre prochain best-seller</h2>
              <p className="text-muted-foreground max-w-lg">
                L&apos;IA analyse les tendances du marché et vous suggère des produits à fort potentiel
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Niche</label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <button
                      key={n}
                      onClick={() => setNiche(n)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        niche === n ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Budget de départ</label>
                  <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: 500€" className="bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Marché cible</label>
                  <Input value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} placeholder="France / Europe" className="bg-background" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Saison</label>
                <div className="flex gap-2">
                  {SEASONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSeason(s.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        season === s.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={search} size="lg" className="w-full gap-2">
                <Sparkles className="h-5 w-5" /> Trouver des produits gagnants
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "searching" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Recherche en cours&hellip;</p>
              <p className="text-sm text-muted-foreground mt-1">Analyse des tendances et des opportunités du marché</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && (
        <>
          {/* Products */}
          <div className="space-y-4">
            {products.map((p, i) => {
              const compCfg = compLevelConfig[p.competition_level];
              return (
                <Card key={i} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                          {i + 1}
                        </div>
                        <div>
                          <CardTitle className="text-base">{p.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                            <div className="flex items-center gap-1">
                              <Flame className={`h-3 w-3 ${p.trend_score >= 70 ? "text-orange-500" : "text-muted-foreground"}`} />
                              <span className="text-xs font-medium">{p.trend_score}/100</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{p.estimated_margin}</Badge>
                        {expandedIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedIdx === i && (
                    <CardContent className="border-t pt-4 space-y-4">
                      <p className="text-sm text-muted-foreground">{p.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-lg border p-3 text-center">
                          <DollarSign className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Prix d&apos;achat</p>
                          <p className="text-sm font-bold">{p.estimated_buy_price}</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <DollarSign className="h-4 w-4 text-primary mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Prix de vente</p>
                          <p className="text-sm font-bold text-primary">{p.suggested_sell_price}</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Audience</p>
                          <p className="text-xs font-medium">{p.target_audience}</p>
                        </div>
                        <div className={`rounded-lg border p-3 text-center ${compCfg.bg}`}>
                          <Target className="h-4 w-4 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Concurrence</p>
                          <p className={`text-sm font-bold ${compCfg.color}`}>{compCfg.label}</p>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-xs font-medium text-green-800 dark:text-green-400 mb-1">✨ Pourquoi c&apos;est un winning product</p>
                        <p className="text-xs text-green-700 dark:text-green-300">{p.why_winning}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-medium mb-1">🎯 Angle marketing</p>
                          <p className="text-xs text-muted-foreground">{p.marketing_angle}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-medium mb-1">📦 Sourcing</p>
                          <p className="text-xs text-muted-foreground">{p.sourcing_tips}</p>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                        <p className="text-xs font-medium mb-1">🎣 Hook publicitaire</p>
                        <p className="text-sm font-medium italic">&quot;{p.ad_hook}&quot;</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Insights & Avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" /> Insights marché
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {insights.map((ins, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-amber-500 mt-0.5">→</span> {ins}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {avoidProducts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-4 w-4" /> Produits à éviter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {avoidProducts.map((a, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-red-500 mt-0.5">✗</span> {a}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <Button variant="outline" onClick={() => { setStep("form"); setProducts([]); }} className="w-full">
            Nouvelle recherche
          </Button>
        </>
      )}
    </div>
  );
}
