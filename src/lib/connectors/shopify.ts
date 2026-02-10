import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Connector, OAuthStartParams, OAuthCallbackParams } from "./types";
import { encryptCredentials, decryptCredentials } from "@/lib/integrations-encrypt";

const config = {
  provider: "shopify" as const,
  displayName: "Shopify",
  connectType: "oauth" as const,
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

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";
const SCOPES = "read_orders,read_customers,read_products";

function verifyShopifyHmac(query: Record<string, string>, secret: string): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;
  const sorted = Object.keys(query)
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join("&");
  const computed = createHmac("sha256", secret).update(sorted).digest("hex");
  return computed === hmac;
}

export const shopifyConnector: Connector = {
  config,

  async startConnect(params: OAuthStartParams): Promise<string | null> {
    if (!SHOPIFY_CLIENT_ID) return null;
    const shop = (params.shop ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!shop) return null;
    const redirectUri = params.redirectUri;
    const state = params.state ?? params.storeId;
    return `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  },

  async handleCallback(params: OAuthCallbackParams): Promise<{ storeId: string }> {
    const { code, shop, state } = params;
    if (!code || !shop) throw new Error("Missing code or shop");
    const query = params as unknown as Record<string, string>;
    if (SHOPIFY_CLIENT_SECRET && !verifyShopifyHmac(query, SHOPIFY_CLIENT_SECRET)) {
      throw new Error("Invalid HMAC");
    }
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Token exchange failed");
    }
    const data = (await res.json()) as { access_token?: string };
    const accessToken = data.access_token;
    if (!accessToken) throw new Error("No access_token");

    const storeId = state;
    const admin = getAdminClient();
    const credentials = encryptCredentials(JSON.stringify({ access_token: accessToken }));

    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    let metadata: Record<string, unknown> = {};
    if (shopRes.ok) {
      const shopData = (await shopRes.json()) as { shop?: { name?: string; currency?: string; plan_name?: string } };
      if (shopData.shop) {
        metadata = {
          shop_name: shopData.shop.name,
          currency: shopData.shop.currency,
          plan_name: shopData.shop.plan_name,
        };
      }
    }

    await admin.from("store_integrations").upsert(
      {
        store_id: storeId,
        provider: "shopify",
        status: "connected",
        credentials_encrypted: credentials,
        shop_domain: shop,
        metadata,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,provider" }
    );

    return { storeId };
  },

  async testConnection(): Promise<boolean> {
    return true;
  },

  async initialSync(storeId: string): Promise<void> {
    const admin = getAdminClient();
    const { data: row } = await admin
      .from("store_integrations")
      .select("credentials_encrypted, shop_domain")
      .eq("store_id", storeId)
      .eq("provider", "shopify")
      .eq("status", "connected")
      .single();

    if (!row?.credentials_encrypted || !row.shop_domain) return;

    let accessToken: string;
    try {
      const creds = JSON.parse(decryptCredentials(row.credentials_encrypted));
      accessToken = creds.access_token ?? "";
    } catch {
      return;
    }

    const shop = row.shop_domain;
    const base = `https://${shop}/admin/api/2024-01`;
    const headers = { "X-Shopify-Access-Token": accessToken };

    let revenue = 0;
    let ordersCount = 0;
    let nextPage: string | null = `${base}/orders.json?status=any&limit=250&created_at_min=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`;

    while (nextPage) {
      const res: Response = await fetch(nextPage, { headers });
      if (!res.ok) break;
      const data = (await res.json()) as { orders?: { total_price?: string }[]; orders_page?: unknown };
      const orders = (data as { orders?: { total_price?: string }[] }).orders ?? [];
      for (const o of orders) {
        ordersCount += 1;
        const t = parseFloat(o.total_price ?? "0");
        if (!Number.isNaN(t)) revenue += t;
      }
      const link = res.headers.get("link");
      nextPage = null;
      if (link?.includes('rel="next"')) {
        const m = link.match(/<([^>]+)>;\s*rel="next"/);
        if (m) nextPage = m[1];
      }
    }

    let totalCustomers = 0;
    let custNext: string | null = `${base}/customers/count.json`;
    const countRes = await fetch(custNext, { headers });
    if (countRes.ok) {
      const c = (await countRes.json()) as { count?: number };
      totalCustomers = c.count ?? 0;
    }

    const day = new Date().toISOString().slice(0, 10);
    await admin.from("store_metrics_daily").upsert(
      {
        store_id: storeId,
        day,
        provider: "shopify",
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
      .eq("provider", "shopify");
  },
};
