"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Search, MoreHorizontal, Store, ScanSearch, Crown, User, Loader2, AlertTriangle } from "lucide-react";

type Row = {
  user_id: string;
  role: string;
  email: string | null;
  created_at: string;
  is_banned?: boolean;
  subscription?: {
    status: string;
    trial_end: string | null;
    advice_consumed: boolean;
    current_period_end: string | null;
    plan?: string;
  };
  stores_count: number;
  scans_count: number;
};

export function AdminUsersTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const menuItemClass = "text-slate-100 focus:bg-white/10 focus:text-white";
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [loadingAbo, setLoadingAbo] = useState<string | null>(null);
  const [loadingBan, setLoadingBan] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; email: string } | null>(null);
  const [deleteTyped, setDeleteTyped] = useState("");

  const filtered = useMemo(() => {
    let list = rows;
    if (roleFilter !== "all") {
      list = list.filter((r) => r.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.email ?? "").toLowerCase().includes(q) ||
          r.user_id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, roleFilter, search]);

  async function setRole(userId: string, role: "user" | "admin") {
    setLoadingRole(userId);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoadingRole(null);
    if (res.ok) router.refresh();
  }

  async function activateLifetime(userId: string) {
    setLoadingAbo(userId);
    const res = await fetch(`/api/admin/users/${userId}/subscription/activate-lifetime`, {
      method: "POST",
    });
    setLoadingAbo(null);
    if (res.ok) router.refresh();
  }

  async function ban(userId: string) {
    setLoadingBan(userId);
    const res = await fetch(`/api/admin/users/${userId}/ban`, { method: "POST" });
    setLoadingBan(null);
    if (res.ok) router.refresh();
  }

  async function unban(userId: string) {
    setLoadingBan(userId);
    const res = await fetch(`/api/admin/users/${userId}/unban`, { method: "POST" });
    setLoadingBan(null);
    if (res.ok) router.refresh();
  }

  async function resetOnboarding(userId: string) {
    const res = await fetch("/api/admin/onboarding/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) router.refresh();
  }

  async function resetPassword(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.recovery_link) {
      window.prompt("Lien de réinitialisation (copiez et envoyez à l'utilisateur):", data.recovery_link);
    }
    if (res.ok) router.refresh();
  }

  async function deleteUser() {
    if (!deleteConfirm || deleteTyped !== "DELETE") return;
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: deleteConfirm.userId, confirm: "DELETE" }),
    });
    setDeleteConfirm(null);
    setDeleteTyped("");
    if (res.ok) router.refresh();
    else {
      const d = await res.json();
      alert(d.error || "Erreur");
    }
  }

  return (
    <>
    <Card className="border-white/10 bg-slate-900/70 text-slate-100">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Comptes</CardTitle>
            <CardDescription className="text-slate-300">
              {filtered.length} utilisateur(s) — recherche et actions
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher par email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 border-white/15 bg-slate-950 pl-8 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36 border-white/15 bg-slate-950 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900 text-slate-100">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white">Tous les rôles</SelectItem>
                <SelectItem value="user" className="focus:bg-white/10 focus:text-white">User</SelectItem>
                <SelectItem value="admin" className="focus:bg-white/10 focus:text-white">Admin</SelectItem>
                <SelectItem value="super_admin" className="focus:bg-white/10 focus:text-white">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!filtered.length ? (
          <p className="text-sm text-slate-300">Aucun utilisateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 text-left font-medium">Email / ID</th>
                  <th className="pb-2 text-left font-medium">Rôle</th>
                  <th className="pb-2 text-left font-medium">Abonnement</th>
                  <th className="pb-2 text-left font-medium">Trial</th>
                  <th className="pb-2 text-left font-medium">Conseil</th>
                  <th className="pb-2 text-left font-medium">Boutiques</th>
                  <th className="pb-2 text-left font-medium">Scans</th>
                  <th className="pb-2 text-left font-medium">Créé le</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const sub = p.subscription;
                  return (
                    <tr key={p.user_id} className="border-b border-white/10">
                      <td className="py-3">
                        <span className="font-medium">{p.email || p.user_id}</span>
                        {!p.email && (
                          <span className="ml-1 inline-block max-w-[120px] truncate text-xs text-slate-400" title={p.user_id}>
                            {p.user_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1 flex-wrap">
                          <Badge variant={p.role === "user" ? "secondary" : "default"}>
                            {p.role === "super_admin" ? (
                              <><Crown className="mr-1 h-3 w-3" /> Super admin</>
                            ) : p.role === "admin" ? (
                              <><Crown className="mr-1 h-3 w-3" /> Admin</>
                            ) : (
                              <><User className="mr-1 h-3 w-3" /> User</>
                            )}
                          </Badge>
                          {p.is_banned && (
                            <Badge variant="destructive">Banni</Badge>
                          )}
                        </span>
                      </td>
                      <td className="py-3">
                        {sub ? (
                          <span className="flex items-center gap-1 flex-wrap">
                            {sub.plan === "lifetime" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                Lifetime
                              </Badge>
                            ) : (
                              <Badge
                                variant={
                                  sub.status === "active"
                                    ? "default"
                                    : sub.status === "trialing"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {sub.status}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-slate-300">
                        {sub?.trial_end ? formatDate(sub.trial_end) : "—"}
                      </td>
                      <td className="py-3">{sub?.advice_consumed ? "Oui" : "Non"}</td>
                      <td className="py-3">
                        {p.stores_count > 0 ? (
                          <Link
                            href={`/admin/stores?user_id=${p.user_id}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Store className="h-3.5 w-3.5" /> {p.stores_count}
                          </Link>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3">
                        {p.scans_count > 0 ? (
                          <Link
                            href={`/admin/scans?user_id=${p.user_id}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ScanSearch className="h-3.5 w-3.5" /> {p.scans_count}
                          </Link>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-300">{formatDate(p.created_at)}</td>
                      <td className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-white/10 bg-slate-900 text-slate-100">
                            <DropdownMenuItem
                              className={menuItemClass}
                              onClick={() => setRole(p.user_id, p.role === "admin" ? "user" : "admin")}
                              disabled={loadingRole === p.user_id || p.role === "super_admin"}
                            >
                              {loadingRole === p.user_id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {p.role === "super_admin"
                                ? "Rôle protégé (super admin)"
                                : p.role === "admin"
                                  ? "Passer en User"
                                  : "Passer en Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={menuItemClass}
                              onClick={() => activateLifetime(p.user_id)}
                              disabled={loadingAbo === p.user_id || sub?.plan === "lifetime"}
                            >
                              {loadingAbo === p.user_id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {sub?.plan === "lifetime" ? "Déjà Lifetime" : "Activer abo à vie"}
                            </DropdownMenuItem>
                            {p.is_banned ? (
                              <DropdownMenuItem
                                className={menuItemClass}
                                onClick={() => unban(p.user_id)}
                                disabled={loadingBan === p.user_id}
                              >
                                {loadingBan === p.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Débannir
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className={menuItemClass}
                                onClick={() => ban(p.user_id)}
                                disabled={loadingBan === p.user_id}
                              >
                                {loadingBan === p.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Bannir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className={menuItemClass} onClick={() => resetPassword(p.user_id)}>
                              Envoyer lien reset mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem className={menuItemClass} onClick={() => resetOnboarding(p.user_id)}>
                              Réinitialiser onboarding
                            </DropdownMenuItem>
                            <DropdownMenuItem className={menuItemClass} asChild>
                              <Link href={`/admin/users/${p.user_id}`}>Voir détail</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className={menuItemClass} asChild>
                              <Link href={`/admin/stores?user_id=${p.user_id}`}>
                                Voir boutiques
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className={menuItemClass} asChild>
                              <Link href={`/admin/scans?user_id=${p.user_id}`}>
                                Voir scans
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-rose-300 focus:bg-rose-500/20 focus:text-rose-200"
                              onClick={() => setDeleteConfirm({ userId: p.user_id, email: p.email ?? p.user_id })}
                            >
                              Supprimer l'utilisateur (danger)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
      <DialogContent className="border-white/10 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Supprimer l'utilisateur
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Action irréversible. Toutes les données (boutiques, scans, abonnement) seront supprimées.
            {deleteConfirm && (
              <span className="mt-2 block font-medium">Utilisateur: {deleteConfirm.email}</span>
            )}
            <span className="mt-2 block">Tapez <strong>DELETE</strong> pour confirmer.</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="DELETE"
            value={deleteTyped}
            onChange={(e) => setDeleteTyped(e.target.value)}
            className="font-mono border-rose-500/60 bg-slate-950 text-slate-100 focus-visible:ring-rose-500"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-white/20 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
            onClick={() => { setDeleteConfirm(null); setDeleteTyped(""); }}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={deleteUser}
            disabled={deleteTyped !== "DELETE"}
          >
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
