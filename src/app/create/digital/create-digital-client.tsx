"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [page, setPage] = useState<DigitalPagePayload | null>(null);

  const [brief, setBrief] = useState({
    productName: "",
    productType: "ebook",
    audience: "",
    audiencePain: "",
    promise: "",
    transformation: "",
    level: "beginner",
    tone: "professionnel",
    language: "fr",
    country: "FR",
    offerIncludes: "",
    bonus: "",
    guaranteeType: "14 jours satisfait ou rembourse",
    supportEmail: "",
    ctaStyle: "direct et premium",
  });

  const canGenerate = useMemo(
    () =>
      brief.productName &&
      brief.productType &&
      brief.audience &&
      brief.audiencePain &&
      brief.promise &&
      brief.transformation &&
      assetId,
    [brief, assetId]
  );

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
    try {
      const res = await fetch("/api/store/create-digital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-page",
          brief,
          assetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation impossible");
      setPage(data.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur generation");
    } finally {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Digital Store</h1>
        <p className="text-sm text-muted-foreground">
          Boutique cible: {storeName} {shopDomain ? `(${shopDomain})` : "(Shopify non connecte)"}
        </p>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Etape 1 - Questionnaire A a Z</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nom du produit</Label>
            <Input value={brief.productName} onChange={(e) => setBrief((b) => ({ ...b, productName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={brief.productType} onChange={(e) => setBrief((b) => ({ ...b, productType: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <Input value={brief.audience} onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Douleur principale de l'audience</Label>
            <textarea
              value={brief.audiencePain}
              onChange={(e) => setBrief((b) => ({ ...b, audiencePain: e.target.value }))}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Promesse</Label>
            <textarea
              value={brief.promise}
              onChange={(e) => setBrief((b) => ({ ...b, promise: e.target.value }))}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Transformation attendue (avant / apres)</Label>
            <textarea
              value={brief.transformation}
              onChange={(e) => setBrief((b) => ({ ...b, transformation: e.target.value }))}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Niveau</Label>
            <Input value={brief.level} onChange={(e) => setBrief((b) => ({ ...b, level: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Ton</Label>
            <Input value={brief.tone} onChange={(e) => setBrief((b) => ({ ...b, tone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Langue</Label>
            <Input value={brief.language} onChange={(e) => setBrief((b) => ({ ...b, language: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Pays cible</Label>
            <Input value={brief.country} onChange={(e) => setBrief((b) => ({ ...b, country: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Contenu inclus dans l'offre</Label>
            <textarea
              value={brief.offerIncludes}
              onChange={(e) => setBrief((b) => ({ ...b, offerIncludes: e.target.value }))}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Bonus / upsell souhaite</Label>
            <textarea
              value={brief.bonus}
              onChange={(e) => setBrief((b) => ({ ...b, bonus: e.target.value }))}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Type de garantie</Label>
            <Input value={brief.guaranteeType} onChange={(e) => setBrief((b) => ({ ...b, guaranteeType: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email support</Label>
            <Input value={brief.supportEmail} onChange={(e) => setBrief((b) => ({ ...b, supportEmail: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Style CTA</Label>
            <Input value={brief.ctaStyle} onChange={(e) => setBrief((b) => ({ ...b, ctaStyle: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={() => setStep(2)}
              disabled={
                loading ||
                !brief.productName ||
                !brief.productType ||
                !brief.audience ||
                !brief.audiencePain ||
                !brief.promise ||
                !brief.transformation
              }
            >
              Continuer vers upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {step >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Etape 2 - Upload fichier digital</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" onChange={(e) => setAssetFile(e.target.files?.[0] ?? null)} />
            <Button onClick={uploadAsset} disabled={loading || !assetFile}>
              Upload securise
            </Button>
            {assetId && <p className="text-xs text-muted-foreground">Asset ID: {assetId}</p>}
          </CardContent>
        </Card>
      )}

      {step >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Etape 3 - Generation + preview + publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={generatePage} disabled={loading || !canGenerate}>
                Generer la page
              </Button>
              <Button variant="outline" onClick={publishShopify} disabled={loading || !page}>
                Publier sur Shopify
              </Button>
            </div>

            {page && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">{page.title}</p>
                <p className="text-sm text-muted-foreground">{page.subtitle}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <img src={page.visuals.coverUrl} alt="cover" className="h-40 w-full rounded object-cover" />
                  <img src={page.visuals.heroUrl} alt="hero" className="h-40 w-full rounded object-cover" />
                  <img src={page.visuals.mockupUrls[0]} alt="mockup" className="h-40 w-full rounded object-cover" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pricing: Safe {page.pricing.safe} / Optimal {page.pricing.optimal} / Aggressive {page.pricing.aggressive} {page.pricing.currency}
                </p>
                <p className="text-xs text-muted-foreground">
                  Conversion booster: {page.upsell.length} upsell, {page.crossSell.length} cross-sell, {page.launchChecklist.length} points checklist
                </p>
                {page.transactionalEmails && (
                  <p className="text-xs text-muted-foreground">
                    Emails transactionnels générés: livraison + support.
                  </p>
                )}
                {page.legalPages && (
                  <p className="text-xs text-muted-foreground">
                    Pages légales générées: CGU digitales, confidentialité, remboursement.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
