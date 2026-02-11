"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ImageIcon, Loader2, ArrowLeft, Sparkles, AlertTriangle, CheckCircle, Camera,
  Sun, Layers, FileImage, Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

interface ImageIssue {
  issue: string;
  severity: "high" | "medium" | "low";
  fix: string;
}

interface ImageRecommendation {
  category: string;
  tip: string;
  impact: "high" | "medium" | "low";
}

interface AnalysisResult {
  overall_score: number;
  analysis: string;
  issues: ImageIssue[];
  recommendations: ImageRecommendation[];
  alt_text_suggestion: string;
  seo_filename_suggestion: string;
}

const severityConfig = {
  high: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-600 dark:text-red-400", label: "Élevée" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-600 dark:text-amber-400", label: "Moyenne" },
  low: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400", label: "Faible" },
};

export function ImageEnhancerClient() {
  const [step, setStep] = useState<"form" | "analyzing" | "results">("form");
  const [imageUrl, setImageUrl] = useState("");
  const [productType, setProductType] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!imageUrl.trim()) return;
    setStep("analyzing");
    setError(null);
    try {
      const res = await fetch("/api/store/image-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, productType }),
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
            <ImageIcon className="h-6 w-6 text-primary" />
            Optimiseur d&apos;images
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analysez et optimisez vos photos produit pour maximiser les conversions
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
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Audit photo produit</h2>
              <p className="text-muted-foreground max-w-lg">
                L&apos;IA analyse votre image et propose des améliorations pour booster vos conversions
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">URL de l&apos;image *</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://cdn.shopify.com/..." className="bg-background pl-10" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Type de produit</label>
                <Input value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="Ex: Montre, T-shirt, Accessoire..." className="bg-background" />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: Sun, title: "Éclairage", desc: "Qualité lumière" },
                  { icon: Layers, title: "Composition", desc: "Cadrage & fond" },
                  { icon: FileImage, title: "SEO Image", desc: "Alt text & nom" },
                ].map((f) => (
                  <div key={f.title} className="rounded-xl border bg-background/80 backdrop-blur p-3 text-center space-y-1">
                    <f.icon className="h-4 w-4 text-primary mx-auto" />
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={analyze} size="lg" className="w-full gap-2" disabled={!imageUrl.trim()}>
                <Sparkles className="h-5 w-5" /> Analyser l&apos;image
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
              <p className="text-sm text-muted-foreground mt-1">Évaluation de la qualité et optimisations</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && result && (
        <>
          {/* Score + preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center">
                <div className={`h-24 w-24 rounded-full flex items-center justify-center ${
                  result.overall_score >= 70 ? "bg-green-50 dark:bg-green-950/30" : result.overall_score >= 40 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30"
                }`}>
                  <span className={`text-3xl font-bold ${
                    result.overall_score >= 70 ? "text-green-600 dark:text-green-400" : result.overall_score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                  }`}>{result.overall_score}</span>
                </div>
                <p className="text-sm font-medium mt-3">Score de qualité</p>
                <p className="text-xs text-muted-foreground text-center mt-1">{result.analysis}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Image analysée" className="w-full h-48 object-contain bg-muted/50 p-2" />
              </CardContent>
            </Card>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Problèmes détectés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.issues.map((issue, i) => {
                  const cfg = severityConfig[issue.severity];
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${cfg.text}`}>{issue.issue}</p>
                        <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">💡 {issue.fix}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> Recommandations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                  <Badge variant="secondary" className="text-xs flex-shrink-0 mt-0.5">{rec.category}</Badge>
                  <div className="flex-1">
                    <p className="text-sm">{rec.tip}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${
                    rec.impact === "high" ? "border-green-300 text-green-600" : rec.impact === "medium" ? "border-amber-300 text-amber-600" : "border-blue-300 text-blue-600"
                  }`}>
                    Impact {rec.impact === "high" ? "élevé" : rec.impact === "medium" ? "moyen" : "faible"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SEO suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SEO Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Texte alt suggestion</p>
                <p className="text-sm bg-primary/5 p-2 rounded border border-primary/10">{result.alt_text_suggestion}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Nom de fichier SEO</p>
                <p className="text-sm bg-primary/5 p-2 rounded border border-primary/10">{result.seo_filename_suggestion}</p>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => { setStep("form"); setResult(null); }} className="w-full">
            Analyser une autre image
          </Button>
        </>
      )}
    </div>
  );
}
