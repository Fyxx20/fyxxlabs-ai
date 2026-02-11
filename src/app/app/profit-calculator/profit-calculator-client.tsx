"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Calculator, ArrowLeft, TrendingUp, DollarSign, Percent, Package, Truck, CreditCard, BarChart3,
} from "lucide-react";
import Link from "next/link";

export function ProfitCalculatorClient() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [adsCost, setAdsCost] = useState("");
  const [shopifyFee] = useState(2); // Shopify takes ~2%
  const [paymentFee] = useState(2.9); // Stripe/PayPal
  const [monthlyOrders, setMonthlyOrders] = useState("");

  const calc = useMemo(() => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const ship = parseFloat(shippingCost) || 0;
    const ads = parseFloat(adsCost) || 0;
    const orders = parseInt(monthlyOrders) || 0;

    const shopifyFeeAmount = sell * (shopifyFee / 100);
    const paymentFeeAmount = sell * (paymentFee / 100);
    const totalCost = buy + ship + ads + shopifyFeeAmount + paymentFeeAmount;
    const profit = sell - totalCost;
    const margin = sell > 0 ? (profit / sell) * 100 : 0;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const monthlyRevenue = sell * orders;
    const monthlyProfit = profit * orders;
    const monthlyCost = totalCost * orders;

    return {
      revenue: sell,
      totalCost,
      profit,
      margin,
      roi,
      shopifyFeeAmount,
      paymentFeeAmount,
      monthlyRevenue,
      monthlyProfit,
      monthlyCost,
      orders,
    };
  }, [buyPrice, sellPrice, shippingCost, adsCost, shopifyFee, paymentFee, monthlyOrders]);

  const profitColor = calc.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const marginColor = calc.margin >= 30 ? "text-green-600 dark:text-green-400" : calc.margin >= 15 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculateur de profit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calculez vos marges et votre rentabilité en temps réel
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-6 md:p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Coûts par produit</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Prix d&apos;achat (€)
                </label>
                <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0.00" className="bg-background" step="0.01" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Prix de vente (€)
                </label>
                <Input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00" className="bg-background" step="0.01" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" /> Frais de livraison (€)
                </label>
                <Input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00" className="bg-background" step="0.01" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> Coût pub par vente (€)
                </label>
                <Input type="number" value={adsCost} onChange={(e) => setAdsCost(e.target.value)} placeholder="0.00" className="bg-background" step="0.01" />
              </div>

              <div className="pt-2 border-t">
                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /> Commandes / mois
                </label>
                <Input type="number" value={monthlyOrders} onChange={(e) => setMonthlyOrders(e.target.value)} placeholder="0" className="bg-background" />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Shopify: {shopifyFee}%</span>
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Paiement: {paymentFee}%</span>
            </div>
          </div>
        </div>

        {/* Results section */}
        <div className="space-y-4">
          {/* Per product */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Par produit vendu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Prix de vente</span>
                <span className="text-sm font-semibold">{calc.revenue.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Prix d&apos;achat</span>
                <span className="text-sm">-{(parseFloat(buyPrice) || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Livraison</span>
                <span className="text-sm">-{(parseFloat(shippingCost) || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Pub / acquisition</span>
                <span className="text-sm">-{(parseFloat(adsCost) || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Frais Shopify ({shopifyFee}%)</span>
                <span className="text-sm">-{calc.shopifyFeeAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Frais paiement ({paymentFee}%)</span>
                <span className="text-sm">-{calc.paymentFeeAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold">Profit net</span>
                <span className={`text-lg font-bold ${profitColor}`}>{calc.profit.toFixed(2)} €</span>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <Percent className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Marge nette</p>
                <p className={`text-xl font-bold ${marginColor}`}>{calc.margin.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className={`text-xl font-bold ${calc.roi >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{calc.roi.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly projection */}
          {calc.orders > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Projection mensuelle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CA mensuel</span>
                  <span className="text-sm font-semibold">{calc.monthlyRevenue.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Coûts totaux</span>
                  <span className="text-sm">-{calc.monthlyCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-bold">Profit mensuel</span>
                  <span className={`text-lg font-bold ${calc.monthlyProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {calc.monthlyProfit.toFixed(2)} €
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advice */}
          {parseFloat(sellPrice) > 0 && (
            <div className={`rounded-lg border p-4 text-sm ${
              calc.margin >= 30
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : calc.margin >= 15
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
            }`}>
              <p className="font-medium mb-1">
                {calc.margin >= 30 ? "✅ Bonne marge !" : calc.margin >= 15 ? "⚠️ Marge correcte" : "❌ Marge insuffisante"}
              </p>
              <p className="text-xs text-muted-foreground">
                {calc.margin >= 30
                  ? "Votre marge est saine pour du dropshipping. Vous pouvez investir en publicité."
                  : calc.margin >= 15
                  ? "Votre marge est juste. Essayez de négocier vos prix d'achat ou d'augmenter votre prix de vente."
                  : "Votre marge est trop faible. Augmentez votre prix de vente ou trouvez un fournisseur moins cher."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
