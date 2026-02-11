"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Megaphone, Loader2, Copy, Check, ArrowLeft, Sparkles, Target, Zap,
  Facebook, Instagram,
} from "lucide-react";
import Link from "next/link";

const PLATFORMS = [
  { id: "facebook", label: "Facebook Ads", icon: Facebook, color: "bg-blue-500" },
  { id: "tiktok", label: "TikTok Ads", icon: Zap, color: "bg-black" },
  { id: "instagram", label: "Instagram Ads", icon: Instagram, color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { id: "google", label: "Google Ads", icon: Target, color: "bg-green-500" },
];

const TONES = [
  "Professionnel", "Décontracté", "Urgence", "Luxe", "Fun / Humour", "Inspirant",
];

interface AdVariant {
  variant: string;
  headline: string;
  body: string;
  cta: string;
  hashtags?: string[];
}

export function AdCopyClient() {
  const [step, setStep] = useState<"form" | "generating" | "results">("form");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [tone, setTone] = useState("Professionnel");
  const [ads, setAds] = useState<AdVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    if (!productName.trim()) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/ad-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productDescription, targetAudience, platform, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setAds(data.ads ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("form");
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Ad Copy Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Générez des textes publicitaires qui convertissent
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

      {/* Form */}
      {step === "form" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-8 md:p-12">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Créez vos publicités en un clic</h2>
              <p className="text-muted-foreground max-w-lg">
                L&apos;IA génère 3 variantes de publicités optimisées pour la plateforme de votre choix
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom du produit *</label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex: Montre connectée Sport Pro"
                  className="bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description du produit</label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Décrivez brièvement votre produit, ses fonctionnalités, ses avantages..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Audience cible</label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Ex: Hommes 25-45 ans sportifs"
                  className="bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Plateforme</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                          platform === p.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Ton</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        tone === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={generate} size="lg" className="w-full gap-2" disabled={!productName.trim()}>
                <Sparkles className="h-5 w-5" /> Générer les publicités
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generating */}
      {step === "generating" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Génération de vos publicités…</p>
              <p className="text-sm text-muted-foreground mt-1">L&apos;IA crée 3 variantes optimisées pour {PLATFORMS.find(p => p.id === platform)?.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {step === "results" && (
        <>
          <div className="grid gap-4">
            {ads.map((ad, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{ad.variant}</Badge>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}${ad.hashtags?.length ? "\n\n" + ad.hashtags.join(" ") : ""}`, i)}
                    >
                      {copiedIdx === i ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1 text-xs">{copiedIdx === i ? "Copié !" : "Copier"}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Titre / Hook</p>
                    <p className="text-sm font-semibold bg-primary/5 p-3 rounded-lg border border-primary/10">{ad.headline}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Texte</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg border whitespace-pre-wrap">{ad.body}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">CTA</p>
                    <p className="text-sm font-medium text-primary">{ad.cta}</p>
                  </div>
                  {ad.hashtags && ad.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ad.hashtags.map((h, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
              Nouvelle génération
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
