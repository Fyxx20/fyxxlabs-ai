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
const SCOPES = "read_orders,read_customers,read_products,write_products";

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

/* ─── Shopify Write Helpers ─── */

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  product_type: string;
  tags: string;
  images: Array<{ id: number; src: string; alt: string | null }>;
  variants: Array<{ id: number; title: string; price: string; sku: string }>;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
}

export interface ShopifyProductUpdate {
  title?: string;
  body_html?: string;
  tags?: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
}

/** Get decrypted Shopify credentials for a store */
export async function getShopifyCredentials(storeId: string): Promise<{ accessToken: string; shop: string } | null> {
  const admin = getAdminClient();
  const { data: row } = await admin
    .from("store_integrations")
    .select("credentials_encrypted, shop_domain")
    .eq("store_id", storeId)
    .eq("provider", "shopify")
    .eq("status", "connected")
    .single();

  if (!row?.credentials_encrypted || !row.shop_domain) return null;

  try {
    const creds = JSON.parse(decryptCredentials(row.credentials_encrypted));
    return { accessToken: creds.access_token ?? "", shop: row.shop_domain };
  } catch {
    return null;
  }
}

/** Fetch all products from Shopify (paginated, up to 250) */
export async function fetchShopifyProducts(storeId: string): Promise<ShopifyProduct[]> {
  const creds = await getShopifyCredentials(storeId);
  if (!creds) return [];

  const { accessToken, shop } = creds;
  const base = `https://${shop}/admin/api/2024-01`;
  const headers = { "X-Shopify-Access-Token": accessToken };

  const products: ShopifyProduct[] = [];
  let nextPage: string | null = `${base}/products.json?limit=250`;

  while (nextPage && products.length < 250) {
    const res: Response = await fetch(nextPage, { headers });
    if (!res.ok) break;
    const data = (await res.json()) as { products?: ShopifyProduct[] };
    products.push(...(data.products ?? []));

    const link = res.headers.get("link");
    nextPage = null;
    if (link?.includes('rel="next"')) {
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      if (m) nextPage = m[1];
    }
  }

  return products;
}

/** Update a single Shopify product */
export async function updateShopifyProduct(
  storeId: string,
  productId: number,
  updates: ShopifyProductUpdate
): Promise<boolean> {
  const creds = await getShopifyCredentials(storeId);
  if (!creds) return false;

  const { accessToken, shop } = creds;
  const url = `https://${shop}/admin/api/2024-01/products/${productId}.json`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product: { id: productId, ...updates } }),
  });

  return res.ok;
}

/** Update SEO metafields for a product */
export async function updateShopifyProductSEO(
  storeId: string,
  productId: number,
  seoTitle: string,
  seoDescription: string
): Promise<boolean> {
  const creds = await getShopifyCredentials(storeId);
  if (!creds) return false;

  const { accessToken, shop } = creds;
  const base = `https://${shop}/admin/api/2024-01`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  // Update product metafields for SEO
  const metafields = [
    { namespace: "global", key: "title_tag", value: seoTitle, type: "single_line_text_field" },
    { namespace: "global", key: "description_tag", value: seoDescription, type: "single_line_text_field" },
  ];

  let success = true;
  for (const mf of metafields) {
    const res = await fetch(`${base}/products/${productId}/metafields.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ metafield: mf }),
    });
    if (!res.ok) success = false;
  }

  return success;
}

/** Create a new product on Shopify */
export async function createShopifyProduct(
  storeId: string,
  product: {
    title: string;
    body_html: string;
    product_type?: string;
    tags?: string;
    images?: Array<{ src: string; alt?: string }>;
    variants?: Array<{ price: string; compare_at_price?: string; sku?: string; title?: string }>;
  }
): Promise<{ success: boolean; productId?: number; handle?: string; error?: string }> {
  const creds = await getShopifyCredentials(storeId);
  if (!creds) return { success: false, error: "Shopify non connecté" };

  const { accessToken, shop } = creds;
  const url = `https://${shop}/admin/api/2024-01/products.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Shopify ${res.status}: ${text.slice(0, 200)}` };
  }

  const data = (await res.json()) as { product?: { id: number; handle: string } };
  return {
    success: true,
    productId: data.product?.id,
    handle: data.product?.handle,
  };
}

/** Create a custom collection on Shopify and add product IDs to it */
export async function createShopifyCollection(
  storeId: string,
  collection: {
    title: string;
    body_html?: string;
    image?: { src: string };
  },
  productIds: number[]
): Promise<{ success: boolean; collectionId?: number; error?: string }> {
  const creds = await getShopifyCredentials(storeId);
  if (!creds) return { success: false, error: "Shopify non connecté" };

  const { accessToken, shop } = creds;
  const base = `https://${shop}/admin/api/2024-01`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  // Create custom collection
  const collRes = await fetch(`${base}/custom_collections.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({ custom_collection: collection }),
  });

  if (!collRes.ok) {
    const text = await collRes.text();
    return { success: false, error: `Collection: Shopify ${collRes.status}: ${text.slice(0, 200)}` };
  }

  const collData = (await collRes.json()) as { custom_collection?: { id: number } };
  const collectionId = collData.custom_collection?.id;
  if (!collectionId) return { success: false, error: "Collection ID manquant" };

  // Add products to collection via collects
  for (const productId of productIds) {
    await fetch(`${base}/collects.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        collect: { product_id: productId, collection_id: collectionId },
      }),
    }).catch(() => {/* ignore individual collect errors */});
  }

  return { success: true, collectionId };
}
