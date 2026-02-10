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
import { PLATFORM_UI_LIST, isConnectable } from "@/lib/connectors/registry";
import { HelpCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("mode") === "add";
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateStoreInput>({
    name: "",
    website_url: "",
    goal: "conversion",
    platform: "custom",
    stage: "0_sales",
    traffic_source: "other",
    aov_bucket: "0_30",
    country: "FR",
  });
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "queued" | "running" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const parsed = createStoreSchema.safeParse(form);
  const canNextStep1 = form.name.trim().length > 0;
  const canNextStep2 =
    form.website_url.trim().length > 0 &&
    (form.website_url.startsWith("http://") || form.website_url.startsWith("https://"));

  const canNextStep3 = parsed.success;

  const summary = {
    name: form.name.trim() || "—",
    url: form.website_url.trim() || "—",
    platform: PLATFORM_UI_LIST.find((o) => o.value === form.platform)?.label ?? "—",
    goal: GOAL_OPTIONS.find((o) => o.value === form.goal)?.label ?? "—",
  };

  const connectableSelected = isConnectable(form.platform);

  async function handleFinish() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée. Reconnecte-toi.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/store/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409 && (data.error === "store_exists" || data.storeId)) {
        setError("STORE_EXISTS");
        setLoading(false);
        router.push("/app/dashboard");
        router.refresh();
        return;
      }
      if (res.status === 409 && data.error === "store_limit_reached") {
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

    setScanStatus("queued");
    const scanRes = await fetch("/api/scan/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId }),
    });
    if (scanRes.ok) {
      setScanStatus("running");
      const scanData = await scanRes.json();
      if (scanData.status === "succeeded") setScanStatus("done");
    }

    setLoading(false);
    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Configurer votre boutique</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fournir le contexte pour lancer l&apos;analyse FyxxLabs
          </p>
          {isAddMode && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
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
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {step} / 3
          </span>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              {step === 1 && "Nom de ta boutique"}
              {step === 2 && "URL + Plateforme"}
              {step === 3 && "Récapitulatif de l'analyse"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Un nom pour reconnaître cette boutique dans ton dashboard."}
              {step === 2 && "L’adresse de ta boutique et ta plateforme e‑commerce."}
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
              <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                Boutique déjà configurée. Redirection…
              </p>
            )}
            {error && error !== "BASE_ERROR" && error !== "STORE_EXISTS" && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Boutique Bijoux Paris"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tu pourras modifier plus tard.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!canNextStep1}
                >
                  Suivant
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="website_url">URL du site</Label>
                  <Input
                    id="website_url"
                    type="url"
                    placeholder="https://maboutique.com"
                    value={form.website_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, website_url: e.target.value }))
                    }
                  />
                  {form.website_url && !canNextStep2 && (
                    <p className="text-xs text-destructive">
                      Entrez une URL valide (https://…)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Aucune installation. Analyse via URL.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Plateforme
                    <span
                      title="Ta solution e‑commerce (Shopify, WooCommerce, etc.)"
                      className="cursor-help text-muted-foreground"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </Label>
                  <Select
                    value={form.platform}
                    onValueChange={(v) => setForm((f) => ({ ...f, platform: v as CreateStoreInput["platform"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_UI_LIST.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            {o.label}
                            <Badge variant={o.connectable ? "default" : "secondary"} className="text-xs">
                              {o.connectable ? "Connectable" : "Scan URL"}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {connectableSelected ? (
                    <p className="text-xs text-muted-foreground">
                      Connexion sécurisée. Aucune installation. Tu pourras connecter ta boutique après sa création (Paramètres).
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Scan URL uniquement (pour l’instant). Connecter Google Analytics (bientôt).
                    </p>
                  )}
                </div>
                {connectableSelected && (
                  <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-foreground">
                    Recommandé : connecte ta boutique après la création pour un diagnostic plus précis.
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => setStep(3)}
                    disabled={!canNextStep2}
                  >
                    Suivant
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Objectif principal</Label>
                  <div className="grid gap-2">
                    {GOAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, goal: opt.value }))}
                        className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                          form.goal === opt.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Contexte (30 secondes)</p>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Étape actuelle
                    <span
                      title="Ça adapte le niveau de conseils à ton stade (débutant à rentable)."
                      className="cursor-help text-muted-foreground"
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
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
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
                      className="cursor-help text-muted-foreground"
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
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
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
                        className="cursor-help text-muted-foreground"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </span>
                    </Label>
                    <Select
                      value={form.aov_bucket}
                      onValueChange={(v) => setForm((f) => ({ ...f, aov_bucket: v as CreateStoreInput["aov_bucket"] }))}
                    >
                      <SelectTrigger>
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
                    <Label>Pays</Label>
                    <Select
                      value={form.country}
                      onValueChange={(v) => setForm((f) => ({ ...f, country: v as CreateStoreInput["country"] }))}
                    >
                      <SelectTrigger>
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
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="mb-2 font-medium text-muted-foreground">Résumé</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{summary.name}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border truncate max-w-[180px]" title={summary.url}>{summary.url}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{summary.platform}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{summary.goal}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{STAGE_OPTIONS.find((o) => o.value === form.stage)?.label ?? "—"}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{TRAFFIC_OPTIONS.find((o) => o.value === form.traffic_source)?.label ?? "—"}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{AOV_OPTIONS.find((o) => o.value === form.aov_bucket)?.label ?? "—"}</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs border border-border">{COUNTRY_OPTIONS.find((o) => o.value === form.country)?.label ?? form.country}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleFinish}
                    disabled={loading || !canNextStep3}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {scanStatus === "idle" ? "Création…" : "Analyse en cours…"}
                      </>
                    ) : (
                      "Lancer l'analyse FyxxLabs"
                    )}
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">L'analyse peut prendre 1 à 3 minutes.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
