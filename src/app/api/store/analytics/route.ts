import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShopifyCredentials } from "@/lib/connectors/shopify";

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId requis" }, { status: 400 });
  }

  const { data: store } = await supabase.from("stores").select("id, user_id").eq("id", storeId).single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const creds = await getShopifyCredentials(storeId);
  if (!creds) {
    return NextResponse.json({ error: "Shopify non connecté" }, { status: 400 });
  }

  const { accessToken, shop } = creds;
  const base = `https://${shop}/admin/api/2024-01`;
  const headers = { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" };

  try {
    // Fetch in parallel: products count, orders, shop info
    const [productsRes, ordersRes, shopRes] = await Promise.all([
      fetch(`${base}/products/count.json`, { headers }),
      fetch(`${base}/orders.json?status=any&limit=50`, { headers }),
      fetch(`${base}/shop.json`, { headers }),
    ]);

    const productsCount = productsRes.ok ? (await productsRes.json()).count : 0;
    const ordersData = ordersRes.ok ? (await ordersRes.json()).orders : [];
    const shopData = shopRes.ok ? (await shopRes.json()).shop : null;

    // Calculate stats from orders
    const totalRevenue = ordersData.reduce((sum: number, o: { total_price: string }) => sum + parseFloat(o.total_price || "0"), 0);
    const paidOrders = ordersData.filter((o: { financial_status: string }) => o.financial_status === "paid" || o.financial_status === "partially_paid");
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Recent orders summary (last 10)
    const recentOrders = ordersData.slice(0, 10).map((o: {
      id: number;
      name: string;
      total_price: string;
      financial_status: string;
      fulfillment_status: string | null;
      created_at: string;
      line_items: Array<{ title: string }>;
    }) => ({
      id: o.id,
      name: o.name,
      total: o.total_price,
      status: o.financial_status,
      fulfillment: o.fulfillment_status || "unfulfilled",
      date: o.created_at,
      items: o.line_items?.length || 0,
      firstProduct: o.line_items?.[0]?.title || "N/A",
    }));

    // Top products by frequency in orders
    const productFreq: Record<string, number> = {};
    for (const order of ordersData) {
      for (const item of (order.line_items || [])) {
        const title = item.title || "Inconnu";
        productFreq[title] = (productFreq[title] || 0) + (item.quantity || 1);
      }
    }
    const topProducts = Object.entries(productFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      shop: shopData ? {
        name: shopData.name,
        domain: shopData.domain,
        currency: shopData.currency,
        plan: shopData.plan_display_name,
        country: shopData.country_name,
      } : null,
      stats: {
        totalProducts: productsCount,
        totalOrders: ordersData.length,
        totalRevenue: totalRevenue.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        paidOrders: paidOrders.length,
      },
      recentOrders,
      topProducts,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur Shopify" }, { status: 500 });
  }
}
