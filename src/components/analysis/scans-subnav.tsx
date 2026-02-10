"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileCheck,
  AlertCircle,
  History,
  Activity,
  Settings,
} from "lucide-react";

type SubnavTab = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  useLastScanId?: boolean;
};

const TABS: SubnavTab[] = [
  { href: "/app/scans", label: "Vue générale", icon: LayoutDashboard, exact: true },
  { href: "/app/scans", label: "Résultats", icon: FileCheck, useLastScanId: true },
  { href: "/app/issues", label: "Problèmes détectés", icon: AlertCircle },
  { href: "/app/scans", label: "Historique", icon: History, exact: true },
  { href: "/app/coach", label: "Assistant FyxxLabs", icon: Activity },
  { href: "/app/settings", label: "Paramètres", icon: Settings },
];

export function ScansSubnav({ lastScanId }: { lastScanId: string | null }) {
  const pathname = usePathname();
  const isDetailPage = pathname?.match(/^\/app\/scans\/[^/]+$/);

  return (
    <div className="border-b border-border bg-background/95 px-4">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Sections analyse">
        {TABS.map((tab) => {
          let href = tab.href;
          if (tab.useLastScanId && lastScanId) href = `/app/scans/${lastScanId}`;
          const isActive = tab.useLastScanId
            ? Boolean(isDetailPage)
            : tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname?.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
