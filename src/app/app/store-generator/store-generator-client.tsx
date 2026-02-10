"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Link as LinkIcon,
  Sparkles,
  Upload,
  Check,
  ArrowRight,
  ExternalLink,
  Plus,
  X,
  Store,
  Rocket,
  ShoppingBag,
  Star,
  BarChart3,
  GitCompare,
  Clock,
  HelpCircle,
  Type,
  Image as ImageLucide,
  Minus,
  ChevronDown,
  Eye,
} from "lucide-react";
import { StoreMobilePreview, type StorePageData } from "./store-mobile-preview";

/* ─── Types ─── */
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

interface CreateResult {
  title: string;
  success: boolean;
  error?: string;
  productId?: number;
}

type Step = "import" | "select" | "customize" | "create";

/* ─── Section definitions ─── */
const SECTIONS = [
  { id: "product-info", label: "Infos produit", icon: ShoppingBag },
  { id: "review", label: "Avis clients", icon: Star },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "advantages", label: "Avantages", icon: Check },
  { id: "hero", label: "Section héro", icon: Type },
  { id: "faq", label: "FAQ & Image", icon: HelpCircle },
  { id: "comparison", label: "Comparaison", icon: GitCompare },
  { id: "statistics", label: "Statistiques", icon: BarChart3 },
] as const;

/* ─── Default empty page data ─── */
function emptyPageData(): StorePageData {
  return {
    brand_name: "YOUR BRAND",
    brand_color: "#000000",
    banner_text: "Livraison gratuite dès 50€ d'achat | Livraison rapide dans le monde entier",
    product: {
      title: "",
      price: 0,
      compare_at_price: 0,
      short_description: "",
      features: [],
      tags: "",
      product_type: "",
    },
    review: { rating: 4.8, count: 12500, label: "Excellent" },
    hero: { headline: "", bold_word: "", subtext: "" },
    timeline: [],
    advantages: { title: "", items: [] },
    comparison: {
      our_name: "",
      our_subtitle: "Original",
      other_name: "Autres Marques",
      rows: [],
    },
    statistics: [],
    faq: [],
    trust_badges: ["Qualité garantie", "Retours 30 jours", "Livraison suivie"],
  };
}

