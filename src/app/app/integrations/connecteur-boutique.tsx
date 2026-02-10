"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONNECTABLE_PROVIDERS, PLATFORM_UI_LIST } from "@/lib/connectors/registry";
import { WooCommerceConnectModal } from "@/app/app/settings/woocommerce-connect-modal";
import { PrestaShopConnectModal } from "@/app/app/settings/prestashop-connect-modal";
import { CheckCircle2, Loader2, Zap, ChevronRight } from "lucide-react";

type IntegrationRow = {
  provider: string;
  status: string;
  shop_domain: string | null;
  metadata: Record<string, unknown> | null;
  connected_at: string | null;
  last_sync_at: string | null;
};

const PLATFORMS_ORDER = [
  "shopify",
  "woocommerce",
  "prestashop",
  "wix",
  "squarespace",
  "bigcommerce",
  "magento",
  "opencart",
  "custom",
] as const;

export function ConnecteurBoutique({
  storeId,
  storeName,
  storeUrl,
  platform,
  integrations,
}: {
  storeId: string;
  storeName: string;
  storeUrl: string;
  platform: string;
  integrations: IntegrationRow[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platform);
  const [wooOpen, setWooOpen] = useState(false);
  const [prestaOpen, setPrestaOpen] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [launching, setLaunching] = useState(false);
  const [integrationsList, setIntegrationsList] = useState<IntegrationRow[]>(integrations);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const byProvider = new Map(integrationsList.map((i) => [i.provider, i]));
  const connected = integrationsList.find((i) => i.status === "connected");
  const dataLevel =
    connected?.provider === "shopify" || connected?.provider === "woocommerce" || connected?.provider === "prestashop"
      ? "élevé"
      : "moyen";

  const handleIntegrationsRefresh = () => {
    fetch(`/api/integrations/status?store_id=${encodeURIComponent(storeId)}`)
      .then((r) => r.json())
      .then((d) => setIntegrationsList(d.integrations ?? []));
  };

  const handleShopifyConnect = () => {
    const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!shop) return;
    window.location.href = `/api/integrations/shopify/start?store_id=${encodeURIComponent(storeId)}&shop=${encodeURIComponent(shop)}`;
  };

  const handleLaunchScan = async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.id) router.push(`/app/scans/${data.id}`);
      else setLaunching(false);
    } catch (e) {
      setLaunching(false);
      alert((e as Error).message);
    }
  };

  const platformsForStep1 = PLATFORMS_ORDER.map((value) => ({
    value,
    label: PLATFORM_UI_LIST.find((p) => p.value === value)?.label ?? value,
    connectable: CONNECTABLE_PROVIDERS.includes(value),
  }));

  const stepTitles: Record<number, string> = {
    1: "Choisir la plateforme",
    2: "Connexion",
    3: "Vérification",
    4: "Lancer le diagnostic",
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    requestAnimationFrame(() => {
      const el = stepRefs.current[nextStep];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  const cardStateClass = (cardStep: number) => {
    if (step === cardStep) return "ring-2 ring-primary border-primary/40 shadow-md";
    if (step > cardStep) return "opacity-65 saturate-75";
    return "opacity-55";
  };

  return (
    <>
      {connected && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Boutique connectée
            </CardTitle>
            <CardDescription>
              {connected.provider} {connected.shop_domain && `— ${connected.shop_domain}`}
              {" · "}
              Données accessibles : <strong>{dataLevel}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Reconnecter / Changer
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : step > s
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && <div className={`h-px w-6 ${step > s ? "bg-primary/50" : "bg-border"}`} />}
                </div>
              ))}
              <span className="rounded-md border border-primary/30 bg-background px-2 py-1 text-xs font-medium text-foreground">
                Étape active: {step}/4 - {stepTitles[step]}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Étape 1: Choisir la plateforme */}
        <Card ref={(el) => { stepRefs.current[1] = el; }} className={cardStateClass(1)}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                1
              </span>
              <CardTitle>Choisir la plateforme</CardTitle>
            </div>
            <CardDescription>Sur quelle plateforme tourne ta boutique ?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {platformsForStep1.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedPlatform(p.value)}
                  className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                    selectedPlatform === p.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="font-medium">{p.label}</span>
                  {p.connectable && (
                    <Badge variant="secondary" className="text-xs">
                      API
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => goToStep(2)}>
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Étape 2: Connexion */}
        <Card ref={(el) => { stepRefs.current[2] = el; }} className={cardStateClass(2)}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                2
              </span>
              <CardTitle>Connexion</CardTitle>
            </div>
            <CardDescription>
              {selectedPlatform === "shopify" &&
                "Connecte ton shop Shopify (OAuth). Nous lirons uniquement : commandes, clients, produits (lecture)."}
              {selectedPlatform === "woocommerce" &&
                "Saisis l’URL de ta boutique et tes clés API WooCommerce (lecture)."}
              {selectedPlatform === "prestashop" &&
                "Saisis l’URL et ta clé API PrestaShop."}
              {(selectedPlatform === "custom" || !CONNECTABLE_PROVIDERS.includes(selectedPlatform as (typeof CONNECTABLE_PROVIDERS)[number])) &&
                "Scan par URL uniquement. Connexion API disponible bientôt pour d’autres plateformes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPlatform === "shopify" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-sm font-medium">Domaine du shop</label>
                  <input
                    type="text"
                    placeholder="mastore.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button onClick={handleShopifyConnect} disabled={!shopDomain.trim()}>
                  Connecter avec Shopify
                </Button>
              </div>
            )}
            {selectedPlatform === "woocommerce" && (
              <Button onClick={() => setWooOpen(true)}>
                {byProvider.get("woocommerce")?.status === "connected" ? "Reconnecter WooCommerce" : "Connecter WooCommerce"}
              </Button>
            )}
            {selectedPlatform === "prestashop" && (
              <Button onClick={() => setPrestaOpen(true)}>
                {byProvider.get("prestashop")?.status === "connected" ? "Reconnecter PrestaShop" : "Connecter PrestaShop"}
              </Button>
            )}
            {(selectedPlatform === "custom" || !CONNECTABLE_PROVIDERS.includes(selectedPlatform as (typeof CONNECTABLE_PROVIDERS)[number])) && (
              <p className="text-sm text-muted-foreground">
                Ta boutique est enregistrée avec l’URL : <strong>{storeUrl}</strong>. Le diagnostic utilisera le scan par URL (confiance moyenne).
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={() => goToStep(3)} disabled={step < 2}>
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Étape 3: Vérification */}
        <Card ref={(el) => { stepRefs.current[3] = el; }} className={cardStateClass(3)}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                3
              </span>
              <CardTitle>Vérification</CardTitle>
            </div>
            <CardDescription>État de la connexion et des données accessibles.</CardDescription>
          </CardHeader>
          <CardContent>
            {connected ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-medium text-green-600 dark:text-green-400">Connexion OK</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Données accessibles : <strong>{dataLevel}</strong> — commandes, clients, produits (selon plateforme).
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-medium">Scan URL uniquement</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confiance : <strong>moyenne</strong>. Connecte une plateforme (étape 2) pour des données plus riches.
                </p>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={() => goToStep(4)} disabled={step < 3}>
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Étape 4: Lancer le diagnostic */}
        <Card ref={(el) => { stepRefs.current[4] = el; }} className={`${cardStateClass(4)} ${step >= 4 ? "border-primary/30" : ""}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                4
              </span>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Lancer mon diagnostic
              </CardTitle>
            </div>
            <CardDescription>
              Un scan analyse ta boutique (homepage, produit, panier) et génère un score + une action prioritaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={handleLaunchScan} disabled={launching || step < 4}>
              {launching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lancement…
                </>
              ) : (
                "Lancer le diagnostic"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <WooCommerceConnectModal
        open={wooOpen}
        onOpenChange={setWooOpen}
        storeId={storeId}
        storeUrl={storeUrl}
        onSuccess={() => {
          setWooOpen(false);
          handleIntegrationsRefresh();
        }}
      />
      <PrestaShopConnectModal
        open={prestaOpen}
        onOpenChange={setPrestaOpen}
        storeId={storeId}
        storeUrl={storeUrl}
        onSuccess={() => {
          setPrestaOpen(false);
          handleIntegrationsRefresh();
        }}
      />
    </>
  );
}
