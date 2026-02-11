"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStoreSchema, type CreateStoreInput } from "@/lib/validations/store";
import { StoreGoal } from "@/lib/supabase/database.types";
import { HelpCircle, Loader2, Sparkles } from "lucide-react";

const GOAL_OPTIONS: { value: StoreGoal; label: string }[] = [
  { value: "sales", label: "Augmenter les ventes" },
  { value: "conversion", label: "Améliorer le taux de conversion" },
  { value: "roas", label: "Optimiser le ROAS" },
  { value: "traffic", label: "Augmenter le trafic qualifié" },
  { value: "trust", label: "Renforcer la confiance" },
  { value: "other", label: "Autre" },
];

// Liste des plateformes avec tag Connectable / Scan URL (voir lib/connectors/registry)

const STAGE_OPTIONS = [
  { value: "0_sales", label: "0 vente" },
  { value: "some_sales", label: "Quelques ventes" },
  { value: "regular_sales", label: "Ventes régulières" },
  { value: "profitable", label: "Déjà rentable" },
];

const TRAFFIC_OPTIONS = [
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
  { value: "seo", label: "SEO" },
  { value: "email", label: "Email" },
  { value: "influence", label: "Influence" },
  { value: "other", label: "Autre" },
];

const AOV_OPTIONS = [
  { value: "0_30", label: "0–30 €" },
  { value: "30_80", label: "30–80 €" },
  { value: "80_150", label: "80–150 €" },
  { value: "150_plus", label: "150 €+" },
];

const COUNTRY_OPTIONS = [
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "CA", label: "Canada" },
  { value: "LU", label: "Luxembourg" },
  { value: "MA", label: "Maroc" },
];

function isSchemaError(message: string): boolean {
  return (
    message?.includes("schema cache") === true ||
    message?.includes("does not exist") === true ||
    message?.includes("relation \"stores\"") === true ||
    message?.includes("Base non initialisée") === true
  );
}

