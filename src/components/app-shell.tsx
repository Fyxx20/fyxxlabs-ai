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
  AlertCircle,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
  Store,
  Sparkles,
  Rocket,
  Menu,
  X,
  Shield,
  User,
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
    label: "Création",
    items: [
      { href: "/app/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/app/store-generator", label: "Créer une boutique", icon: Rocket },
      { href: "/app/create-digital", label: "Créer un digital", icon: Sparkles },
    ],
  },
  {
    label: "Analyse",
    items: [
      { href: "/app/scans", label: "Scan", icon: ScanSearch },
      { href: "/app/issues", label: "Problèmes", icon: AlertCircle },
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Compte",
    items: [
      { href: "/app/integrations", label: "Ma boutique", icon: Store },
      { href: "/app/billing", label: "Facturation", icon: CreditCard },
      { href: "/app/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

export interface AppEntitlements {
  plan?: "trial" | "free" | "create" | "starter" | "pro" | "elite" | "lifetime";
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
    ? { label: "Lifetime", className: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" }
    : entitlements.isPro
      ? { label: entitlements.plan === "elite" ? "Agence" : "Pro", className: "bg-violet-500/15 text-violet-200 border-violet-400/30" }
      : entitlements.isTrialActive
        ? { label: `Essai${entitlements.trialEndsAt ? ` · J-${Math.max(0, Math.ceil((new Date(entitlements.trialEndsAt).getTime() - Date.now()) / 86400000))}` : ""}`, className: "bg-amber-500/15 text-amber-200 border-amber-400/30" }
        : { label: "Gratuit", className: "bg-white/[0.04] text-slate-300 border-white/10" };

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
                className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left backdrop-blur transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                  <Store className="h-4 w-4 text-violet-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-0.5 text-[10px] leading-none text-slate-400">Boutique</p>
                  <p className="truncate text-sm font-semibold leading-tight text-white">
                    {currentStore?.name ?? "Sélectionner"}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
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
                    <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate text-sm">{store.name}</span>
                  </div>
                  {currentStore?.id === store.id && (
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-200">
                      Active
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleAddStore} className="text-violet-200">
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
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400/70">
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
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all",
                        isActive
                          ? "bg-white/[0.06] text-white shadow-sm shadow-violet-600/5"
                          : "text-slate-300/80 hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-violet-200" : "text-slate-400")} />
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
      <div className="border-t border-white/10 p-3 space-y-2">
        {/* Plan badge */}
        <Link href="/app/billing">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.04]",
              planBadge.className
            )}
          >
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
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15">
                <User className="h-3.5 w-3.5 text-violet-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">{user.email}</p>
              </div>
              <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
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
            {(userRole === "admin" || userRole === "super_admin") && (
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
    <div className="relative flex min-h-screen bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-600/[0.14] blur-[120px]" />
        <div className="absolute -right-40 top-24 h-[520px] w-[520px] rounded-full bg-cyan-500/[0.12] blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-[120px]" />
      </div>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:z-50 border-r border-white/10 bg-white/[0.03] backdrop-blur-xl">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:bg-white/[0.04] transition-colors"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <BrandLogo href="/app/dashboard" showText={false} />
        <div className="flex-1" />
        {currentStore && (
          <span className="text-xs font-medium text-slate-300 truncate max-w-[140px]">
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
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-white/10 bg-white/[0.04] backdrop-blur-xl md:hidden">
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
