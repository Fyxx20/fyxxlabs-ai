import { createClient } from "@supabase/supabase-js";
import type { Connector, ApiKeyConnectParams } from "./types";
import { encryptCredentials, decryptCredentials } from "@/lib/integrations-encrypt";

const config = {
  provider: "woocommerce" as const,
  displayName: "WooCommerce",
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

async function woocommerceRequest(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  path: string
): Promise<{ ok: boolean; data?: unknown; error?: string; total?: number }> {
  const url = `${normalizeUrl(baseUrl)}/wp-json/wc/v3${path}`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  const total = res.headers.get("x-wp-total");
  const data = await res.json().catch(() => null);
  return {
    ok: true,
    data,
    total: total ? parseInt(total, 10) : undefined,
  };
}

export const woocommerceConnector: Connector = {
  config,

  async startConnect() {
    return null;
  },

  async testConnection(params: ApiKeyConnectParams): Promise<boolean> {
    const { storeUrl, consumerKey, consumerSecret } = params;
    if (!consumerKey || !consumerSecret) return false;
    const { ok } = await woocommerceRequest(
      storeUrl,
      consumerKey,
      consumerSecret,
      "/system_status"
    );
    return ok;
  },

  async initialSync(storeId: string): Promise<void> {
    const admin = getAdminClient();
    const { data: row } = await admin
      .from("store_integrations")
      .select("credentials_encrypted, shop_domain")
      .eq("store_id", storeId)
      .eq("provider", "woocommerce")
      .eq("status", "connected")
      .single();

    if (!row?.credentials_encrypted) return;

    let creds: { consumer_key: string; consumer_secret: string };
    try {
      creds = JSON.parse(decryptCredentials(row.credentials_encrypted));
    } catch {
      return;
    }

    const baseUrl = row.shop_domain ?? "";
    const after = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let revenue = 0;
    let ordersCount = 0;
    let totalCustomers = 0;
    let page = 1;
    const perPage = 100;

    while (true) {
      const result = await woocommerceRequest(
        baseUrl,
        creds.consumer_key,
        creds.consumer_secret,
        `/orders?after=${after}T00:00:00&per_page=${perPage}&page=${page}&status=completed`
      );
      const list = Array.isArray(result.data) ? result.data : [];
      if (list.length === 0) break;
      for (const o of list as { total?: string }[]) {
        ordersCount += 1;
        const t = parseFloat(String(o.total ?? "0"));
        if (!Number.isNaN(t)) revenue += t;
      }
      if (list.length < perPage) break;
      page += 1;
      if (page > 10) break;
    }

    const custRes = await woocommerceRequest(
      baseUrl,
      creds.consumer_key,
      creds.consumer_secret,
      "/customers?per_page=1"
    );
    totalCustomers = custRes.total ?? 0;

    const day = new Date().toISOString().slice(0, 10);
    await admin.from("store_metrics_daily").upsert(
      {
        store_id: storeId,
        day,
        provider: "woocommerce",
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
      .eq("provider", "woocommerce");
  },
};
