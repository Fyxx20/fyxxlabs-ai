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
  History,
  Trash2,
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

interface GeneratedStoreHistory {
  id: string;
  brand_name: string;
  brand_color: string | null;
  product_title: string;
  product_price: number | null;
  product_image: string | null;
  shopify_product_id: number | null;
  shop_domain: string | null;
  source_url: string | null;
  created_at: string;
}

type Step = "import" | "select" | "customize" | "create";

interface GenPhase {
  icon: string;
  label: string;
  status: "pending" | "active" | "done";
}

const GEN_PHASE_DEFS = [
  { icon: "🔍", label: "Analyse du produit source" },
  { icon: "🎨", label: "Création de l'identité de marque" },
  { icon: "📝", label: "Rédaction du copywriting" },
  { icon: "🛒", label: "Génération des sections" },
  { icon: "📊", label: "Optimisation conversion" },
  { icon: "🏷️", label: "Pricing & SEO" },
  { icon: "✨", label: "Finalisation" },
];

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
  const [genPhases, setGenPhases] = useState<GenPhase[]>([]);

  // History
  const [history, setHistory] = useState<GeneratedStoreHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load history on mount
  useEffect(() => {
    fetch("/api/store/generated-history")
      .then((r) => r.json())
      .then((d) => setHistory(d.stores ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

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

    // Initialize generation phases
    const phases: GenPhase[] = GEN_PHASE_DEFS.map((p) => ({
      ...p,
      status: "pending" as const,
    }));
    phases[0].status = "active";
    setGenPhases([...phases]);
    setProgressLabel(GEN_PHASE_DEFS[0].label);

    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const increment = Math.random() * 5 + 2;
        const next = Math.min(p + increment, 92);
        const phaseIdx = Math.min(
          Math.floor((next / 92) * GEN_PHASE_DEFS.length),
          GEN_PHASE_DEFS.length - 1
        );
        setGenPhases((prev) =>
          prev.map((ph, i) => ({
            ...ph,
            status: i < phaseIdx ? "done" : i === phaseIdx ? "active" : "pending",
          }))
        );
        setProgressLabel(GEN_PHASE_DEFS[phaseIdx].label);
        return next;
      });
    }, 900);

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

      // Complete all phases
      setGenPhases((prev) => prev.map((ph) => ({ ...ph, status: "done" as const })));
      setProgress(100);
      setProgressLabel("✅ Boutique générée !");
      await new Promise((r) => setTimeout(r, 800));

      setPageData(data.page);
      setStep("customize");
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setGenPhases([]);
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
              // Save to history
              const firstResult = (event.results ?? [])[0];
              const imgs = scraped ? scraped.images.filter((_, i) => selectedImages.has(i)) : [];
              try {
                await fetch("/api/store/generated-history", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    store_id: storeId,
                    brand_name: pageData.brand_name,
                    brand_color: pageData.brand_color,
                    product_title: pageData.product.title,
                    product_price: pageData.product.price,
                    product_image: imgs[0] ?? null,
                    shopify_product_id: firstResult?.productId ?? null,
                    shop_domain: shopDomain,
                    source_url: scraped?.url ?? null,
                  }),
                });
                // Refresh history
                const hRes = await fetch("/api/store/generated-history");
                const hData = await hRes.json();
                setHistory(hData.stores ?? []);
              } catch { /* silent */ }
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
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Créez votre boutique avec l&apos;IA</h1>
            <p className="text-xs text-muted-foreground">Créez une boutique Shopify optimisée en quelques secondes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {step === "import" ? "0" : step === "select" ? "1" : step === "customize" ? "2" : "3"}/3
            </span>
          </div>
          <span className="text-xs">Génération</span>
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
              {i > 0 && <ArrowRight className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground/30"}`} />}
              <button
                onClick={() => {
                  if (thisIdx < currentIdx) setStep(s.key as Step);
                }}
                disabled={thisIdx > currentIdx}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isActive
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/15"
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
          <div className="text-center space-y-3 pt-8">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Créez votre boutique en quelques secondes
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Collez un lien produit <span className="font-medium text-foreground">AliExpress</span>,{" "}
              <span className="font-medium text-foreground">Shopify</span> ou{" "}
              <span className="font-medium text-foreground">Amazon</span>{" "}
              et g\u00e9n\u00e9rez une boutique optimis\u00e9e en un clic.
            </p>
          </div>

          {/* URL Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Collez l'URL de votre produit..."
                className="h-12 text-sm pl-4 pr-4 rounded-xl border-border/60 focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-12 px-3 rounded-xl border border-border/60 bg-background text-sm"
            >
              <option value="fr">\ud83c\uddeb\ud83c\uddf7 Fran\u00e7ais</option>
              <option value="en">\ud83c\uddec\ud83c\udde7 English</option>
              <option value="es">\ud83c\uddea\ud83c\uddf8 Espa\u00f1ol</option>
              <option value="de">\ud83c\udde9\ud83c\uddea Deutsch</option>
            </select>
            <Button
              onClick={handleImport}
              disabled={!url.trim()}
              className="h-12 px-6 rounded-xl"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              G\u00e9n\u00e9rer
            </Button>
          </div>

          {/* Tip */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              1 produit par boutique pour le moment.
            </p>
          </div>

          {/* ─── HISTORY ─── */}
          {!historyLoading && history.length > 0 && (
            <div className="pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Dernières boutiques créées</h3>
                <span className="text-xs text-muted-foreground">({history.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="group relative flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md transition-all"
                  >
                    {/* Product image */}
                    {h.product_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.product_image}
                        alt={h.product_title}
                        className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Store className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 border"
                          style={{ backgroundColor: h.brand_color ?? "#000" }}
                        />
                        <span className="text-xs font-bold tracking-wide uppercase truncate">
                          {h.brand_name}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{h.product_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {h.product_price != null && (
                          <span className="text-xs font-semibold text-emerald-600">
                            {Number(h.product_price).toFixed(2)}€
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.shopify_product_id && h.shop_domain && (
                        <a
                          href={`https://${h.shop_domain}/admin/products/${h.shopify_product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md hover:bg-primary/10 text-primary"
                          title="Voir sur Shopify"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fetch("/api/store/generated-history", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: h.id }),
                          });
                          setHistory((prev) => prev.filter((x) => x.id !== h.id));
                        }}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ LOADING (import) ════════════ */}
      {step === "import" && loading && (
        <div className="max-w-md mx-auto mt-20 text-center space-y-8">
          {/* Animated spinner */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 border-[3px] border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-transparent border-t-primary rounded-full animate-spin" style={{ animationDuration: "1.5s" }} />
            <div className="absolute inset-2.5 border-[3px] border-transparent border-t-primary/60 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <LinkIcon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Extraction en cours…</h2>
            <p className="text-sm text-muted-foreground">Analyse de votre lien produit</p>
          </div>

          {/* URL pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted/50 rounded-full text-sm text-muted-foreground max-w-full">
            <span className="text-base">🔗</span>
            <span className="truncate max-w-[300px]">{url}</span>
          </div>

          {/* Animated phase steps */}
          <div className="space-y-3 text-left max-w-xs mx-auto">
            {["Connexion au site…", "Extraction des données produit…", "Analyse des images…", "Détection du prix et des infos…"].map((label, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 300}ms` }}>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
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
                        ? "border-primary ring-2 ring-primary/30"
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
                        isSelected ? "bg-primary text-primary-foreground" : "bg-background/80 border border-border"
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
              className=""
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

        </div>
      )}

      {/* ════════════ STEP 3: CUSTOMIZE (Split View) ════════════ */}
      {step === "customize" && (
        <div className="flex gap-0 -mx-4 -mt-2" style={{ height: "calc(100vh - 160px)" }}>
          {/* ── Left: Section navigation + editor ── */}
          <div className="w-[520px] flex-shrink-0 border-r overflow-y-auto flex flex-col">
            {/* Tabs: Content / Styles */}
            <div className="flex border-b sticky top-0 bg-background z-10">
              <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-primary">
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
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
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
                      <ShoppingBag className="h-4 w-4 text-primary" />
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
                      <Clock className="h-4 w-4 text-primary" />
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
                      <Type className="h-4 w-4 text-primary" />
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
                      <HelpCircle className="h-4 w-4 text-primary" />
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
                      <GitCompare className="h-4 w-4 text-primary" />
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
                      <BarChart3 className="h-4 w-4 text-primary" />
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
                  <Rocket className="h-4 w-4" />
                  Créer sur Shopify
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

      {/* ════════════ FULL-SCREEN GENERATION OVERLAY ════════════ */}
      {step === "select" && loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 40%, #0a0a1a 100%)" }}>
          <div className="max-w-md mx-auto text-center px-6 space-y-8">
            {/* Animated spinner rings */}
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 border-[3px] border-primary/10 rounded-full" />
              <div className="absolute inset-0 border-[3px] border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-3 border-[3px] border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-6 border-[3px] border-transparent border-t-cyan-400 rounded-full animate-spin" style={{ animationDuration: "1s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-9 w-9 text-blue-300 animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{progressLabel}</h2>
              <p className="text-blue-200/50 text-sm">Notre IA conçoit votre boutique haute conversion</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2 max-w-xs mx-auto">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
                  }}
                />
              </div>
              <p className="text-blue-200/30 text-xs font-mono">{Math.round(progress)}%</p>
            </div>

            {/* Generation phases checklist */}
            <div className="space-y-2.5 text-left max-w-xs mx-auto">
              {genPhases.map((phase, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    phase.status === "done"
                      ? "opacity-50"
                      : phase.status === "active"
                      ? "opacity-100"
                      : "opacity-20"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      phase.status === "done"
                        ? "bg-emerald-500/20"
                        : phase.status === "active"
                        ? "bg-primary/20"
                        : "bg-white/5"
                    }`}
                  >
                    {phase.status === "done" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : phase.status === "active" ? (
                      <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    )}
                  </div>
                  <span
                    className={`text-sm transition-colors duration-300 ${
                      phase.status === "done"
                        ? "text-emerald-300/70"
                        : phase.status === "active"
                        ? "text-white font-medium"
                        : "text-white/30"
                    }`}
                  >
                    {phase.icon} {phase.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Floating particles effect */}
            <div className="flex justify-center gap-3 pt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400/30 animate-bounce"
                  style={{ animationDelay: `${i * 200}ms`, animationDuration: "1.5s" }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════ STEP 4: CREATION (Full-screen cinematic) ════════════ */}
      {step === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #111827 50%, #0a0a1a 100%)" }}>
          <div className="max-w-lg mx-auto text-center px-6">
            {loading ? (
              <div className="space-y-10">
                {/* Main visual: Store being built */}
                <div className="relative">
                  <div className="absolute inset-0 -m-12 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                  <div className="relative mx-auto w-28 h-28 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/25">
                    <Store className="h-12 w-12 text-white" />
                    {/* Orbiting particles */}
                    <div className="absolute w-full h-full animate-spin" style={{ animationDuration: "3s" }}>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
                    </div>
                    <div className="absolute w-full h-full animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }}>
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                    </div>
                    <div className="absolute w-full h-full animate-spin" style={{ animationDuration: "5s" }}>
                      <div className="absolute -bottom-1.5 left-1/3 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                    </div>
                  </div>
                </div>

                {/* Brand name with shimmer */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{pageData.brand_name}</h2>
                  <p className="text-blue-200/50 text-sm">Création de votre boutique Shopify…</p>
                </div>

                {/* Progress ring + bar */}
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)",
                      }}
                    />
                    {/* Shimmer effect */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                        animation: "shimmer 2s infinite",
                      }}
                    />
                  </div>
                  <p className="text-sm text-white/70 font-medium">{progressLabel}</p>
                  <p className="text-xs text-white/25 font-mono">{Math.round(progress)}%</p>
                </div>

                {/* Phase indicators */}
                <div className="flex justify-center gap-8 max-w-sm mx-auto">
                  {[
                    { icon: "🔗", label: "Connexion", threshold: 10 },
                    { icon: "📸", label: "Images", threshold: 30 },
                    { icon: "📦", label: "Produit", threshold: 60 },
                    { icon: "✅", label: "Publication", threshold: 90 },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className={`text-center transition-all duration-700 ${
                        progress >= s.threshold ? "opacity-100 scale-100" : "opacity-20 scale-90"
                      }`}
                    >
                      <div className={`text-2xl mb-2 ${progress >= s.threshold ? "" : "grayscale"}`}>{s.icon}</div>
                      <p className="text-[10px] text-white/50 font-medium">{s.label}</p>
                      {progress >= s.threshold && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mx-auto mt-1.5 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Product being created */}
                {previewImages[0] && (
                  <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 max-w-sm mx-auto border border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewImages[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{pageData.product.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{pageData.product.product_type}</p>
                      {pageData.product.price > 0 && (
                        <p className="text-sm font-bold text-emerald-400 mt-1">${pageData.product.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : createResults.length > 0 ? (
              <div className="space-y-8">
                {/* Success celebration */}
                <div className="relative">
                  <div className="absolute inset-0 -m-16 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                  {/* Confetti particles */}
                  <div className="absolute inset-0 -m-20">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-ping"
                        style={{
                          background: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"][i % 6],
                          top: `${20 + Math.sin(i * 30) * 40}%`,
                          left: `${20 + Math.cos(i * 30) * 40}%`,
                          animationDelay: `${i * 150}ms`,
                          animationDuration: "2s",
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative mx-auto w-28 h-28 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                    <Check className="h-14 w-14 text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">Boutique créée avec succès ! 🎉</h2>
                  <p className="text-emerald-300/80 text-xl font-semibold">{pageData.brand_name}</p>
                  <p className="text-white/40 text-sm mt-2">Votre produit est en ligne et prêt à vendre</p>
                </div>

                {/* Results */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/5">
                  {createResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      {r.success ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <X className="h-4 w-4 text-red-400" />
                        </div>
                      )}
                      <span className="text-sm text-white/80">{r.title}</span>
                      {r.success && <span className="text-xs text-emerald-400/60 ml-auto">✓ Publié</span>}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 items-center pt-2">
                  <a
                    href={`https://${shopDomain ?? ""}/admin/products`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20 text-base"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Voir sur Shopify
                  </a>
                  <button
                    onClick={reset}
                    className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-2 mt-2"
                  >
                    <Sparkles className="h-4 w-4" /> Créer une autre boutique
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Shimmer keyframe */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
