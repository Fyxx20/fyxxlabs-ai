"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  FileCheck,
  AlertCircle,
  History,
  Settings,
} from "lucide-react";

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
  created_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  prestashop: "PrestaShop",
  other: "Autre",
};

const NAV = [
  { href: "/app/scans", label: "Vue générale", icon: LayoutDashboard },
  { href: "/app/scans", label: "Résultats", icon: FileCheck, useLastScanId: true },
  { href: "/app/issues", label: "Problèmes détectés", icon: AlertCircle },
  { href: "/app/scans", label: "Historique des analyses", icon: History },
  { href: "/app/coach", label: "Assistant FyxxLabs", icon: Activity },
  { href: "/app/settings", label: "Paramètres de l'analyse", icon: Settings },
];

export function AnalysisSidebar({
  store,
  lastScan,
}: {
  store: StoreRow | null;
  lastScan: LastScanRow | null;
}) {
  const pathname = usePathname();
  const platformLabel =
    store?.platform && PLATFORM_LABELS[store.platform.toLowerCase()]
      ? PLATFORM_LABELS[store.platform.toLowerCase()]
      : store?.platform ?? "—";

  const resultsHref = lastScan?.id ? `/app/scans/${lastScan.id}` : "/app/scans";
  const historyHref = "/app/scans";

  const linkItems = NAV.map((item) => {
    if (item.label === "Résultats") return { ...item, href: resultsHref };
    if (item.label === "Historique des analyses") return { ...item, href: historyHref };
    return item;
  });

  const isDetailPage = pathname.match(/^\/app\/scans\/[^/]+$/);

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card">
      <div className="sticky top-0 flex h-full flex-col p-4">
        {/* Boutique analysée */}
        <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Boutique analysée
          </h3>
          {store ? (
            <>
              <p className="font-medium text-foreground">{store.name}</p>
              {store.website_url && (
                <p className="mt-1 truncate text-xs text-muted-foreground" title={store.website_url}>
                  {store.website_url}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{platformLabel}</span>
                {store.country && <span>· {store.country}</span>}
              </div>
              {store.created_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Créée le {formatDate(store.created_at)}
                </p>
              )}
              <p className="mt-2 text-xs font-medium text-foreground">
                {lastScan?.status === "running"
                  ? "Analyse en cours"
                  : lastScan
                    ? `Dernière analyse : ${formatDate(lastScan.created_at)}`
                    : "Aucune analyse"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune boutique</p>
          )}
        </div>

        {/* Onglets */}
        <nav className="flex flex-1 flex-col gap-0.5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Navigation
          </h3>
          {linkItems.map((item) => {
            const isActive =
              item.href === "/app/scans"
                ? pathname === "/app/scans" || pathname.startsWith("/app/scans/")
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const activeForThis =
              item.label === "Résultats"
                ? isDetailPage
                : item.label === "Vue générale"
                  ? pathname === "/app/scans"
                  : item.label === "Historique des analyses"
                    ? pathname === "/app/scans"
                    : isActive;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeForThis
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
