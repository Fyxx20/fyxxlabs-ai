"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Star, Loader2, Copy, Check, ArrowLeft, Sparkles, MessageCircle, Users,
} from "lucide-react";
import Link from "next/link";

interface Review {
  name: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function ReviewGeneratorClient() {
  const [step, setStep] = useState<"form" | "generating" | "results">("form");
  const [productName, setProductName] = useState("");
  const [productFeatures, setProductFeatures] = useState("");
  const [count, setCount] = useState(5);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    if (!productName.trim()) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/review-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productFeatures, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setReviews(data.reviews ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("form");
    }
  };

  const copyReview = (r: Review, idx: number) => {
    navigator.clipboard.writeText(`${r.name} - ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}\n${r.title}\n${r.body}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
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
            <Star className="h-6 w-6 text-primary" />
            Générateur d&apos;avis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez des avis clients réalistes pour vos produits
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
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Avis clients réalistes</h2>
              <p className="text-muted-foreground max-w-lg">
                L&apos;IA génère des avis variés et authentiques avec prénoms, notes et commentaires détaillés
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom du produit *</label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Écouteurs Bluetooth Pro" className="bg-background" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Caractéristiques / points forts</label>
                <textarea
                  value={productFeatures}
                  onChange={(e) => setProductFeatures(e.target.value)}
                  placeholder="Ex: Réduction de bruit active, 30h d'autonomie, étanche IPX5..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Nombre d&apos;avis : {count}</label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3</span><span>10</span>
                </div>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: Users, title: "Prénoms réalistes", desc: "Noms authentiques" },
                  { icon: Star, title: "Notes variées", desc: "3 à 5 étoiles" },
                  { icon: MessageCircle, title: "Textes uniques", desc: "Pas de doublons" },
                ].map((f) => (
                  <div key={f.title} className="rounded-xl border bg-background/80 backdrop-blur p-3 text-center space-y-1">
                    <f.icon className="h-4 w-4 text-primary mx-auto" />
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={generate} size="lg" className="w-full gap-2" disabled={!productName.trim()}>
                <Sparkles className="h-5 w-5" /> Générer {count} avis
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Génération des avis…</p>
              <p className="text-sm text-muted-foreground mt-1">Création de {count} avis réalistes et variés</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{reviews.length} avis générés</p>
            <Button variant="outline" size="sm" onClick={() => {
              const all = reviews.map((r) => `${r.name} - ${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}\n${r.title}\n${r.body}`).join("\n\n---\n\n");
              navigator.clipboard.writeText(all);
            }}>
              <Copy className="h-4 w-4 mr-1" /> Tout copier
            </Button>
          </div>

          <div className="grid gap-3">
            {reviews.map((r, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{r.name}</span>
                            {r.verified && <Badge variant="secondary" className="text-xs">Achat vérifié</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <StarRating rating={r.rating} />
                            <span className="text-xs text-muted-foreground">{r.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-sm text-muted-foreground">{r.body}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyReview(r, i)} className="flex-shrink-0">
                      {copiedIdx === i ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={() => setStep("form")} className="w-full">
            Générer d&apos;autres avis
          </Button>
        </>
      )}
    </div>
  );
}
