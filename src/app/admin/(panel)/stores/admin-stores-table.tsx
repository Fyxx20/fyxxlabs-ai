"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Loader2, AlertTriangle } from "lucide-react";

type StoreRow = {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
  goal: string;
  created_at: string;
};

export function AdminStoresTable({
  stores,
  emailByUser,
}: {
  stores: StoreRow[];
  emailByUser: Map<string, string | null>;
}) {
  const router = useRouter();
  const actionOutlineClass =
    "border-white/20 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white disabled:opacity-100 disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500";
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StoreRow | null>(null);
  const [deleteTyped, setDeleteTyped] = useState("");

  async function rescan(storeId: string) {
    setLoading(storeId);
    const res = await fetch("/api/admin/stores/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else {
      const d = await res.json();
      alert(d.error || "Erreur");
    }
  }

  async function deleteStore() {
    if (!deleteConfirm || deleteTyped !== "DELETE") return;
    const res = await fetch("/api/admin/stores/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: deleteConfirm.id, confirm: "DELETE" }),
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
          <CardTitle>Stores</CardTitle>
          <CardDescription className="text-slate-300">
            {stores.length} boutique(s) — Relancer un scan ou supprimer (danger).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stores.length ? (
            <p className="text-sm text-slate-300">Aucune boutique.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-left font-medium">Nom</th>
                    <th className="pb-2 text-left font-medium">URL</th>
                    <th className="pb-2 text-left font-medium">Objectif</th>
                    <th className="pb-2 text-left font-medium">Utilisateur</th>
                    <th className="pb-2 text-left font-medium">Créé le</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((s) => (
                    <tr key={s.id} className="border-b border-white/10">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3">
                        <a
                          href={s.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {s.website_url}
                        </a>
                      </td>
                      <td className="py-3">{s.goal}</td>
                      <td className="py-3">
                        <Link href={`/admin/users?user_id=${s.user_id}`} className="text-primary hover:underline">
                          {emailByUser.get(s.user_id) ?? s.user_id}
                        </Link>
                      </td>
                      <td className="py-3">{formatDate(s.created_at)}</td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`mr-1 ${actionOutlineClass}`}
                          disabled={loading === s.id}
                          onClick={() => rescan(s.id)}
                        >
                          {loading === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Rescan"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirm(s)}
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
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
              Supprimer la boutique
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Action irréversible. Les scans associés seront supprimés.
              {deleteConfirm && <span className="mt-2 block font-medium">{deleteConfirm.name}</span>}
              <span className="mt-2 block">Tapez <strong>DELETE</strong> pour confirmer.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="DELETE"
              value={deleteTyped}
              onChange={(e) => setDeleteTyped(e.target.value)}
              className="font-mono border-rose-500/60 bg-slate-950 text-slate-100"
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
            <Button variant="destructive" onClick={deleteStore} disabled={deleteTyped !== "DELETE"}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
