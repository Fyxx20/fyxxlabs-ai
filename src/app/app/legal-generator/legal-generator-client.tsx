"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ScrollText, Loader2, Copy, Check, ArrowLeft, FileText, Shield, RotateCcw, Truck,
} from "lucide-react";
import Link from "next/link";

const PAGE_TYPES = [
  { id: "cgv", label: "CGV", desc: "Conditions Générales de Vente", icon: ScrollText },
  { id: "privacy", label: "Confidentialité", desc: "Politique de confidentialité RGPD", icon: Shield },
  { id: "refund", label: "Remboursement", desc: "Politique de retours", icon: RotateCcw },
  { id: "legal", label: "Mentions légales", desc: "Mentions obligatoires", icon: FileText },
  { id: "shipping", label: "Livraison", desc: "Politique de livraison", icon: Truck },
];

interface LegalResult {
  title: string;
  content: string;
  sections: Array<{ heading: string; body: string }>;
}

export function LegalGeneratorClient() {
  const [step, setStep] = useState<"form" | "generating" | "results">("form");
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [email, setEmail] = useState("");
  const [pageType, setPageType] = useState("cgv");
  const [result, setResult] = useState<LegalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!storeName.trim()) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/legal-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, storeUrl, email, pageType }),
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

  const copyAll = () => {
    if (!result) return;
    const text = result.sections.map((s) => `${s.heading}\n\n${s.body}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <ScrollText className="h-6 w-6 text-primary" />
            Pages Légales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Générez vos pages légales conformes au RGPD en un clic
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
                <ScrollText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Pages légales professionnelles</h2>
              <p className="text-muted-foreground max-w-lg">
                Conformes au droit français, européen et au RGPD. Prêtes à publier sur votre boutique.
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom de la boutique *</label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex: Ma Boutique Store" className="bg-background" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">URL du site</label>
                  <Input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://maboutique.com" className="bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email de contact</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@maboutique.com" className="bg-background" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Type de page</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PAGE_TYPES.map((pt) => {
                    const Icon = pt.icon;
                    return (
                      <button
                        key={pt.id}
                        onClick={() => setPageType(pt.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          pageType === pt.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{pt.label}</p>
                          <p className="text-xs text-muted-foreground">{pt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={generate} size="lg" className="w-full gap-2" disabled={!storeName.trim()}>
                <FileText className="h-5 w-5" /> Générer la page
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
              <p className="font-medium">Rédaction de votre page légale…</p>
              <p className="text-sm text-muted-foreground mt-1">L&apos;IA génère un texte conforme et professionnel</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && result && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{result.title}</CardTitle>
              <Button variant="outline" size="sm" onClick={copyAll}>
                {copied ? <Check className="h-4 w-4 text-green-500 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copié !" : "Tout copier"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {result.sections.map((s, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-base mb-2">{s.heading}</h3>
                  <div className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: s.body }} />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
              Générer une autre page
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
