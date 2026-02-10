"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  ArrowRight,
  ExternalLink,
  ImageIcon,
  Plus,
  X,
  Store,
  Rocket,
  Package,
  Palette,
  ShoppingBag,
} from "lucide-react";

interface ScrapedProduct {
  title: string;
  description: string;
  price: string | null;
  currency: string | null;
  images: string[];
  brand: string | null;
  category: string | null;
  url: string;
}

interface GeneratedProduct {
  source_index?: number;
  title: string;
  body_html: string;
  seo_title?: string;
  seo_description?: string;
  tags: string;
  product_type: string;
  suggested_price: string;
  compare_at_price: string;
  is_hero?: boolean;
  why?: string;
}

interface StoreData {
  store_concept: {
    brand_name: string;
    tagline: string;
    niche: string;
    target_audience: string;
    brand_color: string;
  };
  products: GeneratedProduct[];
  extra_products: GeneratedProduct[];
  collection: { title: string; body_html: string };
}

interface CreateResult {
  title: string;
  success: boolean;
  error?: string;
  productId?: number;
}

type Step = "input" | "scraping" | "scraped" | "generating" | "preview" | "creating" | "done";

export function StoreGeneratorClient({
  storeId,
  shopDomain,
}: {
  storeId: string;
  shopDomain: string | null;
}) {
  const shopifyConnected = !!shopDomain;
  const [step, setStep] = useState<Step>("input");
  const [urls, setUrls] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState<ScrapedProduct[]>([]);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [createResults, setCreateResults] = useState<CreateResult[]>([]);
  const [totalCreated, setTotalCreated] = useState(0);
  const [brandName, setBrandName] = useState("");

  // Progress tracking
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addUrl = () => {
    if (urls.length < 5) setUrls([...urls, ""]);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 1) setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    setUrls(next);
  };

  const handleScrape = useCallback(async () => {
    const validUrls = urls.filter((u) => u.trim());
    if (validUrls.length === 0) return;
    setStep("scraping");
    setError(null);
    try {
      const res = await fetch("/api/store/generate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scrape", urls: validUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setScraped(data.products);
      setStep("scraped");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("input");
    }
  }, [urls]);

  const handleGenerate = useCallback(async () => {
    if (scraped.length === 0) return;
    setStep("generating");
    setError(null);
    setProgress(0);

    // Simulated progress for AI generation
    const labels = [
      "🎨 Création du branding…",
      "📝 Rédaction des fiches produit…",
      "🛒 Génération de produits complémentaires…",
      "🏷️ Optimisation SEO et pricing…",
      "✨ Finalisation du concept…",
    ];
    let idx = 0;
    setProgressLabel(labels[0]);
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const next = p + Math.random() * 6 + 2;
        idx = Math.min(Math.floor(next / 20), labels.length - 1);
        setProgressLabel(labels[idx]);
        return Math.min(next, 90);
      });
    }, 800);

    try {
      const res = await fetch("/api/store/generate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", scrapedProducts: scraped }),
      });
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setProgress(100);
      setProgressLabel("✅ Boutique générée !");
      await new Promise((r) => setTimeout(r, 500));
      setStoreData(data.store);
      setStep("preview");
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("scraped");
    }
  }, [scraped]);

  const handleCreate = useCallback(async () => {
    if (!storeData) return;
    setStep("creating");
    setError(null);
    setProgress(0);
    setProgressLabel("⏳ Connexion à Shopify…");

    try {
      const res = await fetch("/api/store/generate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          storeId,
          storeData,
          sourceProducts: scraped,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream non disponible");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setProgress(event.percent);
              setProgressLabel(event.label);
            } else if (event.type === "done") {
              setProgress(100);
              setProgressLabel("✅ Boutique créée !");
              setCreateResults(event.products ?? []);
              setTotalCreated(event.total_created ?? 0);
              setBrandName(event.brand_name ?? "");
              await new Promise((r) => setTimeout(r, 400));
              setStep("done");
            }
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("preview");
    }
  }, [storeData, storeId, scraped]);

  const reset = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setStep("input");
    setUrls([""]);
    setScraped([]);
    setStoreData(null);
    setCreateResults([]);
    setError(null);
    setProgress(0);
    setProgressLabel("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current); };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-purple-500" />
          Générateur de boutique IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Collez 1 à 5 liens produit → l&apos;IA génère une boutique complète → tout est créé sur Shopify en 1 clic.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {[
          { key: "input", label: "1. Liens", icon: LinkIcon },
          { key: "scraped", label: "2. Extraction", icon: Package },
          { key: "preview", label: "3. Boutique IA", icon: Sparkles },
          { key: "done", label: "4. Shopify", icon: Store },
        ].map((s, i) => {
          const stepOrder = ["input", "scraped", "preview", "done"];
          const currentOrder = stepOrder.indexOf(
            step === "scraping" ? "input" :
            step === "generating" ? "scraped" :
            step === "creating" ? "preview" :
            step
          );
          const thisOrder = stepOrder.indexOf(s.key);
          const isActive = thisOrder <= currentOrder;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`h-0.5 w-4 sm:w-6 ${isActive ? "bg-purple-500" : "bg-muted"}`} />
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isActive ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-3 w-3" />
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

      {/* Step 1: Input URLs */}
      {(step === "input" || step === "scraping") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Liens des produits sources
            </CardTitle>
            <CardDescription>
              Collez 1 à 5 liens (AliExpress, Amazon, Temu, etc.). L&apos;IA créera une boutique complète autour de ces produits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {urls.map((u, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={u}
                  onChange={(e) => updateUrl(i, e.target.value)}
                  placeholder={`https://fr.aliexpress.com/item/... (produit ${i + 1})`}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={step === "scraping"}
                  onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                />
                {urls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUrl(i)}
                    disabled={step === "scraping"}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              {urls.length < 5 && (
                <Button variant="outline" size="sm" onClick={addUrl} disabled={step === "scraping"}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un lien
                </Button>
              )}
            </div>

            <Button onClick={handleScrape} disabled={!urls.some((u) => u.trim()) || step === "scraping"} className="w-full mt-2">
              {step === "scraping" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Extraction des produits…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extraire les produits
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scraped products preview */}
      {step === "scraped" && scraped.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{scraped.length} produit(s) extraits</CardTitle>
              <CardDescription>
                L&apos;IA va créer une boutique complète avec ces produits + des produits complémentaires.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {scraped.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex gap-3">
                      {p.images[0] && (
                        <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{p.title}</p>
                        {p.price && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Prix source : {p.price} {p.currency ?? ""}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <ImageIcon className="h-3 w-3" /> {p.images.length} images
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={reset}>Retour</Button>
                <Button onClick={handleGenerate} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer la boutique avec l&apos;IA
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2.5: Generating with progress */}
      {step === "generating" && (
        <Card>
          <CardContent className="py-12 text-center space-y-5">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-500" />
            <h2 className="text-lg font-bold">L&apos;IA construit votre boutique…</h2>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-mono font-bold text-purple-600">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview generated store */}
      {step === "preview" && storeData && (
        <div className="space-y-4">
          {/* Brand concept card */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Palette className="h-5 w-5 text-purple-500" />
                Concept de marque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nom de marque</p>
                  <p className="text-2xl font-bold" style={{ color: storeData.store_concept.brand_color }}>
                    {storeData.store_concept.brand_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slogan</p>
                  <p className="text-lg italic">&ldquo;{storeData.store_concept.tagline}&rdquo;</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Niche</p>
                  <p className="font-medium">{storeData.store_concept.niche}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cible</p>
                  <p className="font-medium">{storeData.store_concept.target_audience}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Produits principaux ({storeData.products.length})
              </CardTitle>
              <CardDescription>Fiches optimisées avec images source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {storeData.products.map((p, i) => {
                  const sourceImgs = scraped[p.source_index ?? i]?.images ?? [];
                  return (
                    <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{p.title}</h3>
                            {p.is_hero && <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">Hero</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{p.product_type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {p.compare_at_price && (
                            <p className="text-xs line-through text-muted-foreground">{p.compare_at_price} €</p>
                          )}
                          <p className="text-lg font-bold text-emerald-600">{p.suggested_price} €</p>
                        </div>
                      </div>
                      {sourceImgs.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {sourceImgs.slice(0, 5).map((img, j) => (
                            <div key={j} className="w-14 h-14 flex-shrink-0 rounded border overflow-hidden bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt="" className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{p.tags}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Extra products */}
          {storeData.extra_products && storeData.extra_products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produits complémentaires ({storeData.extra_products.length})
                </CardTitle>
                <CardDescription>Générés par l&apos;IA pour compléter votre catalogue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {storeData.extra_products.map((p, i) => (
                    <div key={i} className="rounded-lg border border-dashed border-border p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{p.title}</h4>
                        <div className="text-right shrink-0">
                          {p.compare_at_price && (
                            <p className="text-xs line-through text-muted-foreground">{p.compare_at_price} €</p>
                          )}
                          <p className="font-bold text-emerald-600 text-sm">{p.suggested_price} €</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.product_type}</p>
                      {p.why && <p className="text-xs italic text-purple-500">💡 {p.why}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collection */}
          {storeData.collection && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Collection Shopify</p>
                <p className="font-semibold">{storeData.collection.title}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("scraped")}>Retour</Button>
            {shopifyConnected ? (
              <Button onClick={handleCreate} className="flex-1 text-base py-6" size="lg">
                <Upload className="h-5 w-5 mr-2" />
                Créer tout sur Shopify
                <Rocket className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <a href="/app/integrations" className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-base font-medium">
                Connecter Shopify pour créer la boutique
              </a>
            )}
          </div>
        </div>
      )}

      {/* Step 3.5: Creating with live progress */}
      {step === "creating" && (
        <Card>
          <CardContent className="py-12 text-center space-y-5">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-500" />
            <h2 className="text-lg font-bold">Création sur Shopify en cours…</h2>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[260px]">{progressLabel}</span>
                <span className="font-mono font-bold text-purple-600">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <Card className="border-emerald-500/30">
          <CardContent className="py-12 text-center space-y-5">
            <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Check className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Boutique créée avec succès ! 🎉</h2>
              {brandName && (
                <p className="text-lg text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">{brandName}</span> est prête à vendre.
                </p>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{totalCreated} produit(s) créés + 1 collection</p>
            </div>

            {/* Results list */}
            <div className="max-w-md mx-auto text-left space-y-1">
              {createResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={r.success ? "" : "text-red-500"}>{r.title}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 items-center pt-3">
              <a
                href={`https://${shopDomain ?? ""}/admin/products`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <ExternalLink className="h-5 w-5" />
                Voir les produits sur Shopify
              </a>
              <Button variant="outline" onClick={reset} className="mt-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Créer une autre boutique
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
