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

export function WooCommerceConnectModal({
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
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/integrations/woocommerce/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        store_url: storeUrl,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
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
          <DialogTitle>Connecter WooCommerce</DialogTitle>
          <DialogDescription>
            WooCommerce → Paramètres avancés → REST API → Créer une clé. Colle la clé de consommateur et le secret.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>URL du site</Label>
            <Input value={storeUrl} readOnly className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="woo-ck">Clé de consommateur (Consumer key)</Label>
            <Input
              id="woo-ck"
              type="text"
              placeholder="ck_..."
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="woo-cs">Secret de consommateur (Consumer secret)</Label>
            <Input
              id="woo-cs"
              type="password"
              placeholder="cs_..."
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
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
          <Button onClick={handleTest} disabled={loading || !consumerKey || !consumerSecret}>
            {loading ? "Connexion…" : "Tester et connecter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
