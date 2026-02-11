"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Loader2, ArrowLeft, Eye, Shield, TrendingUp, AlertTriangle,
  CheckCircle, Target, ChevronDown, ChevronUp, Globe,
} from "lucide-react";
import Link from "next/link";

interface CategoryAnalysis {
  name: string;
  score: number;
  analysis: string;
  recommendations: string[];
}

interface SpyResult {
  store_name: string;
  overall_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  categories: CategoryAnalysis[];
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  const bg = score >= 70 ? "bg-green-50 dark:bg-green-950/30" : score >= 40 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
  return (
    <div className={`h-20 w-20 rounded-full ${bg} flex items-center justify-center`}>
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

export function CompetitorSpyClient() {
  const [step, setStep] = useState<"form" | "analyzing" | "results">("form");
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [result, setResult] = useState<SpyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<number | null>(null);

  const analyze = async () => {
    if (!url.trim()) return;
    setStep("analyzing");
    setError(null);
    try {
      const res = await fetch("/api/store/competitor-spy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setResult(data);
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
            <Eye className="h-6 w-6 text-primary" />
            Competitor Spy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analysez les boutiques concurrentes et trouvez leurs failles
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
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Espionnez la concurrence</h2>
              <p className="text-muted-foreground max-w-lg">
                Collez l&apos;URL d&apos;un concurrent et obtenez une analyse détaillée : forces, faiblesses, opportunités
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">URL du concurrent *</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://concurrent-shop.com" className="bg-background pl-10" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Niche / secteur (optionnel)</label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex: Mode streetwear, Accessoires tech..." className="bg-background" />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: Shield, title: "Design & UX", desc: "Analyse ergonomique" },
                  { icon: Search, title: "SEO", desc: "Référencement" },
                  { icon: Target, title: "Stratégie", desc: "Prix & marketing" },
                ].map((f) => (
                  <div key={f.title} className="rounded-xl border bg-background/80 backdrop-blur p-3 text-center space-y-1">
                    <f.icon className="h-4 w-4 text-primary mx-auto" />
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={analyze} size="lg" className="w-full gap-2" disabled={!url.trim()}>
                <Search className="h-5 w-5" /> Analyser le concurrent
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "analyzing" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Analyse en cours…</p>
              <p className="text-sm text-muted-foreground mt-1">Scraping du site et analyse IA détaillée</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && result && (
        <>
          {/* Score global */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <ScoreCircle score={result.overall_score} />
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{result.store_name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Forces / Faiblesses / Opportunités */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" /> Forces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-green-500 mt-0.5">+</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Faiblesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-red-500 mt-0.5">−</span> {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" /> Opportunités
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.opportunities.map((o, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-amber-500 mt-0.5">→</span> {o}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Catégories détaillées */}
          <div className="space-y-3">
            {result.categories.map((cat, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
                  onClick={() => setExpandedCat(expandedCat === i ? null : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-semibold min-w-[140px]">{cat.name}</span>
                      <div className="flex-1 max-w-xs">
                        <ScoreBar score={cat.score} />
                      </div>
                      <Badge variant="outline" className="text-xs">{cat.score}/100</Badge>
                    </div>
                    {expandedCat === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {expandedCat === i && (
                  <CardContent className="border-t pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{cat.analysis}</p>
                    <div>
                      <p className="text-xs font-medium mb-2">Recommandations :</p>
                      <ul className="space-y-1">
                        {cat.recommendations.map((r, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-primary mt-0.5">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={() => { setStep("form"); setResult(null); }} className="w-full">
            Analyser un autre concurrent
          </Button>
        </>
      )}
    </div>
  );
}
