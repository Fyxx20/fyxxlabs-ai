"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Users,
  Store,
  ScanSearch,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard,
  FileText,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const nav = [
  { href: "/admin/dashboard", label: "Vue globale", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/stores", label: "Boutiques", icon: Store },
  { href: "/admin/scans", label: "Scans", icon: ScanSearch },
  { href: "/admin/subscriptions", label: "Abonnements", icon: CreditCard },
  { href: "/admin/logs", label: "Logs", icon: FileText },
];

export function AdminShell({
  children,
  user,
  userRole,
}: {
  children: React.ReactNode;
  user: User;
  userRole?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 md:flex-row">
      <aside className="w-full border-b border-white/10 bg-slate-900 md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <BrandLogo href="/admin/dashboard" label="FyxxLabs Admin" />
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
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
        <div className="border-b border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-center text-xs font-semibold text-violet-100">
          Mode administrateur FyxxLabs
        </div>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-4 border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur">
          <span className="rounded-md border border-violet-400/40 bg-violet-500/15 px-2 py-1 text-xs font-semibold text-violet-100">
            {userRole === "super_admin" ? "Super Admin" : userRole === "admin" ? "Admin" : "Espace sécurisé"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-100 hover:bg-white/10 hover:text-white">
                <span className="hidden truncate text-sm font-medium md:inline">
                  {user.email}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/10 bg-slate-900 text-slate-100">
              <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
                <Link href="/">Voir le site</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="focus:bg-white/10 focus:text-white">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 bg-slate-950 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
