"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Check, X, Loader2, Eye, Zap, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface ProductFix {
  product_id: number;
  original_title: string;
  new_title: string;
  new_body_html: string;
  new_seo_title: string;
  new_seo_description: string;
  new_tags: string;
  improvements: string[];
}

interface ApplyResult {
  product_id: number;
  title: string;
  success: boolean;
  error?: string;
}

interface ShopifyProductPreview {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  price: string | null;
  images_count: number;
  first_image: string | null;
  tags: string;
}

export function AutoFixClient({ storeId }: { storeId: string }) {
  const [step, setStep] = useState<"idle" | "loading-products" | "products-loaded" | "generating" | "preview" | "applying" | "done">("idle");
  const [products, setProducts] = useState<ShopifyProductPreview[]>([]);
  const [fixes, setFixes] = useState<ProductFix[]>([]);
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedFix, setExpandedFix] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    setStep("loading-products");
    setError(null);
    try {
      const res = await fetch(`/api/store/auto-fix?storeId=${storeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setProducts(data.products);
      setSelectedIds(new Set(data.products.slice(0, 10).map((p: ShopifyProductPreview) => p.id)));
      setStep("products-loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("idle");
    }
  }, [storeId]);

  const generateFixes = useCallback(async () => {
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/auto-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          action: "preview",
          productIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setFixes(data.fixes);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("products-loaded");
    }
  }, [storeId, selectedIds]);

  const applyFixes = useCallback(async () => {
    setStep("applying");
    setError(null);
    try {
      const res = await fetch("/api/store/auto-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          action: "apply",
          productIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setResults(data.results);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("preview");
    }
  }, [storeId, selectedIds]);

  const toggleProduct = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            <Wand2 className="h-6 w-6 text-purple-500" />
            FyxxLabs AI Auto-Fix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            L&apos;IA analyse et optimise automatiquement vos fiches produit Shopify
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Load products */}
      {step === "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optimisation automatique par IA</CardTitle>
            <CardDescription>
              FyxxLabs va analyser vos produits Shopify et proposer des améliorations pour :
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Titres produit plus accrocheurs et SEO-friendly</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Descriptions persuasives avec bénéfices mis en avant</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Meta titles et meta descriptions SEO optimisés</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Tags et catégorisation améliorés</li>
            </ul>
            <Button onClick={loadProducts} className="w-full bg-purple-600 hover:bg-purple-700">
              <Wand2 className="h-4 w-4 mr-2" /> Charger mes produits Shopify
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "loading-products" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500 mb-3" />
            <p className="text-muted-foreground">Chargement de vos produits Shopify…</p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select products */}
      {step === "products-loaded" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{products.length} produit(s) trouvé(s)</span>
                <Badge variant="secondary">{selectedIds.size} sélectionné(s)</Badge>
              </CardTitle>
              <CardDescription>Sélectionnez les produits à optimiser (max 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(p.id) ? "border-purple-300 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded border-gray-300"
                      disabled={!selectedIds.has(p.id) && selectedIds.size >= 10}
                    />
                    {p.first_image && (
                      <img src={p.first_image} alt={p.title} className="h-10 w-10 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.price ? `${p.price} €` : "Prix N/A"} · {p.images_count} image(s)
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={generateFixes}
            disabled={selectedIds.size === 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            <Zap className="h-4 w-4 mr-2" /> Générer les optimisations IA ({selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""})
          </Button>
        </>
      )}

      {step === "generating" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500 mb-3" />
            <p className="font-medium">L&apos;IA analyse vos produits…</p>
            <p className="text-sm text-muted-foreground mt-1">Génération des titres, descriptions et SEO optimisés</p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview fixes */}
      {step === "preview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" /> Aperçu des modifications
              </CardTitle>
              <CardDescription>Vérifiez les changements avant de les appliquer à votre boutique Shopify</CardDescription>
            </CardHeader>
          </Card>

          {fixes.map((fix) => (
            <Card key={fix.product_id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedFix(expandedFix === fix.product_id ? null : fix.product_id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground line-through">{fix.original_title}</p>
                    <p className="font-medium text-green-700">{fix.new_title}</p>
                  </div>
                  {expandedFix === fix.product_id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {fix.improvements.map((imp, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {imp}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              {expandedFix === fix.product_id && (
                <CardContent className="space-y-4 border-t pt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">SEO Title</p>
                    <p className="text-sm bg-green-50 p-2 rounded border border-green-200">{fix.new_seo_title}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">SEO Description</p>
                    <p className="text-sm bg-green-50 p-2 rounded border border-green-200">{fix.new_seo_description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                    <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200">{fix.new_tags}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Nouvelle description</p>
                    <div
                      className="text-sm bg-gray-50 p-3 rounded border prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: fix.new_body_html }}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("products-loaded")} className="flex-1">
              Modifier la sélection
            </Button>
            <Button onClick={applyFixes} className="flex-1 bg-green-600 hover:bg-green-700">
              <Zap className="h-4 w-4 mr-2" /> Appliquer {fixes.length} modification(s) sur Shopify
            </Button>
          </div>
        </>
      )}

      {step === "applying" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-500 mb-3" />
            <p className="font-medium">Application des modifications sur Shopify…</p>
            <p className="text-sm text-muted-foreground mt-1">Ne fermez pas cette page</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" /> Modifications appliquées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r) => (
              <div
                key={r.product_id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  r.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                {r.success ? (
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.error && <p className="text-xs text-red-600">{r.error}</p>}
                </div>
              </div>
            ))}
            <div className="pt-4 flex gap-3">
              <Button variant="outline" onClick={() => { setStep("idle"); setFixes([]); setResults([]); }}>
                Optimiser d&apos;autres produits
              </Button>
              <Link href="/app/dashboard">
                <Button>Retour au dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
