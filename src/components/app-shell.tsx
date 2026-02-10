"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionRow } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScanSearch,
  MessageSquare,
  Plug,
  AlertCircle,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
  Store,
  Wand2,
  Sparkles,
  Rocket,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface StoreRow {
  id: string;
  name: string;
  website_url: string;
}

const nav = [
  { href: "/app/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/app/scans", label: "Scans", icon: ScanSearch },
  { href: "/app/auto-fix", label: "AI Auto-Fix", icon: Wand2 },
  { href: "/app/import-product", label: "Importer produit", icon: Sparkles },
  { href: "/app/store-generator", label: "Créer boutique", icon: Rocket },
  { href: "/app/coach", label: "Coach", icon: MessageSquare },
  { href: "/app/integrations", label: "Gérer la boutique", icon: Plug },
  { href: "/app/billing", label: "Facturation", icon: CreditCard },
  { href: "/app/settings", label: "Paramètres", icon: Settings },
];

export interface AppEntitlements {
  plan?: "trial" | "free" | "starter" | "pro" | "elite" | "lifetime";
  isTrialActive: boolean;
  isPro: boolean;
  isLifetime: boolean;
  canScan: boolean;
  canViewFullScan: boolean;
  canUseCoach: boolean;
  canRescan: boolean;
  trialEndsAt: string | null;
}

export function AppShell({
  children,
  user,
  stores,
  currentStoreId,
  subscription,
  entitlements,
  userRole,
}: {
  children: React.ReactNode;
  user: User;
  stores: StoreRow[];
  currentStoreId: string | null;
  subscription: SubscriptionRow | null;
  entitlements: AppEntitlements;
  userRole?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const currentStore = stores.find((s) => s.id === currentStoreId) ?? stores[0] ?? null;

  async function handleSelectStore(storeId: string) {
    try {
      const res = await fetch("/api/store/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      if (!res.ok) return;
      router.refresh();
    } catch {
      // no-op
    }
  }

  function handleAddStore() {
    router.push("/onboarding?mode=add");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full border-b border-border bg-card md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <BrandLogo href="/app/dashboard" />
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex flex-1 items-center gap-2">
            {stores.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-left"
                  >
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="max-w-[180px] truncate text-sm font-medium">
                      {currentStore?.name ?? "Sélectionner une boutique"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {stores.map((store) => (
                    <DropdownMenuItem
                      key={store.id}
                      onSelect={() => handleSelectStore(store.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 flex-1 truncate">{store.name}</span>
                      {currentStore?.id === store.id && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          Active
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={handleAddStore}>
                    + Ajouter une boutique
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!entitlements.isPro && entitlements.isTrialActive && entitlements.trialEndsAt && (
              <Link href="/app/billing" className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                Essai : J-{Math.max(0, Math.ceil((new Date(entitlements.trialEndsAt).getTime() - Date.now()) / 86400000))}
              </Link>
            )}
            {entitlements.isLifetime && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Lifetime access
              </span>
            )}
            {entitlements.isPro && !entitlements.isLifetime && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {entitlements.plan === "starter"
                  ? "Starter"
                  : entitlements.plan === "elite"
                    ? "Elite"
                    : "Pro"}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="hidden truncate text-sm md:inline">
                {user.email}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/app/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Facturation
                  </Link>
                </DropdownMenuItem>
                {userRole === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
