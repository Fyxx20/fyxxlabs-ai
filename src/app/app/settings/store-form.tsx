"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStoreSchema, type UpdateStoreInput } from "@/lib/validations/store";
import type { StoreGoal } from "@/lib/supabase/database.types";

const GOAL_OPTIONS: { value: StoreGoal; label: string }[] = [
  { value: "sales", label: "Augmenter les ventes" },
  { value: "conversion", label: "Améliorer le taux de conversion" },
  { value: "roas", label: "Optimiser le ROAS" },
  { value: "traffic", label: "Augmenter le trafic qualifié" },
  { value: "trust", label: "Renforcer la confiance" },
  { value: "other", label: "Autre" },
];

interface StoreRow {
  id: string;
  name: string;
  website_url: string;
  goal: StoreGoal;
}

export function StoreForm({ store }: { store: StoreRow }) {
  const router = useRouter();
  const [form, setForm] = useState<UpdateStoreInput>({
    name: store.name,
    website_url: store.website_url,
    goal: store.goal,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = updateStoreSchema.safeParse(form);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success) return;
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/store/${store.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website_url">URL du site</Label>
        <Input
          id="website_url"
          type="url"
          value={form.website_url}
          onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Objectif</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.goal}
          onChange={(e) =>
            setForm((f) => ({ ...f, goal: e.target.value as StoreGoal }))
          }
        >
          {GOAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={loading || !parsed.success}>
        {loading ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
