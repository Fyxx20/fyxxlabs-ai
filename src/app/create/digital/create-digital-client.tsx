"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Sparkles, Upload, Wand2, ShieldCheck, Rocket, BookOpen, GraduationCap, FileText, Palette, TrendingUp, Dumbbell, Bot, LayoutGrid, ChevronRight, Eye, Layers } from "lucide-react";

type Step = 1 | 2 | 3;

interface DigitalPagePayload {
  brandName: string;
  title: string;
  subtitle: string;
  hero: string;
  offer: string[];
  objections: string[];
  upsell: string[];
  crossSell: string[];
  launchChecklist: string[];
  faq: Array<{ question: string; answer: string }>;
  guarantee: string;
  legal: string[];
  legalPages?: {
    cgu: string;
    privacy: string;
    refund: string;
  };
  transactionalEmails?: {
    delivery_subject: string;
    delivery_body: string;
    support_subject: string;
    support_body: string;
  };
  pricing: {
    currency: string;
    safe: number;
    optimal: number;
    aggressive: number;
    positioning: "low" | "mid" | "premium";
    why: string[];
  };
  visuals: {
    coverUrl: string;
    heroUrl: string;
    mockupUrls: string[];
  };
}

export function CreateDigitalClient({
  storeId,
  storeName,
  shopDomain,
}: {
  storeId: string;
  storeName: string;
  shopDomain: string | null;
}) {
  const BUSINESS_TYPES = [
    { id: "ebook", label: "Ebook / Guide", icon: BookOpen, desc: "Guide premium prêt à vendre", mock: "Cover + bonus PDF" },
    { id: "course", label: "Online Course", icon: GraduationCap, desc: "Programme structuré en modules", mock: "Page formation + upsell" },
    { id: "notion-template", label: "Notion Template", icon: LayoutGrid, desc: "Template productivité ou business", mock: "Mockup desktop + mobile" },
    { id: "design-pack", label: "Design Pack", icon: Palette, desc: "Pack de visuels/ressources", mock: "Bundle assets premium" },
    { id: "trading-strategy", label: "Trading Strategy", icon: TrendingUp, desc: "Méthode + process clair", mock: "Landing orientée confiance" },
    { id: "fitness-program", label: "Fitness Program", icon: Dumbbell, desc: "Plan entraînement & nutrition", mock: "Avant/après + preuve sociale" },
    { id: "ai-prompt-pack", label: "AI Prompt Pack", icon: Bot, desc: "Prompts prêts à l’emploi", mock: "Offre bundle + upgrades" },
    { id: "other", label: "Other (Custom)", icon: Sparkles, desc: "Produit digital sur mesure", mock: "Branding automatique" },
  ] as const;

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [skipUpload, setSkipUpload] = useState(false);
  const [page, setPage] = useState<DigitalPagePayload | null>(null);
  const [previewMode, setPreviewMode] = useState<"live" | "wireframe">("live");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const [brief, setBrief] = useState({
    productType: "ebook",
    customType: "",
    audience: "",
    result: "",
    level: "beginner",
    tone: "premium",
    language: "fr",
    country: "FR",
  });

  const canGenerate = useMemo(
    () =>
      brief.productType &&
      brief.audience &&
      brief.result &&
      (skipUpload || Boolean(assetId)),
    [brief, assetId]
  );

  useEffect(() => {
    fetch("/api/store/create-digital", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "usage-stats" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.used === "number" && typeof d.limit === "number") {
          setUsage({ used: d.used, limit: d.limit });
        }
      })
      .catch(() => {});
  }, []);

  async function uploadAsset() {
    if (!assetFile) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", assetFile);
      form.append("title", assetFile.name);
      form.append("kind", brief.productType);
      form.append("storeId", storeId);
      const res = await fetch("/api/store/create-digital", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload impossible");
      setAssetId(data.assetId);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setLoading(false);
    }
  }

  async function generatePage() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setProgress(8);
    setProgressLabel("Building brand identity...");
    const phases = [
      { p: 20, label: "Optimizing pricing..." },
      { p: 38, label: "Designing digital visuals..." },
      { p: 62, label: "Writing high-converting copy..." },
      { p: 80, label: "Creating legal pages..." },
      { p: 93, label: "Preparing secure delivery system..." },
    ];
    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= phases.length) return;
      setProgress(phases[idx].p);
      setProgressLabel(phases[idx].label);
      idx += 1;
    }, 850);
    try {
      const res = await fetch("/api/store/create-digital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-page",
          brief: {
            ...brief,
            productType: brief.productType === "other" ? brief.customType || "custom" : brief.productType,
            productName: brief.productType === "other" ? brief.customType || "Custom Product" : BUSINESS_TYPES.find((b) => b.id === brief.productType)?.label ?? brief.productType,
            audiencePain: "",
            promise: brief.result,
            transformation: brief.result,
            offerIncludes: "",
            bonus: "",
            guaranteeType: "7 jours satisfait ou remboursé (digital)",
            supportEmail: "support@fyxxlabs.com",
            ctaStyle: "premium",
          },
          assetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation impossible");
      setPage(data.page);
      setProgress(100);
      setProgressLabel("Premium store generated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur generation");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  async function publishShopify() {
    if (!page) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/create-digital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish-shopify",
          storeId,
          page,
          coverImageUrl: page.visuals.coverUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Publication Shopify impossible");
      alert("Produit digital publie sur Shopify avec succes.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur publication");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Your Digital Business</h1>
        <p className="text-sm text-slate-300">
          Boutique cible: {storeName} {shopDomain ? `(${shopDomain})` : "(Shopify non connecte)"}
        </p>
        {usage && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
            <Layers className="h-3.5 w-3.5 text-cyan-300" />
            Créations ce mois: <span className="font-semibold">{usage.used}/{usage.limit}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
          <span>Progression</span>
          <span>{Math.max(step * 33, progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${Math.max(step * 33, progress)}%` }}
          />
        </div>
        {progressLabel && <p className="mt-2 text-xs text-slate-300">{progressLabel}</p>}
      </div>

      {error && (
        <Card className="border-destructive/40 bg-rose-500/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Étape 1 — Choose Your Digital Business
            <span title="Sélection rapide, l'IA infère la structure complète">
              <HelpCircle className="h-4 w-4 text-slate-300" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {BUSINESS_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setBrief((b) => ({ ...b, productType: item.id }))}
                className={`rounded-xl border p-3 text-left transition-all ${
                  brief.productType === item.id
                    ? "border-violet-400 bg-violet-500/15 ring-1 ring-violet-400/40"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-cyan-300" />
                  <p className="text-sm font-semibold">{item.label}</p>
                </div>
                <p className="text-xs text-slate-300">{item.desc}</p>
                <p className="mt-2 text-[11px] text-slate-400">{item.mock}</p>
              </button>
            ))}
          </div>
          {brief.productType === "other" && (
            <div className="space-y-2">
              <Label>Type personnalisé</Label>
              <Input
                value={brief.customType}
                onChange={(e) => setBrief((b) => ({ ...b, customType: e.target.value }))}
                placeholder="Ex: Pack juridique pour freelances"
              />
            </div>
          )}
          <Button onClick={() => setStep(2)} disabled={loading || (brief.productType === "other" && !brief.customType)}>
            Continuer
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {step >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Étape 2 — Define Your Audience
              <span title="L'IA génère pain points, FAQ, objections et structure de vente automatiquement">
                <HelpCircle className="h-4 w-4 text-slate-300" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>1) Who is this for?</Label>
              <Input value={brief.audience} onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))} placeholder="Ex: entrepreneurs débutants en e-commerce" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>2) What result will they get?</Label>
              <Input value={brief.result} onChange={(e) => setBrief((b) => ({ ...b, result: e.target.value }))} placeholder="Ex: lancer leur 1ère offre rentable en 7 jours" />
            </div>
          <div className="space-y-2">
            <Label>3) Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {["beginner", "intermediate", "advanced"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBrief((b) => ({ ...b, level: v }))}
                  className={`rounded-md border px-2 py-2 text-xs ${brief.level === v ? "border-violet-400 bg-violet-500/15" : "border-white/15 bg-white/[0.03]"}`}
                >
                  {v === "beginner" ? "Beginner" : v === "intermediate" ? "Intermediate" : "Advanced"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>4) Tone</Label>
            <div className="grid grid-cols-2 gap-2">
              {["premium", "bold", "friendly", "minimal"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBrief((b) => ({ ...b, tone: v }))}
                  className={`rounded-md border px-2 py-2 text-xs ${brief.tone === v ? "border-cyan-300 bg-cyan-500/10" : "border-white/15 bg-white/[0.03]"}`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>5) Language</Label>
            <Input value={brief.language} onChange={(e) => setBrief((b) => ({ ...b, language: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={brief.country} onChange={(e) => setBrief((b) => ({ ...b, country: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => setStep(3)} disabled={loading || !brief.audience || !brief.result}>
              Continuer vers Upload & Generate
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {step >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Étape 3 — Upload & Generate
              <span title="Tu peux uploader maintenant ou plus tard, l’IA génère déjà la boutique premium complète">
                <HelpCircle className="h-4 w-4 text-slate-300" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <Upload className="h-4 w-4 text-cyan-300" />
                <p className="text-sm text-slate-200">Upload your digital file (optional now)</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input type="file" className="max-w-md" onChange={(e) => setAssetFile(e.target.files?.[0] ?? null)} />
                <Button onClick={uploadAsset} disabled={loading || !assetFile || skipUpload}>
                  Upload sécurisé
                </Button>
                <Button
                  variant={skipUpload ? "default" : "outline"}
                  onClick={() => setSkipUpload((v) => !v)}
                  disabled={loading}
                >
                  {skipUpload ? "Upload plus tard (activé)" : "I will upload later"}
                </Button>
                {assetId && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Asset ready</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generatePage} disabled={loading || !canGenerate}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Premium Store
              </Button>
              <Button variant="outline" onClick={publishShopify} disabled={loading || !page}>
                <Rocket className="mr-2 h-4 w-4" />
                Publier sur Shopify
              </Button>
              <Button variant="outline" onClick={() => setPreviewMode((p) => (p === "live" ? "wireframe" : "live"))}>
                <Eye className="mr-2 h-4 w-4" />
                Preview: {previewMode === "live" ? "Live" : "Wireframe"}
              </Button>
            </div>

            {page && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">{page.title}</p>
                <p className="text-sm text-slate-300">{page.subtitle}</p>
                <div className={`grid gap-3 ${previewMode === "live" ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
                  <img src={page.visuals.coverUrl} alt="cover" className="h-40 w-full rounded object-cover" />
                  <img src={page.visuals.heroUrl} alt="hero" className="h-40 w-full rounded object-cover" />
                  <img src={page.visuals.mockupUrls[0]} alt="mockup" className="h-40 w-full rounded object-cover" />
                </div>
                <p className="text-xs text-slate-300">
                  Pricing logic: Safe {page.pricing.safe} / Optimal {page.pricing.optimal} / Aggressive {page.pricing.aggressive} {page.pricing.currency}
                </p>
                <p className="text-xs text-slate-300">
                  Conversion booster: {page.upsell.length} upsell, {page.crossSell.length} cross-sell, {page.launchChecklist.length} points checklist
                </p>
                {page.transactionalEmails && (
                  <p className="text-xs text-muted-foreground">
                    Emails transactionnels générés: livraison + support.
                  </p>
                )}
                {page.legalPages && (
                  <p className="text-xs text-slate-300">
                    Pages légales générées: CGU digitales, confidentialité, remboursement.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-violet-300/20 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-300" />
                <p className="text-sm font-semibold">PRO Preview</p>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="pointer-events-none absolute inset-0 backdrop-blur-sm" />
                <p className="relative text-sm text-slate-300">
                  Advanced market intelligence, competitor extraction enrichi, and auto-email sequences.
                </p>
              </div>
              <Link href="/app/billing" className="mt-3 inline-block">
                <Button variant="outline">Upgrade to unlock</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
