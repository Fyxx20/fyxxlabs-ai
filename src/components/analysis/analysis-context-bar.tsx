"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Store, Globe, Layout } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  website_url?: string | null;
  platform?: string | null;
  country?: string | null;
  created_at?: string | null;
}

interface LastScanRow {
  id: string;
  status: string;
  score_global: number | null;
  created_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  prestashop: "PrestaShop",
  other: "Autre",
};

export function AnalysisContextBar({
  store,
  lastScan,
}: {
  store: StoreRow | null;
  lastScan: LastScanRow | null;
}) {
  if (!store) return null;

  const platformLabel =
    (store.platform && PLATFORM_LABELS[store.platform.toLowerCase()]) ||
    store.platform ||
    "—";
  const lastScanLabel = lastScan
    ? lastScan.status === "succeeded"
      ? `Dernière analyse : ${formatDate(lastScan.created_at)} — Score ${lastScan.score_global ?? "—"}/100`
      : lastScan.status === "running"
        ? "Analyse en cours"
        : `Dernière analyse : ${formatDate(lastScan.created_at)}`
    : "Aucune analyse";

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Store className="h-4 w-4 text-muted-foreground" />
          {store.name}
        </span>
        {store.website_url && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="max-w-[200px] truncate sm:max-w-none" title={store.website_url}>
              {store.website_url}
            </span>
          </span>
        )}
        <span className="flex items-center gap-2 text-muted-foreground">
          <Layout className="h-4 w-4" />
          {platformLabel}
        </span>
        <span className="text-muted-foreground">{lastScanLabel}</span>
        {lastScan?.status === "succeeded" && lastScan.score_global != null && (
          <Badge variant="secondary" className="font-mono">
            Score {lastScan.score_global}/100
          </Badge>
        )}
      </div>
    </div>
  );
}