function normalizeShopifyDomain(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.endsWith(".myshopify.com") ? host : null;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("mode") === "add";
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateStoreInput>({
    name: "",
    website_url: "https://placeholder.myshopify.com",
    goal: "conversion",
    platform: "shopify",
    stage: "0_sales",
    traffic_source: "other",
    aov_bucket: "0_30",
    country: "FR",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopifyDomainInput, setShopifyDomainInput] = useState("");
  const shopifyDomainFromInput = normalizeShopifyDomain(shopifyDomainInput);

  const parsed = createStoreSchema.safeParse(form);
  const canNextStep1 = form.name.trim().length > 0;
  const canNextStep2 = !!shopifyDomainFromInput;

  const canNextStep3 = parsed.success;

  const summary = {
    name: form.name.trim() || "—",
    url: shopifyDomainFromInput ?? "—",
    platform: "Shopify",
    goal: GOAL_OPTIONS.find((o) => o.value === form.goal)?.label ?? "—",
  };

  async function handleFinish() {
    setError(null);
    setLoading(true);
    if (!shopifyDomainFromInput) {
      setError("Ajoute ton domaine Shopify interne (ex: maboutique.myshopify.com).");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée. Reconnecte-toi.");
      setLoading(false);
      return;
    }

    const storePayload: CreateStoreInput = {
      ...form,
      platform: "shopify",
      website_url: `https://${shopifyDomainFromInput}`,
    };

    const res = await fetch("/api/store/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storePayload),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409 && (data.error === "store_exists" || data.storeId)) {
        const shopDomain = shopifyDomainFromInput;
        if (!shopDomain) {
          setError("Ajoute ton domaine Shopify interne (ex: maboutique.myshopify.com).");
          setLoading(false);
          return;
        }
        const { data: existingStore } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingStore?.id) {
          setLoading(false);
          window.location.href = `/api/integrations/shopify/start?store_id=${encodeURIComponent(existingStore.id)}&shop=${encodeURIComponent(shopDomain)}`;
          return;
        }
        setError("STORE_EXISTS");
        setLoading(false);
        router.push("/app/dashboard");
        router.refresh();
        return;
      }
      if (res.status === 409 && data.error === "store_limit_reached") {
        const shopDomain = shopifyDomainFromInput;
        if (!shopDomain) {
          setError("Ajoute ton domaine Shopify interne (ex: maboutique.myshopify.com).");
          setLoading(false);
          return;
        }
        const { data: existingStore } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingStore?.id) {
          setLoading(false);
          window.location.href = `/api/integrations/shopify/start?store_id=${encodeURIComponent(existingStore.id)}&shop=${encodeURIComponent(shopDomain)}`;
          return;
        }
        setError(data.message ?? "Limite de boutiques atteinte pour ton abonnement.");
        setLoading(false);
        return;
      }
      const message =
        typeof data.error === "string"
          ? data.error
          : Array.isArray(data.error)
            ? Object.values(data.error).flat().join(" ")
            : "Erreur lors de la création";
      if (isSchemaError(message)) {
        setError("BASE_ERROR");
      } else {
        setError(message);
      }
      setLoading(false);
      return;
    }

    const storeId = data.id;
    if (!storeId) {
      setLoading(false);
      router.push("/app/dashboard");
      router.refresh();
      return;
    }

    await supabase
      .from("user_onboarding")
      .upsert(
        { user_id: user.id, completed: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    const shopDomain = shopifyDomainFromInput;
    if (!shopDomain) {
      setError("Ajoute ton domaine Shopify interne (ex: maboutique.myshopify.com).");
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.href = `/api/integrations/shopify/start?store_id=${encodeURIComponent(storeId)}&shop=${encodeURIComponent(shopDomain)}`;
    return;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 -top-16 h-80 w-80 rounded-full bg-violet-600/[0.22] blur-3xl" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-cyan-500/[0.2] blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
            <Sparkles className="h-3.5 w-3.5" />
            Setup premium FyxxLabs
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Configure ta boutique
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            On prépare ton espace pour lancer une analyse ultra pertinente.
          </p>
          {isAddMode && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => router.push("/app/dashboard")}
              >
                Quitter et revenir au dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium ${
                step >= s
                  ? "border-violet-400/50 bg-violet-500/90 text-white"
                  : "border-white/15 bg-white/5 text-slate-300"
              }`}
            >
              {s}
            </div>
          ))}
          <span className="ml-2 text-sm text-slate-300">
            {step} / 3
          </span>
        </div>

        <Card className="border-white/10 bg-white/[0.05] shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && "Nom de ta boutique"}
              {step === 2 && "Connexion Shopify"}
              {step === 3 && "Récapitulatif de l'analyse"}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {step === 1 && "Un nom pour reconnaître cette boutique dans ton dashboard."}
              {step === 2 && "Connecte simplement ta boutique Shopify, sans URL publique ni plateforme à choisir."}
              {step === 3 && "Ces informations permettent à FyxxLabs d'adapter l'analyse."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error === "BASE_ERROR" && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Base non initialisée
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  La table stores est introuvable. Applique les migrations Supabase ou vérifie tes
                  variables d’environnement.
                </p>
                {process.env.NODE_ENV === "development" && (
                  <Link href="/debug" className="mt-3 inline-block text-sm font-medium text-amber-800 underline dark:text-amber-200">
                    Voir la doc / logs
                  </Link>
                )}
              </div>
            )}
            {error === "STORE_EXISTS" && (
              <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-white">
                Boutique déjà configurée. Redirection…
              </p>
            )}
            {error && error !== "BASE_ERROR" && error !== "STORE_EXISTS" && (
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-100">Nom</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Boutique Bijoux Paris"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="border-white/15 bg-slate-900/50 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-300">
                    Tu pourras modifier plus tard.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-500"
                  onClick={() => setStep(2)}
                  disabled={!canNextStep1}
                >
                  Suivant
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="rounded-lg border border-white/15 bg-white/[0.03] p-3">
                  <p className="text-sm font-medium text-white">Connexion directe Shopify</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Renseigne uniquement ton domaine Shopify interne, puis clique sur connecter.
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-white/15 bg-white/[0.03] p-3">
                  <Label htmlFor="shopify_domain" className="text-slate-100">Boutique Shopify (.myshopify.com)</Label>
                  <Input
                    id="shopify_domain"
                    type="text"
                    placeholder="maboutique.myshopify.com"
                    value={shopifyDomainInput}
                    onChange={(e) => setShopifyDomainInput(e.target.value)}
                    className="border-white/15 bg-slate-900/50 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-300">
                    Exemple: `ma-boutique.myshopify.com`. Tu choisiras ensuite et autoriseras la connexion sur Shopify.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setStep(1)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500"
                    onClick={handleFinish}
                    disabled={loading || !canNextStep2}
                  >
                    {loading ? "Connexion Shopify…" : "Connecter Shopify"}
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-100">Objectif principal</Label>
                  <div className="grid gap-2">
                    {GOAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, goal: opt.value }))}
                        className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                          form.goal === opt.value
                            ? "border-violet-400/40 bg-violet-500/15 text-white"
                            : "border-white/15 bg-white/[0.02] text-slate-200 hover:bg-white/[0.08]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-300">Contexte (30 secondes)</p>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Étape actuelle
                    <span
                      title="Ça adapte le niveau de conseils à ton stade (débutant à rentable)."
                      className="cursor-help text-slate-400"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {STAGE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, stage: o.value as CreateStoreInput["stage"] }))}
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                          form.stage === o.value
                            ? "border-violet-400/40 bg-violet-500/15 text-white"
                            : "border-white/15 bg-white/[0.02] text-slate-200 hover:bg-white/[0.08]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Source de trafic principale
                    <span
                      title="D’où priorité CRO / Ads selon ta source (Meta, Google, SEO…)."
                      className="cursor-help text-slate-400"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TRAFFIC_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, traffic_source: o.value as CreateStoreInput["traffic_source"] }))}
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                          form.traffic_source === o.value
                            ? "border-violet-400/40 bg-violet-500/15 text-white"
                            : "border-white/15 bg-white/[0.02] text-slate-200 hover:bg-white/[0.08]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      Panier moyen
                      <span
                        title="Influence la stratégie (upsell, confiance, positionnement)."
                      className="cursor-help text-slate-400"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </span>
                    </Label>
                    <Select
                      value={form.aov_bucket}
                      onValueChange={(v) => setForm((f) => ({ ...f, aov_bucket: v as CreateStoreInput["aov_bucket"] }))}
                    >
                    <SelectTrigger className="border-white/15 bg-slate-900/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AOV_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-100">Pays</Label>
                    <Select
                      value={form.country}
                      onValueChange={(v) => setForm((f) => ({ ...f, country: v as CreateStoreInput["country"] }))}
                    >
                    <SelectTrigger className="border-white/15 bg-slate-900/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Résumé */}
                <div className="rounded-lg border border-white/15 bg-slate-900/40 p-3 text-sm">
                  <p className="mb-2 font-medium text-slate-300">Résumé</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{summary.name}</span>
                    <span className="max-w-[180px] truncate rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs" title={summary.url}>{summary.url}</span>
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{summary.platform}</span>
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{summary.goal}</span>
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{STAGE_OPTIONS.find((o) => o.value === form.stage)?.label ?? "—"}</span>
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{TRAFFIC_OPTIONS.find((o) => o.value === form.traffic_source)?.label ?? "—"}</span>
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{AOV_OPTIONS.find((o) => o.value === form.aov_bucket)?.label ?? "—"}</span>
                    <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs">{COUNTRY_OPTIONS.find((o) => o.value === form.country)?.label ?? form.country}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setStep(2)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500"
                    onClick={handleFinish}
                    disabled={loading || !canNextStep3}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion Shopify…
                      </>
                    ) : (
                      "Créer et connecter Shopify"
                    )}
                  </Button>
                </div>
                <p className="text-center text-xs text-slate-300">
                  Tu seras redirigé vers Shopify pour autoriser la connexion.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
