"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONNECTABLE_PROVIDERS, PLATFORM_UI_LIST } from "@/lib/connectors/registry";
import { Plug, Loader2, KeyRound } from "lucide-react";

function ShopifyDisconnectButton({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    const res = await fetch("/api/integrations/shopify/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId }),
    });
    setLoading(false);
    if (res.ok) onDone();
  }
  return (
    <Button size="sm" variant="outline" onClick={handle} disabled={loading}>
      {loading ? "…" : "Déconnecter"}
    </Button>
  );
}

type IntegrationRow = {
  provider: string;
  status: string;
  shop_domain: string | null;
  metadata: Record<string, unknown> | null;
  connected_at: string | null;
  last_sync_at: string | null;
};

const PLATFORM_BRAND: Record<
  string,
  { short: string; className: string; authLabel: string }
> = {
  shopify: {
    short: "S",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    authLabel: "OAuth",
  },
};

export function IntegrationsCard({ storeId, storeUrl }: { storeId: string | null; storeUrl: string }) {
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState(() => {
    const normalized = storeUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    return normalized.endsWith(".myshopify.com") ? normalized : "";
  });

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    fetch(`/api/integrations/status?store_id=${encodeURIComponent(storeId)}`)
      .then((r) => r.json())
      .then((d) => {
        setIntegrations(d.integrations ?? []);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  if (!storeId) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connexions plateforme
          </CardTitle>
          <CardDescription>
            Connecte les canaux de ta boutique pour synchroniser produits, commandes et clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : (
            <ul className="space-y-3">
              {CONNECTABLE_PROVIDERS.map((provider) => {
                const row = byProvider.get(provider);
                const status = row?.status ?? "not_connected";
                const label = PLATFORM_UI_LIST.find((p) => p.value === provider)?.label ?? provider;
                const isConnected = status === "connected";
                const brand = PLATFORM_BRAND[provider] ?? {
                  short: label.slice(0, 1).toUpperCase(),
                  className: "bg-muted text-muted-foreground",
                  authLabel: "API",
                };

                return (
                  <li
                    key={provider}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold ${brand.className}`}
                        aria-hidden="true"
                      >
                        {brand.short}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{label}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {brand.authLabel}
                          </Badge>
                        </div>
                        {row?.shop_domain && (
                          <p className="text-xs text-muted-foreground">{row.shop_domain}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isConnected ? "default" : "secondary"}>
                        {isConnected ? "Connecté" : "Non connecté"}
                      </Badge>
                      {provider === "shopify" && (
                        isConnected ? (
                          <ShopifyDisconnectButton storeId={storeId} onDone={() => {
                            fetch(`/api/integrations/status?store_id=${encodeURIComponent(storeId)}`)
                              .then((r) => r.json())
                              .then((d) => setIntegrations(d.integrations ?? []));
                          }} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              value={shopDomain}
                              onChange={(e) => setShopDomain(e.target.value.trim())}
                              placeholder="maboutique.myshopify.com"
                              className="h-8 w-[220px]"
                            />
                            <Button
                              size="sm"
                              asChild
                              disabled={!shopDomain || !shopDomain.endsWith(".myshopify.com")}
                            >
                              <a href={`/api/integrations/shopify/start?store_id=${storeId}&shop=${encodeURIComponent(shopDomain)}`}>
                                Connecter
                              </a>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Mode URL</p>
                <p className="text-xs text-muted-foreground">
                  Si Shopify n&apos;est pas connecte, FyxxLabs analyse uniquement l&apos;URL de ta boutique.
                </p>
              </div>
              <Badge variant="secondary">Actif</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4" />
              Recuperer les identifiants Shopify
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>Partner Dashboard - Apps - API credentials.</li>
              <li>Ajoute SHOPIFY_CLIENT_ID et SHOPIFY_CLIENT_SECRET dans .env.local.</li>
              <li>URL callback: /api/integrations/shopify/callback.</li>
              <li>Utilise le domaine Shopify: boutique.myshopify.com (pas le domaine public).</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
