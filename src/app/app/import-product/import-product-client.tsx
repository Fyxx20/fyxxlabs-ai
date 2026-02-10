"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Link as LinkIcon,
  Sparkles,
  Upload,
  Check,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ImageIcon,
  DollarSign,
  Tag,
  Edit3,
} from "lucide-react";

interface ScrapedProduct {
  title: string;
  description: string;
  price: string | null;
  currency: string | null;
  images: string[];
  specs: Record<string, string>;
  brand: string | null;
  category: string | null;
  url: string;
  source: string;
}

interface GeneratedProduct {
  title: string;
  body_html: string;
  seo_title: string;
  seo_description: string;
  tags: string;
  product_type: string;
  suggested_price: string;
  compare_at_price: string;
  improvements: string[];
}

type Step = "input" | "scraping" | "scraped" | "generating" | "preview" | "importing" | "done";

export function ImportProductClient({
  storeId,
  shopDomain,
}: {
  storeId: string;
  shopDomain: string;
}) {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState<ScrapedProduct | null>(null);
  const [generated, setGenerated] = useState<GeneratedProduct | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    productId: number;
    handle: string;
  } | null>(null);

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editComparePrice, setEditComparePrice] = useState("");
  const [editTags, setEditTags] = useState("");

  const handleScrape = useCallback(async () => {
    if (!url.trim()) return;
    setStep("scraping");
    setError(null);
    try {
      const res = await fetch("/api/store/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scrape", productUrl: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setScraped(data.product);
      setStep("scraped");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("input");
    }
  }, [url]);

  const handleGenerate = useCallback(async () => {
    if (!scraped) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", scrapedProduct: scraped }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setGenerated(data.generated);
      setImages(data.images ?? scraped.images);
      // Set editable fields
      setEditTitle(data.generated.title ?? "");
      setEditPrice(data.generated.suggested_price ?? "");
      setEditComparePrice(data.generated.compare_at_price ?? "");
      setEditTags(data.generated.tags ?? "");
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("scraped");
    }
  }, [scraped]);

  const handleImport = useCallback(async () => {
    if (!generated) return;
    setStep("importing");
    setError(null);
    try {
      const res = await fetch("/api/store/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          storeId,
          generatedProduct: {
            ...generated,
            title: editTitle,
            suggested_price: editPrice,
            compare_at_price: editComparePrice,
            tags: editTags,
            images,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setImportResult({
        productId: data.productId,
        handle: data.handle,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("preview");
    }
  }, [generated, storeId, editTitle, editPrice, editComparePrice, editTags, images]);

  const reset = () => {
    setStep("input");
    setUrl("");
    setScraped(null);
    setGenerated(null);
    setImages([]);
    setImportResult(null);
    setError(null);
  };

  const sourceLabel = (s: string) => {
    const map: Record<string, string> = {
      aliexpress: "AliExpress",
      amazon: "Amazon",
      temu: "Temu",
      alibaba: "Alibaba",
      ebay: "eBay",
      generic: "Web",
    };
    return map[s] || s;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          Importer un produit avec l&apos;IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Collez un lien produit (AliExpress, Amazon, etc.) → l&apos;IA génère une fiche optimisée → importez sur Shopify en 1 clic.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "input", label: "1. Lien" },
          { key: "scraped", label: "2. Extraction" },
          { key: "preview", label: "3. IA" },
          { key: "done", label: "4. Import" },
        ].map((s, i) => {
          const stepOrder = ["input", "scraped", "preview", "done"];
          const currentOrder = stepOrder.indexOf(
            step === "scraping" ? "input" :
            step === "generating" ? "scraped" :
            step === "importing" ? "preview" :
            step
          );
          const thisOrder = stepOrder.indexOf(s.key);
          const isActive = thisOrder <= currentOrder;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-0.5 w-6 ${isActive ? "bg-purple-500" : "bg-muted"}`}
                />
              )}
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Input URL */}
      {(step === "input" || step === "scraping") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Coller le lien du produit
            </CardTitle>
            <CardDescription>
              AliExpress, Amazon, Temu, eBay ou n&apos;importe quel site e-commerce.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://fr.aliexpress.com/item/..."
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={step === "scraping"}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
            />
            <Button
              onClick={handleScrape}
              disabled={!url.trim() || step === "scraping"}
              className="w-full"
            >
              {step === "scraping" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Extraction en cours…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extraire le produit
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scraped data preview */}
      {step === "scraped" && scraped && (
        <Card>
          <CardHeader>
            <CardTitle>Données extraites</CardTitle>
            <CardDescription>
              Source : <Badge variant="secondary">{sourceLabel(scraped.source)}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Images */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" /> {scraped.images.length} image(s)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {scraped.images.slice(0, 6).map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg border border-border overflow-hidden bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Product ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Titre</p>
                  <p className="font-medium">{scraped.title}</p>
                </div>
                {scraped.price && (
                  <div>
                    <p className="text-xs text-muted-foreground">Prix source</p>
                    <p className="font-medium text-lg">
                      {scraped.price} {scraped.currency ?? ""}
                    </p>
                  </div>
                )}
                {scraped.brand && (
                  <div>
                    <p className="text-xs text-muted-foreground">Marque</p>
                    <p>{scraped.brand}</p>
                  </div>
                )}
                {scraped.category && (
                  <div>
                    <p className="text-xs text-muted-foreground">Catégorie</p>
                    <p>{scraped.category}</p>
                  </div>
                )}
                {scraped.description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {scraped.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button onClick={handleGenerate} className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Générer la fiche avec l&apos;IA
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2.5: Generating */}
      {step === "generating" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-500" />
            <p className="font-medium">L&apos;IA génère votre fiche produit…</p>
            <p className="text-sm text-muted-foreground">
              Titre optimisé, description persuasive, SEO, pricing stratégique…
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: AI Preview with editable fields */}
      {step === "preview" && generated && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Fiche produit générée par l&apos;IA
              </CardTitle>
              <CardDescription>
                Vérifiez et ajustez avant d&apos;importer sur Shopify.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Editable title */}
              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Edit3 className="h-3.5 w-3.5" /> Titre
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Price row */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1 mb-1">
                    <DollarSign className="h-3.5 w-3.5" /> Prix de vente
                  </label>
                  <input
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1 mb-1">
                    <DollarSign className="h-3.5 w-3.5" /> Ancien prix (barré)
                  </label>
                  <input
                    value={editComparePrice}
                    onChange={(e) => setEditComparePrice(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Tag className="h-3.5 w-3.5" /> Tags
                </label>
                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Description preview */}
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <div
                  className="rounded-lg border border-border p-4 text-sm prose prose-sm dark:prose-invert max-w-none max-h-60 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: generated.body_html }}
                />
              </div>

              {/* SEO */}
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Aperçu SEO Google
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  {generated.seo_title}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {shopDomain}/products/...
                </p>
                <p className="text-xs text-muted-foreground">
                  {generated.seo_description}
                </p>
              </div>

              {/* Images */}
              {images.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    {images.length} image(s) à importer
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="w-20 h-20 flex-shrink-0 rounded-lg border border-border overflow-hidden bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`Img ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {generated.improvements && generated.improvements.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">
                    Améliorations apportées par l&apos;IA
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {generated.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("scraped")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button onClick={handleImport} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Importer sur Shopify
            </Button>
          </div>
        </div>
      )}

      {/* Step 3.5: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-500" />
            <p className="font-medium">Import en cours sur Shopify…</p>
            <p className="text-sm text-muted-foreground">
              Création du produit, upload des images, configuration du prix…
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && importResult && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold">Produit importé avec succès !</h2>
            <p className="text-muted-foreground">
              Le produit a été créé sur votre boutique Shopify avec toutes les
              optimisations IA.
            </p>
            <div className="flex flex-col gap-2 items-center pt-2">
              <a
                href={`https://${shopDomain}/admin/products/${importResult.productId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Voir sur Shopify Admin
              </a>
              <Button variant="outline" onClick={reset} className="mt-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Importer un autre produit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
