"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Flags = {
  enable_lighthouse_paid: boolean;
  scan_rate_limit_minutes: number;
  max_pages_per_scan: number;
  max_scans_per_day_paid: number;
};

export function AdminFeatureFlagsForm({ initialFlags }: { initialFlags: Flags }) {
  const router = useRouter();
  const [flags, setFlags] = useState<Flags>(initialFlags);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flags),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(`Erreur: ${data.error ?? "Impossible de sauvegarder"}`);
      return;
    }
    setMessage("Paramètres sauvegardés.");
    router.refresh();
  }

  return (
    <Card className="border-white/10 bg-slate-900/70 text-slate-100">
      <CardHeader>
        <CardTitle>Feature flags (édition live)</CardTitle>
        <CardDescription className="text-slate-300">
          Modifie les limites et options globales en temps réel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
          <div>
            <p className="text-sm font-medium text-white">Lighthouse payant</p>
            <p className="text-xs text-slate-300">Autoriser l’analyse Lighthouse pour les plans payants.</p>
          </div>
          <button
            type="button"
            onClick={() => setFlags((f) => ({ ...f, enable_lighthouse_paid: !f.enable_lighthouse_paid }))}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              flags.enable_lighthouse_paid
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                : "border-white/20 bg-white/5 text-slate-200"
            }`}
          >
            {flags.enable_lighthouse_paid ? "Activé" : "Désactivé"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-slate-200">Rate limit scan (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={flags.scan_rate_limit_minutes}
              onChange={(e) =>
                setFlags((f) => ({ ...f, scan_rate_limit_minutes: Number(e.target.value || 1) }))
              }
              className="border-white/15 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Max pages par scan</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={flags.max_pages_per_scan}
              onChange={(e) =>
                setFlags((f) => ({ ...f, max_pages_per_scan: Number(e.target.value || 1) }))
              }
              className="border-white/15 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Max scans/jour (payant)</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={flags.max_scans_per_day_paid}
              onChange={(e) =>
                setFlags((f) => ({ ...f, max_scans_per_day_paid: Number(e.target.value || 1) }))
              }
              className="border-white/15 bg-slate-950 text-slate-100"
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.startsWith("Erreur") ? "text-rose-300" : "text-emerald-300"}`}>
            {message}
          </p>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="bg-violet-600 text-white hover:bg-violet-500"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sauvegarder les flags
        </Button>
      </CardContent>
    </Card>
  );
}