/* ─── Main Component ─── */
export function StoreGeneratorClient({
  storeId,
  shopDomain,
}: {
  storeId: string;
  shopDomain: string | null;
}) {
  const shopifyConnected = !!shopDomain;

  // Wizard state
  const [step, setStep] = useState<Step>("import");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Import
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("fr");

  // Step 1 → Step 2 data
  const [scraped, setScraped] = useState<ScrapedProduct | null>(null);

  // Step 2: Select
  const [brandName, setBrandName] = useState("YOUR BRAND");
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  // Step 3: Customize
  const [pageData, setPageData] = useState<StorePageData>(emptyPageData());
  const [activeSection, setActiveSection] = useState("product-info");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  // Step 4: Create
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [createResults, setCreateResults] = useState<CreateResult[]>([]);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  /* ─── Step 1: Scrape URL ─── */
  const handleImport = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/generate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scrape", urls: [url.trim()] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur d'extraction");
      if (!data.products || data.products.length === 0) throw new Error("Aucun produit trouvé");

      const product = data.products[0];
      setScraped(product);
      setSelectedImages(new Set(product.images.map((_: string, i: number) => i)));
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [url]);

  /* ─── Step 2 → Step 3: Generate with AI ─── */
  const handleGenerate = useCallback(async () => {
    if (!scraped) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    const labels = [
      "🎨 Création du branding…",
      "📝 Rédaction des fiches produit…",
      "🛒 Génération des sections…",
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
      const imgs = scraped.images.filter((_, i) => selectedImages.has(i));

      const res = await fetch("/api/store/generate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-page",
          scrapedProduct: scraped,
          brandName,
          selectedImages: imgs,
          language,
        }),
      });

      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur IA");

      setProgress(100);
      setProgressLabel("✅ Page générée !");
      await new Promise((r) => setTimeout(r, 500));

      setPageData(data.page);
      setStep("customize");
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [scraped, selectedImages, brandName, language]);

  /* ─── Step 4: Create on Shopify ─── */
  const handleCreate = useCallback(async () => {
    if (!pageData || !scraped) return;
    setStep("create");
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressLabel("⏳ Connexion à Shopify…");

    try {
      const imgs = scraped.images.filter((_, i) => selectedImages.has(i));

      const res = await fetch("/api/store/generate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-product",
          storeId,
          pageData,
          images: imgs,
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
              setProgressLabel("✅ Produit créé !");
              setCreateResults(event.results ?? []);
              await new Promise((r) => setTimeout(r, 400));
              setLoading(false);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("customize");
      setLoading(false);
    }
  }, [pageData, scraped, selectedImages, storeId]);

  /* ─── Page data updaters ─── */
  const updateProduct = (field: string, value: unknown) => {
    setPageData((d) => ({ ...d, product: { ...d.product, [field]: value } }));
  };

  const updateFeature = (idx: number, value: string) => {
    setPageData((d) => {
      const features = [...d.product.features];
      features[idx] = value;
      return { ...d, product: { ...d.product, features } };
    });
  };

  const addFeature = () => {
    setPageData((d) => ({
      ...d,
      product: { ...d.product, features: [...d.product.features, "Nouvelle fonctionnalité"] },
    }));
  };

  const removeFeature = (idx: number) => {
    setPageData((d) => ({
      ...d,
      product: { ...d.product, features: d.product.features.filter((_, i) => i !== idx) },
    }));
  };

  const updateTimeline = (idx: number, field: string, value: string) => {
    setPageData((d) => {
      const timeline = [...d.timeline];
      timeline[idx] = { ...timeline[idx], [field]: value };
      return { ...d, timeline };
    });
  };

  const updateComparison = (idx: number, field: string, value: unknown) => {
    setPageData((d) => {
      const rows = [...d.comparison.rows];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...d, comparison: { ...d.comparison, rows } };
    });
  };

  const updateStatistic = (idx: number, field: string, value: string) => {
    setPageData((d) => {
      const statistics = [...d.statistics];
      statistics[idx] = { ...statistics[idx], [field]: value };
      return { ...d, statistics };
    });
  };

  const updateFaq = (idx: number, field: string, value: string) => {
    setPageData((d) => {
      const faq = [...d.faq];
      faq[idx] = { ...faq[idx], [field]: value };
      return { ...d, faq };
    });
  };

  const toggleImageSelect = (idx: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const reset = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setStep("import");
    setUrl("");
    setScraped(null);
    setPageData(emptyPageData());
    setBrandName("YOUR BRAND");
    setSelectedImages(new Set());
    setCreateResults([]);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setLoading(false);
  };

  /* ─── Selected images for preview ─── */
  const previewImages = scraped
    ? scraped.images.filter((_, i) => selectedImages.has(i))
    : [];

  /* ─── RENDER ─── */
  return (
    <div className="min-h-screen">
      {/* Top header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Créez votre boutique avec l&apos;IA</h1>
            <p className="text-xs text-muted-foreground">Créez une boutique Shopify optimisée en quelques secondes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {step === "import" ? "0" : step === "select" ? "1" : step === "customize" ? "2" : "3"}/3
            </span>
          </div>
          <span className="text-xs">Génération de boutique</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 border-b pb-4">
        {[
          { key: "import", label: "1. Importer", icon: LinkIcon },
          { key: "select", label: "2. Sélectionner", icon: ImageLucide },
          { key: "customize", label: "3. Personnaliser", icon: Sparkles },
          { key: "create", label: "4. Mettre à jour le thème", icon: Store },
        ].map((s, i) => {
          const stepOrder: Step[] = ["import", "select", "customize", "create"];
          const currentIdx = stepOrder.indexOf(step);
          const thisIdx = stepOrder.indexOf(s.key as Step);
          const isActive = thisIdx <= currentIdx;
          const isCurrent = thisIdx === currentIdx;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className={`h-3 w-3 ${isActive ? "text-blue-500" : "text-muted-foreground/30"}`} />}
              <button
                onClick={() => {
                  if (thisIdx < currentIdx) setStep(s.key as Step);
                }}
                disabled={thisIdx > currentIdx}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-sm"
                    : isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer hover:bg-blue-100"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Fermer</button>
        </div>
      )}

      {/* ════════════ STEP 1: IMPORT ════════════ */}
      {step === "import" && !loading && (
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3 pt-12">
            <h2 className="text-3xl font-bold">
              Créez votre boutique en quelques secondes avec{" "}
              <span className="text-blue-600">FyxxLabs</span>
              <Badge className="ml-2 bg-blue-600 text-white text-[10px] align-top">NEW</Badge>
            </h2>
            <p className="text-muted-foreground text-sm">
              Transformez un lien de produit en boutique qui convertie. Collez votre lien{" "}
              <span className="text-orange-500 font-medium">AliExpress</span>,{" "}
              <span className="font-medium">Shopify</span>{" "}
              <span className="text-yellow-600 font-medium">Amazon</span>{" "}
              ci-dessous, générez et personnalisez.
            </p>
          </div>

          {/* URL Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Entrez l'URL de votre produit AliExpress..."
                className="h-12 text-sm pl-4 pr-4 rounded-xl border-2 focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-12 px-3 rounded-xl border-2 bg-background text-sm"
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
              <option value="es">🇪🇸 Español</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
            <Button
              onClick={handleImport}
              disabled={!url.trim()}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Générer
            </Button>
          </div>

          {/* Tip */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-4 py-2 rounded-full">
              <span>💡</span>
              <span>1 produit par boutique pour le moment. Multi-produits bientôt disponible !</span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ LOADING (import) ════════════ */}
      {step === "import" && loading && (
        <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
          <Sparkles className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
          <h2 className="text-lg font-bold text-blue-600">Génération de votre boutique....</h2>

          <div className="rounded-lg border p-3 text-left flex items-center gap-3">
            <span className="text-lg">🔗</span>
            <span className="text-sm text-muted-foreground truncate">{url}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Chargement...</span>
              <span>6%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-[6%] bg-blue-500 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Bounce dots */}
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i <= 1 ? "bg-emerald-500" : i === 2 ? "bg-blue-500" : "bg-gray-300"
                } animate-bounce`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Scraped preview */}
          {scraped && (
            <div className="rounded-lg border p-4 text-left space-y-1">
              <p className="font-medium text-sm line-clamp-2">{scraped.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{scraped.description?.slice(0, 100)}...</p>
              {scraped.price && <p className="text-sm font-bold">$ {scraped.price}</p>}
            </div>
          )}
        </div>
      )}

      {/* ════════════ STEP 2: SELECT IMAGES ════════════ */}
      {step === "select" && scraped && (
        <div className="space-y-6">
          {/* Brand name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nom de votre boutique (peut être modifié à tout moment)</Label>
            <Input
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
                setPageData((d) => ({ ...d, brand_name: e.target.value }));
              }}
              className="max-w-md h-11"
              placeholder="YOUR BRAND"
            />
          </div>

          {/* AI image generation placeholder */}
          <div className="bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
            <Button variant="outline" className="gap-2" disabled>
              <Sparkles className="h-4 w-4" />
              Générer des images avec l&apos;IA
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Bientôt disponible</p>
          </div>

          {/* Image selection */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Sélectionnez les images du produit que vous souhaitez ajouter</h3>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Conseil:</strong> ✨ Vous pouvez réorganiser les images en les faisant glisser dans l&apos;ordre de votre choix.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {scraped.images.map((img, i) => {
                const isSelected = selectedImages.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleImageSelect(i)}
                    className={`relative group rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : "border-gray-200 hover:border-gray-300 opacity-60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Product ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3C/svg%3E";
                      }}
                    />
                    {/* Selection badge */}
                    <div
                      className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected ? "bg-blue-500 text-white" : "bg-white/80 border border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    {/* AI edit overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Modifier avec IA
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {scraped.images.length > 10 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <ChevronDown className="h-3 w-3 mr-1" />
                Voir plus d&apos;images ({scraped.images.length - 10})
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep("import")}>Retour</Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedImages.size === 0 || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Génération en cours...
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Progress bar during generation */}
          {loading && (
            <div className="max-w-md mx-auto space-y-2 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-mono font-bold text-blue-600">{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ STEP 3: CUSTOMIZE (Split View) ════════════ */}
      {step === "customize" && (
        <div className="flex gap-0 -mx-4 -mt-2" style={{ height: "calc(100vh - 160px)" }}>
          {/* ── Left: Section navigation + editor ── */}
          <div className="w-[520px] flex-shrink-0 border-r overflow-y-auto flex flex-col">
            {/* Tabs: Content / Styles */}
            <div className="flex border-b sticky top-0 bg-background z-10">
              <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
                Content
              </button>
              <button className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                Styles
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Section list */}
              <div className="w-[180px] border-r flex-shrink-0 overflow-y-auto">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors text-left ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "text-muted-foreground hover:bg-muted/50 border-l-2 border-transparent"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              {/* Editor panel */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* ── PRODUCT INFO ── */}
                {activeSection === "product-info" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                      Informations sur le Produit
                    </h3>

                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <span>📝</span> Titre du produit
                      </Label>
                      <Input
                        value={pageData.product.title}
                        onChange={(e) => updateProduct("title", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <span>💰</span> Prix de vente du produit
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pageData.product.price}
                        onChange={(e) => updateProduct("price", parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <span>🏷️</span> Prix barré (ancien prix)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pageData.product.compare_at_price}
                        onChange={(e) => updateProduct("compare_at_price", parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <span>✅</span> Points de fonctionnalités ({pageData.product.features.length})
                      </Label>
                      {pageData.product.features.map((f, i) => (
                        <div key={i} className="flex gap-1.5 items-center">
                          <Label className="text-[10px] text-muted-foreground w-24 shrink-0">Fonctionnalité {i + 1}</Label>
                          <Input
                            value={f}
                            onChange={(e) => updateFeature(i, e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 p-1">
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={addFeature}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <span>📄</span> Description courte
                      </Label>
                      <textarea
                        value={pageData.product.short_description}
                        onChange={(e) => updateProduct("short_description", e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ── REVIEW ── */}
                {activeSection === "review" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Avis clients
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Note (sur 5)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={pageData.review.rating}
                        onChange={(e) => setPageData((d) => ({ ...d, review: { ...d.review, rating: parseFloat(e.target.value) || 0 } }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nombre d&apos;avis</Label>
                      <Input
                        type="number"
                        value={pageData.review.count}
                        onChange={(e) => setPageData((d) => ({ ...d, review: { ...d.review, count: parseInt(e.target.value) || 0 } }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label (ex: Excellent)</Label>
                      <Input
                        value={pageData.review.label}
                        onChange={(e) => setPageData((d) => ({ ...d, review: { ...d.review, label: e.target.value } }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* ── TIMELINE ── */}
                {activeSection === "timeline" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Timeline
                    </h3>
                    {pageData.timeline.map((t, i) => (
                      <div key={i} className="space-y-1.5 border-b pb-3 last:border-0">
                        <Label className="text-xs font-medium">Étape {i + 1}</Label>
                        <Input
                          value={t.period}
                          onChange={(e) => updateTimeline(i, "period", e.target.value)}
                          placeholder="Période"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={t.text}
                          onChange={(e) => updateTimeline(i, "text", e.target.value)}
                          placeholder="Description"
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPageData((d) => ({ ...d, timeline: [...d.timeline, { period: "Nouvelle étape", text: "Description" }] }))}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                    </Button>
                  </div>
                )}

                {/* ── ADVANTAGES ── */}
                {activeSection === "advantages" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      Avantages
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Titre de la section</Label>
                      <textarea
                        value={pageData.advantages.title}
                        onChange={(e) => setPageData((d) => ({ ...d, advantages: { ...d.advantages, title: e.target.value } }))}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      />
                    </div>
                    {pageData.advantages.items.map((item, i) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        <Input
                          value={item}
                          onChange={(e) => {
                            const items = [...pageData.advantages.items];
                            items[i] = e.target.value;
                            setPageData((d) => ({ ...d, advantages: { ...d.advantages, items } }));
                          }}
                          className="h-8 text-xs flex-1"
                        />
                        <button
                          onClick={() => {
                            const items = pageData.advantages.items.filter((_, j) => j !== i);
                            setPageData((d) => ({ ...d, advantages: { ...d.advantages, items } }));
                          }}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPageData((d) => ({ ...d, advantages: { ...d.advantages, items: [...d.advantages.items, "Nouvel avantage"] } }))}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                    </Button>
                  </div>
                )}

                {/* ── HERO ── */}
                {activeSection === "hero" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Type className="h-4 w-4 text-blue-600" />
                      Section héro
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Titre accrocheur</Label>
                      <textarea
                        value={pageData.hero.headline}
                        onChange={(e) => setPageData((d) => ({ ...d, hero: { ...d.hero, headline: e.target.value } }))}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mot en gras (italique)</Label>
                      <Input
                        value={pageData.hero.bold_word}
                        onChange={(e) => setPageData((d) => ({ ...d, hero: { ...d.hero, bold_word: e.target.value } }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sous-titre</Label>
                      <Input
                        value={pageData.hero.subtext}
                        onChange={(e) => setPageData((d) => ({ ...d, hero: { ...d.hero, subtext: e.target.value } }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* ── FAQ ── */}
                {activeSection === "faq" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600" />
                      FAQ
                    </h3>
                    {pageData.faq.map((f, i) => (
                      <div key={i} className="space-y-1.5 border-b pb-3 last:border-0">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-medium">Question {i + 1}</Label>
                          <button
                            onClick={() => setPageData((d) => ({ ...d, faq: d.faq.filter((_, j) => j !== i) }))}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                        <Input
                          value={f.question}
                          onChange={(e) => updateFaq(i, "question", e.target.value)}
                          className="h-8 text-xs"
                        />
                        <textarea
                          value={f.answer}
                          onChange={(e) => updateFaq(i, "answer", e.target.value)}
                          rows={2}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPageData((d) => ({ ...d, faq: [...d.faq, { question: "Nouvelle question ?", answer: "Réponse ici." }] }))}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                    </Button>
                  </div>
                )}

                {/* ── COMPARISON ── */}
                {activeSection === "comparison" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <GitCompare className="h-4 w-4 text-blue-600" />
                      Comparaison
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nom de notre produit</Label>
                      <Input
                        value={pageData.comparison.our_name}
                        onChange={(e) => setPageData((d) => ({ ...d, comparison: { ...d.comparison, our_name: e.target.value } }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sous-titre</Label>
                      <Input
                        value={pageData.comparison.our_subtitle}
                        onChange={(e) => setPageData((d) => ({ ...d, comparison: { ...d.comparison, our_subtitle: e.target.value } }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    {pageData.comparison.rows.map((row, i) => (
                      <div key={i} className="flex gap-1.5 items-center text-xs">
                        <Input
                          value={row.feature}
                          onChange={(e) => updateComparison(i, "feature", e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <label className="flex items-center gap-0.5 text-[10px] shrink-0">
                          <input
                            type="checkbox"
                            checked={row.us}
                            onChange={(e) => updateComparison(i, "us", e.target.checked)}
                            className="rounded"
                          />
                          Nous
                        </label>
                        <label className="flex items-center gap-0.5 text-[10px] shrink-0">
                          <input
                            type="checkbox"
                            checked={row.them}
                            onChange={(e) => updateComparison(i, "them", e.target.checked)}
                            className="rounded"
                          />
                          Eux
                        </label>
                        <button
                          onClick={() => {
                            const rows = pageData.comparison.rows.filter((_, j) => j !== i);
                            setPageData((d) => ({ ...d, comparison: { ...d.comparison, rows } }));
                          }}
                          className="text-red-400 hover:text-red-600 p-0.5"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setPageData((d) => ({
                          ...d,
                          comparison: {
                            ...d.comparison,
                            rows: [...d.comparison.rows, { feature: "Nouvelle feature", us: true, them: false }],
                          },
                        }));
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                    </Button>
                  </div>
                )}

                {/* ── STATISTICS ── */}
                {activeSection === "statistics" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      Statistiques
                    </h3>
                    {pageData.statistics.map((stat, i) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        <Input
                          value={stat.value}
                          onChange={(e) => updateStatistic(i, "value", e.target.value)}
                          className="h-8 text-xs w-20"
                          placeholder="95%"
                        />
                        <Input
                          value={stat.label}
                          onChange={(e) => updateStatistic(i, "label", e.target.value)}
                          className="h-8 text-xs flex-1"
                          placeholder="Clients satisfaits"
                        />
                        <button
                          onClick={() => {
                            const statistics = pageData.statistics.filter((_, j) => j !== i);
                            setPageData((d) => ({ ...d, statistics }));
                          }}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPageData((d) => ({ ...d, statistics: [...d.statistics, { value: "90%", label: "Clients satisfaits" }] }))}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom navigation */}
            <div className="border-t p-3 flex justify-between sticky bottom-0 bg-background z-10">
              <Button variant="outline" onClick={() => setStep("select")}>Retour</Button>
              {shopifyConnected ? (
                <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 gap-2">
                  <Store className="h-4 w-4" />
                  Connectez votre Shopify
                </Button>
              ) : (
                <a
                  href="/app/integrations"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  <Store className="h-4 w-4" />
                  Connectez votre Shopify
                </a>
              )}
            </div>
          </div>

          {/* ── Right: Preview ── */}
          <div className="flex-1 bg-muted/30 overflow-y-auto flex flex-col">
            {/* Preview toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <select className="text-xs border rounded px-2 py-1 bg-background">
                  <option>Page de produit</option>
                </select>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    previewMode === "mobile" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                  }`}
                >
                  Mobile
                </button>
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    previewMode === "desktop" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                  }`}
                >
                  Desktop
                </button>
              </div>
              <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                <Eye className="h-3 w-3" /> Voir la boutique
              </button>
            </div>

            {/* Phone preview */}
            <div className="flex-1 flex items-start justify-center py-6 px-4">
              <div className={previewMode === "desktop" ? "w-full max-w-[800px]" : ""}>
                <StoreMobilePreview
                  data={pageData}
                  images={previewImages}
                  activeSection={activeSection}
                  heroImage={previewImages[3] ?? previewImages[1]}
                  faqImage={previewImages[2] ?? previewImages[1]}
                  beforeImage={previewImages.length > 4 ? previewImages[4] : undefined}
                  afterImage={previewImages.length > 5 ? previewImages[5] : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ STEP 4: CREATE (Loading / Done) ════════════ */}
      {step === "create" && (
        <div className="max-w-lg mx-auto py-16 text-center space-y-6">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <h2 className="text-xl font-bold">Création sur Shopify en cours…</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[260px]">{progressLabel}</span>
                  <span className="font-mono font-bold text-blue-600">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </>
          ) : createResults.length > 0 ? (
            <>
              <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Check className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold">Boutique créée avec succès ! 🎉</h2>
              <p className="text-muted-foreground">{pageData.brand_name} est prête à vendre.</p>
              <div className="space-y-1">
                {createResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm justify-center">
                    {r.success ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-red-500" />}
                    <span>{r.title}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 items-center pt-3">
                <a
                  href={`https://${shopDomain ?? ""}/admin/products`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ExternalLink className="h-5 w-5" />
                  Voir sur Shopify
                </a>
                <Button variant="outline" onClick={reset} className="mt-2">
                  <Sparkles className="h-4 w-4 mr-2" /> Créer une autre boutique
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
