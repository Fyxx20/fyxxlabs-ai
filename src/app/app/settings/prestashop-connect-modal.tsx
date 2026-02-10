"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PrestaShopConnectModal({
  open,
  onOpenChange,
  storeId,
  storeUrl,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  storeUrl: string;
  onSuccess: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/integrations/prestashop/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        store_url: storeUrl,
        api_key: apiKey,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Échec de la connexion");
      return;
    }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connecter PrestaShop</DialogTitle>
          <DialogDescription>
            Back Office → Paramètres avancés → Web Service → Génère une clé API. Colle la clé ci-dessous.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>URL du site</Label>
            <Input value={storeUrl} readOnly className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ps-key">Clé API</Label>
            <Input
              id="ps-key"
              type="password"
              placeholder="Clé API PrestaShop"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConnect} disabled={loading || !apiKey}>
            {loading ? "Connexion…" : "Tester et connecter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
