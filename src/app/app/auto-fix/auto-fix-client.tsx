"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Check, X, Loader2, Eye, Zap, ArrowLeft, ChevronDown, ChevronUp, Search, FileText, Tag, Type } from "lucide-react";
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

  /* ── step indicator ── */
  const stepConfig = [
    { key: "idle", label: "Charger", icon: Search },
    { key: "products-loaded", label: "S\u00e9lection", icon: Eye },
    { key: "preview", label: "Aper\u00e7u", icon: Wand2 },
    { key: "done", label: "Termin\u00e9", icon: Check },
  ];
  const currentIdx = (() => {
    if (["idle", "loading-products"].includes(step)) return 0;
    if (["products-loaded", "generating"].includes(step)) return 1;
    if (["preview", "applying"].includes(step)) return 2;
    return 3;
  })();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            FyxxLabs AI Auto-Fix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            L&apos;IA analyse et optimise automatiquement vos fiches produit Shopify
          </p>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center justify-between gap-2">
        {stepConfig.map((s, i) => {
          const Icon = s.icon;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary/10 text-primary ring-2 ring-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
              {i < stepConfig.length - 1 && (
                <div className={`hidden sm:block absolute h-0.5 w-full ${done ? "bg-primary" : "bg-muted"}`} style={{ display: "none" }} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="py-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Hero card ── */}
      {step === "idle" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-8 md:p-12">
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>

            <div className="space-y-2 max-w-lg">
              <h2 className="text-2xl font-bold">Optimisation automatique par IA</h2>
              <p className="text-muted-foreground">
                FyxxLabs analyse vos produits Shopify et propose des am\u00e9liorations instantan\u00e9es pour booster vos ventes.
              </p>
            </div>

            <Button onClick={loadProducts} size="lg" className="gap-2 px-8">
              <Wand2 className="h-5 w-5" /> Charger mes produits Shopify
            </Button>

            {/* feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full pt-4">
              {[
                { icon: Type, title: "Titres SEO", desc: "Titres accrocheurs et optimis\u00e9s pour le r\u00e9f\u00e9rencement" },
                { icon: FileText, title: "Descriptions", desc: "Textes persuasifs avec b\u00e9n\u00e9fices mis en avant" },
                { icon: Search, title: "Meta SEO", desc: "Meta title & description optimis\u00e9s" },
                { icon: Tag, title: "Tags", desc: "Cat\u00e9gorisation et tags am\u00e9lior\u00e9s" },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border bg-background/80 backdrop-blur p-4 text-left space-y-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "loading-products" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Chargement de vos produits Shopify&hellip;</p>
              <p className="text-sm text-muted-foreground mt-1">Connexion \u00e0 votre boutique en cours</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Select products ── */}
      {step === "products-loaded" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{products.length} produit(s) trouv\u00e9(s)</span>
                <Badge variant="secondary">{selectedIds.size} s\u00e9lectionn\u00e9(s)</Badge>
              </CardTitle>
              <CardDescription>S\u00e9lectionnez les produits \u00e0 optimiser (max 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(p.id) ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded border-border accent-primary"
                      disabled={!selectedIds.has(p.id) && selectedIds.size >= 10}
                    />
                    {p.first_image && (
                      <img src={p.first_image} alt={p.title} className="h-10 w-10 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.price ? `${p.price} \u20ac` : "Prix N/A"} \u00b7 {p.images_count} image(s)
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
            size="lg"
            className="w-full gap-2"
          >
            <Zap className="h-4 w-4" /> G\u00e9n\u00e9rer les optimisations IA ({selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""})
          </Button>
        </>
      )}

      {step === "generating" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">L&apos;IA analyse vos produits&hellip;</p>
              <p className="text-sm text-muted-foreground mt-1">G\u00e9n\u00e9ration des titres, descriptions et SEO optimis\u00e9s</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview fixes ── */}
      {step === "preview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" /> Aper\u00e7u des modifications
              </CardTitle>
              <CardDescription>V\u00e9rifiez les changements avant de les appliquer \u00e0 votre boutique Shopify</CardDescription>
            </CardHeader>
          </Card>

          {fixes.map((fix) => (
            <Card key={fix.product_id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedFix(expandedFix === fix.product_id ? null : fix.product_id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground line-through">{fix.original_title}</p>
                    <p className="font-medium text-green-700 dark:text-green-400">{fix.new_title}</p>
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
                    <p className="text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">{fix.new_seo_title}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">SEO Description</p>
                    <p className="text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">{fix.new_seo_description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                    <p className="text-sm bg-primary/5 p-2 rounded border border-primary/20">{fix.new_tags}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Nouvelle description</p>
                    <div
                      className="text-sm bg-muted/50 p-3 rounded border prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: fix.new_body_html }}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("products-loaded")} className="flex-1">
              Modifier la s\u00e9lection
            </Button>
            <Button onClick={applyFixes} className="flex-1 gap-2">
              <Zap className="h-4 w-4" /> Appliquer {fixes.length} modification(s) sur Shopify
            </Button>
          </div>
        </>
      )}

      {step === "applying" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Application des modifications sur Shopify&hellip;</p>
              <p className="text-sm text-muted-foreground mt-1">Ne fermez pas cette page</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Results ── */}
      {step === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              Modifications appliqu\u00e9es
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r) => (
              <div
                key={r.product_id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  r.success ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                }`}
              >
                {r.success ? (
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.error && <p className="text-xs text-red-600 dark:text-red-400">{r.error}</p>}
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
