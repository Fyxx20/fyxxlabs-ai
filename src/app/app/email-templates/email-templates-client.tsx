"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail, Loader2, Copy, Check, ArrowLeft, ShoppingCart, Gift, UserPlus, Repeat, Rocket, Clock,
  ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";

const TEMPLATE_TYPES = [
  { id: "welcome", label: "Bienvenue", desc: "Nouvel inscrit", icon: UserPlus },
  { id: "abandoned_cart", label: "Panier abandonné", desc: "Séquence de relance", icon: ShoppingCart },
  { id: "post_purchase", label: "Post-achat", desc: "Remerciement + avis", icon: Check },
  { id: "promotion", label: "Promotion", desc: "Offre spéciale", icon: Gift },
  { id: "reengagement", label: "Ré-engagement", desc: "Clients inactifs", icon: Repeat },
  { id: "launch", label: "Lancement", desc: "Nouveau produit", icon: Rocket },
];

interface EmailTemplate {
  subject: string;
  preheader: string;
  body_html: string;
  send_timing: string;
  tips: string[];
}

export function EmailTemplatesClient() {
  const [step, setStep] = useState<"form" | "generating" | "results">("form");
  const [storeName, setStoreName] = useState("");
  const [templateType, setTemplateType] = useState("welcome");
  const [productName, setProductName] = useState("");
  const [discount, setDiscount] = useState("");
  const [emails, setEmails] = useState<EmailTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    if (!storeName.trim()) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, templateType, productName, discount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setEmails(data.emails ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("form");
    }
  };

  const copyEmail = (e: EmailTemplate, idx: number) => {
    navigator.clipboard.writeText(`Objet: ${e.subject}\nPreheader: ${e.preheader}\n\n${e.body_html}`);
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
            <Mail className="h-6 w-6 text-primary" />
            Email Marketing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez des séquences email professionnelles qui convertissent
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
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Séquences email prêtes à l&apos;emploi</h2>
              <p className="text-muted-foreground max-w-lg">
                Templates professionnels optimisés pour le taux d&apos;ouverture et la conversion
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom de la boutique *</label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex: Ma Boutique" className="bg-background" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Type de séquence</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATE_TYPES.map((tt) => {
                    const Icon = tt.icon;
                    return (
                      <button
                        key={tt.id}
                        onClick={() => setTemplateType(tt.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors ${
                          templateType === tt.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{tt.label}</span>
                        <span className="text-xs text-muted-foreground">{tt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Produit (optionnel)</label>
                  <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: T-shirt Premium" className="bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Réduction (optionnel)</label>
                  <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Ex: -20% / Livraison offerte" className="bg-background" />
                </div>
              </div>

              <Button onClick={generate} size="lg" className="w-full gap-2" disabled={!storeName.trim()}>
                <Mail className="h-5 w-5" /> Générer la séquence
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
              <p className="font-medium">Création de votre séquence email…</p>
              <p className="text-sm text-muted-foreground mt-1">Objets, contenus et conseils optimisés</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && (
        <>
          <div className="space-y-4">
            {emails.map((em, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{em.subject}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{em.preheader}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" /> {em.send_timing}
                      </Badge>
                      {expandedIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
                {expandedIdx === i && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Contenu de l&apos;email</p>
                        <Button variant="ghost" size="sm" onClick={() => copyEmail(em, i)}>
                          {copiedIdx === i ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          <span className="ml-1 text-xs">{copiedIdx === i ? "Copié !" : "Copier"}</span>
                        </Button>
                      </div>
                      <div
                        className="text-sm bg-background p-4 rounded-lg border prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: em.body_html }}
                      />
                    </div>
                    {em.tips.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">💡 Conseils</p>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                          {em.tips.map((t, j) => (
                            <li key={j}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={() => setStep("form")} className="w-full">
            Créer une autre séquence
          </Button>
        </>
      )}
    </div>
  );
}
