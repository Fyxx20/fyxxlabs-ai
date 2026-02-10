import { createClient } from "@supabase/supabase-js";
import type { Connector, ApiKeyConnectParams } from "./types";
import { decryptCredentials } from "@/lib/integrations-encrypt";

const config = {
  provider: "prestashop" as const,
  displayName: "PrestaShop",
  connectType: "apikey" as const,
  canFetchOrders: true,
  canFetchCustomers: true,
  canFetchProducts: true,
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function normalizeUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http")) u = `https://${u}`;
  return u;
}

async function prestashopRequest(
  baseUrl: string,
  apiKey: string,
  path: string
): Promise<{ ok: boolean; data?: unknown }> {
  const url = `${normalizeUrl(baseUrl)}/api/${path}?output_format=JSON`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
  });
  if (!res.ok) return { ok: false };
  const data = await res.json().catch(() => null);
  return { ok: true, data };
}

export const prestashopConnector: Connector = {
  config,

  async startConnect() {
    return null;
  },

  async testConnection(params: ApiKeyConnectParams): Promise<boolean> {
    const { storeUrl, apiKey } = params;
    if (!apiKey) return false;
    const { ok } = await prestashopRequest(storeUrl, apiKey, "");
    return ok;
  },

  async initialSync(storeId: string): Promise<void> {
    const admin = getAdminClient();
    const { data: row } = await admin
      .from("store_integrations")
      .select("credentials_encrypted, shop_domain")
      .eq("store_id", storeId)
      .eq("provider", "prestashop")
      .eq("status", "connected")
      .single();

    if (!row?.credentials_encrypted) return;

    let apiKey: string;
    try {
      const creds = JSON.parse(decryptCredentials(row.credentials_encrypted));
      apiKey = creds.api_key ?? "";
    } catch {
      return;
    }

    const baseUrl = row.shop_domain ?? "";
    let revenue = 0;
    let ordersCount = 0;

    const { data: ordersWrap } = await prestashopRequest(
      baseUrl,
      apiKey,
      "orders?display=full"
    );
    const orders = ordersWrap && typeof ordersWrap === "object" && "orders" in ordersWrap
      ? (ordersWrap as { orders: unknown[] }).orders
      : [];
    if (Array.isArray(orders)) {
      const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (const o of orders as { date_add?: string; total_paid_tax_incl?: string }[]) {
        const date = o.date_add ? new Date(o.date_add).getTime() : 0;
        if (date >= since) {
          ordersCount += 1;
          const t = parseFloat(o.total_paid_tax_incl ?? "0");
          if (!Number.isNaN(t)) revenue += t;
        }
      }
    }

    const { data: custWrap } = await prestashopRequest(baseUrl, apiKey, "customers?display=full");
    const customers = custWrap && typeof custWrap === "object" && "customers" in custWrap
      ? (custWrap as { customers: unknown[] }).customers
      : [];
    const totalCustomers = Array.isArray(customers) ? customers.length : 0;

    const day = new Date().toISOString().slice(0, 10);
    await admin.from("store_metrics_daily").upsert(
      {
        store_id: storeId,
        day,
        provider: "prestashop",
        revenue,
        orders_count: ordersCount,
        refunds: 0,
        aov: ordersCount > 0 ? revenue / ordersCount : null,
        new_customers: 0,
        total_customers: totalCustomers,
      },
      { onConflict: "store_id,day,provider" }
    );

    await admin
      .from("store_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("provider", "prestashop");
  },
};
