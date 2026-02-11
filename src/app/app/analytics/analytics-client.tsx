"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Clock,
  Award,
  Store,
  Globe,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

interface ShopInfo {
  name: string;
  domain: string;
  currency: string;
  plan: string;
  country: string;
}

interface OrderItem {
  id: number;
  name: string;
  total: string;
  status: string;
  fulfillment: string;
  date: string;
  items: number;
  firstProduct: string;
}

interface TopProduct {
  name: string;
  count: number;
}

interface AnalyticsData {
  shop: ShopInfo | null;
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: string;
    avgOrderValue: string;
    paidOrders: number;
  };
  recentOrders: OrderItem[];
  topProducts: TopProduct[];
}

export default function AnalyticsClient({ storeId }: { storeId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/store/analytics?storeId=${storeId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors du chargement");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      paid: { label: "Payée", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
      pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
      refunded: { label: "Remboursée", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
      partially_paid: { label: "Partiel", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
      voided: { label: "Annulée", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    };
    return map[s] || { label: s, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
  };

  const fulfillmentLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      fulfilled: { label: "Expédiée", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
      unfulfilled: { label: "Non expédiée", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
      partial: { label: "Partielle", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    };
    return map[s] || { label: s, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
  };

  const formatCurrency = (val: string) => {
    const num = parseFloat(val);
    const currency = data?.shop?.currency || "EUR";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(num);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Vue d&apos;ensemble de votre boutique Shopify en temps réel
              </p>
            </div>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données Shopify…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button onClick={fetchAnalytics} className="mt-4 text-sm text-primary hover:underline">
            Réessayer
          </button>
        </div>
      )}

      {/* Data */}
      {data && !loading && (
        <>
          {/* Shop info bar */}
          {data.shop && (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{data.shop.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span>{data.shop.domain}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                <span>{data.shop.plan}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {data.shop.country} • {data.shop.currency}
              </div>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Produits"
              value={data.stats.totalProducts.toString()}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Commandes"
              value={data.stats.totalOrders.toString()}
              sub={`${data.stats.paidOrders} payées`}
              accent="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Chiffre d'affaires"
              value={formatCurrency(data.stats.totalRevenue)}
              accent="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Panier moyen"
              value={formatCurrency(data.stats.avgOrderValue)}
              accent="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent orders */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">Dernières commandes</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {data.recentOrders.length} dernières
                </span>
              </div>

              {data.recentOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune commande pour le moment</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.recentOrders.map((order) => {
                    const st = statusLabel(order.status);
                    const fl = fulfillmentLabel(order.fulfillment);
                    return (
                      <div
                        key={order.id}
                        className="p-4 hover:bg-accent/50 transition flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{order.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>
                              {st.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fl.color}`}>
                              {fl.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {order.firstProduct}
                            {order.items > 1 && ` +${order.items - 1} autre${order.items > 2 ? "s" : ""}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">{formatCurrency(order.total)}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDate(order.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="rounded-xl border border-border bg-card">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Award className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Top Produits</h2>
              </div>

              {data.topProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune donnée</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {data.topProducts.map((product, i) => {
                    const maxCount = data.topProducts[0].count;
                    const pct = Math.round((product.count / maxCount) * 100);
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" :
                              i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                              "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                            }`}>
                              {i + 1}
                            </span>
                            <span className="truncate">{product.name}</span>
                          </span>
                          <span className="text-muted-foreground font-medium shrink-0 ml-2">
                            {product.count} ventes
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Actions rapides
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.shop && (
                <a
                  href={`https://${data.shop.domain}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border px-4 py-3 hover:bg-accent transition flex items-center justify-between group"
                >
                  <span className="text-sm font-medium">Admin Shopify</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                </a>
              )}
              <a
                href="/app/scans"
                className="rounded-lg border border-border px-4 py-3 hover:bg-accent transition flex items-center justify-between group"
              >
                <span className="text-sm font-medium">Lancer un scan</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
              </a>
              <a
                href="/app/auto-fix"
                className="rounded-lg border border-border px-4 py-3 hover:bg-accent transition flex items-center justify-between group"
              >
                <span className="text-sm font-medium">Auto-Fix IA</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
              </a>
            </div>
          </div>

          {/* Performance tips */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5">
            <h3 className="font-semibold mb-3">💡 Conseils performance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parseFloat(data.stats.avgOrderValue) < 30 && (
                <TipCard
                  icon={<ArrowUpRight className="h-4 w-4 text-orange-500" />}
                  text="Panier moyen bas — ajoutez des upsells ou bundles pour augmenter la valeur"
                />
              )}
              {data.stats.totalOrders === 0 && (
                <TipCard
                  icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
                  text="Aucune commande encore — lancez des publicités et optimisez votre boutique"
                />
              )}
              {data.stats.totalProducts < 5 && (
                <TipCard
                  icon={<Package className="h-4 w-4 text-blue-500" />}
                  text="Peu de produits — ajoutez plus d'articles pour améliorer la conversion"
                />
              )}
              <TipCard
                icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                text="Utilisez le Coach IA pour obtenir des recommandations personnalisées"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`rounded-lg p-2 ${accent}`}>{icon}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function TipCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
