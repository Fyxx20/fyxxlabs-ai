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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScanSearch,
  MessageSquare,
  AlertCircle,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
  Store,
  Wand2,
  Sparkles,
  Rocket,
  Menu,
  X,
  Shield,
  Package,
  User,
  Megaphone,
  ScrollText,
  Star,
  Mail,
  Eye,
  Calculator,
  Share2,
  Flame,
  BarChart3,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";
import { useState } from "react";

interface StoreRow {
  id: string;
  name: string;
  website_url: string;
}

/* ─── Navigation structure with groups ─── */
const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/app/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/app/scans", label: "Scans", icon: ScanSearch },
      { href: "/app/issues", label: "Problèmes", icon: AlertCircle },
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Outils IA",
    items: [
      { href: "/app/auto-fix", label: "Auto-Fix IA", icon: Wand2 },
      { href: "/app/import-product", label: "Importer produit", icon: Package },
      { href: "/app/store-generator", label: "Créer boutique", icon: Rocket },
      { href: "/app/coach", label: "Coach IA", icon: MessageSquare },
      { href: "/app/ad-copy", label: "Générateur Pubs", icon: Megaphone },
      { href: "/app/email-templates", label: "Email Marketing", icon: Mail },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/app/social-media", label: "Réseaux Sociaux", icon: Share2 },
      { href: "/app/winning-products", label: "Produits Gagnants", icon: Flame },
      { href: "/app/competitor-spy", label: "Espion Concurrent", icon: Eye },
      { href: "/app/review-generator", label: "Générateur Avis", icon: Star },
      { href: "/app/legal-generator", label: "Pages Légales", icon: ScrollText },
      { href: "/app/profit-calculator", label: "Calculateur Profit", icon: Calculator },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/app/integrations", label: "Ma boutique", icon: Store },
      { href: "/app/billing", label: "Facturation", icon: CreditCard },
      { href: "/app/settings", label: "Paramètres", icon: Settings },
    ],
  },
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
  user: SupaUser;
  stores: StoreRow[];
  currentStoreId: string | null;
  subscription: SubscriptionRow | null;
  entitlements: AppEntitlements;
  userRole?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  /* Plan badge */
  const planBadge = entitlements.isLifetime
    ? { label: "Lifetime", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" }
    : entitlements.isPro
      ? { label: entitlements.plan === "starter" ? "Starter" : entitlements.plan === "elite" ? "Elite" : "Pro", className: "bg-primary/10 text-primary border-primary/20" }
      : entitlements.isTrialActive
        ? { label: `Essai${entitlements.trialEndsAt ? ` · J-${Math.max(0, Math.ceil((new Date(entitlements.trialEndsAt).getTime() - Date.now()) / 86400000))}` : ""}`, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" }
        : { label: "Gratuit", className: "bg-muted text-muted-foreground border-border" };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5">
        <BrandLogo href="/app/dashboard" />
      </div>

      {/* Store selector */}
      {stores.length > 0 && (
        <div className="px-3 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Store className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Boutique</p>
                  <p className="text-sm font-medium truncate leading-tight">
                    {currentStore?.name ?? "Sélectionner"}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {stores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onSelect={() => handleSelectStore(store.id)}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-sm">{store.name}</span>
                  </div>
                  {currentStore?.id === store.id && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Active
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleAddStore} className="text-primary">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Ajouter une boutique
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section: plan + user */}
      <div className="border-t border-border/60 p-3 space-y-2">
        {/* Plan badge */}
        <Link href="/app/billing">
          <div className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50", planBadge.className)}>
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>{planBadge.label}</span>
            {!entitlements.isPro && !entitlements.isLifetime && (
              <span className="ml-auto text-[10px] opacity-70">Upgrade</span>
            )}
          </div>
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/80"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user.email}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/app/settings">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/billing">
                <CreditCard className="mr-2 h-4 w-4" />
                Facturation
              </Link>
            </DropdownMenuItem>
            {userRole === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard">
                  <Shield className="mr-2 h-4 w-4" />
                  Administration
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:z-50 bg-card border-r border-border/60">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border/60 bg-card/95 backdrop-blur px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 hover:bg-muted transition-colors"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <BrandLogo href="/app/dashboard" showText={false} />
        <div className="flex-1" />
        {currentStore && (
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
            {currentStore.name}
          </span>
        )}
        <div className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", planBadge.className)}>
          {planBadge.label.split(" · ")[0]}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r border-border/60 md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-60">
        <main className="flex-1 p-4 pt-[72px] md:p-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
