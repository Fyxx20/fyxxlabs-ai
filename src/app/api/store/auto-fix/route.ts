import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchShopifyProducts,
  updateShopifyProduct,
  updateShopifyProductSEO,
  type ShopifyProduct,
} from "@/lib/connectors/shopify";
import { isOpenAIAvailable, callOpenAIJson } from "@/lib/ai/openaiClient";

export const maxDuration = 60;

const AUTO_FIX_SYSTEM_PROMPT = `Tu es un expert en e-commerce, copywriting et SEO pour Shopify.

MISSION: Améliorer les fiches produit d'une boutique Shopify pour maximiser les conversions.

Pour chaque produit, tu dois proposer:
1. Un titre optimisé (accrocheur, avec bénéfice principal, max 70 caractères)
2. Une description HTML améliorée (persuasive, structurée avec des bullets, bénéfices > caractéristiques, preuve sociale si pertinent)
3. Un titre SEO (meta title) optimisé (max 60 caractères, avec mot-clé principal)
4. Une meta description SEO optimisée (max 155 caractères, avec appel à l'action)
5. Des tags optimisés (catégories pertinentes, séparés par virgules)

RÈGLES:
- Garde le même langue que l'original (FR ou EN)
- Ne change PAS le nom du produit si c'est une marque connue
- Utilise des mots puissants : exclusif, premium, livraison rapide, satisfait ou remboursé
- Structure les descriptions avec des bullets HTML (<ul><li>)
- Ajoute des emojis pertinents dans la description si approprié
- Réponds UNIQUEMENT en JSON valide`;

interface ProductFix {
  product_id: number;
  original_title: string;
  new_title: string;
  new_body_html: string;
  new_seo_title: string;
  new_seo_description: string;
  new_tags: string;
  improvements: string[];
}

/** POST: Generate AI fixes for products */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { storeId, action } = body as { storeId: string; action: "preview" | "apply"; productIds?: number[] };

    // Verify store ownership
    const { data: store } = await supabase
      .from("stores")
      .select("id, user_id, website_url")
      .eq("id", storeId)
      .single();

    if (!store || store.user_id !== user.id) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }

    // Check Shopify connection
    const products = await fetchShopifyProducts(storeId);
    if (products.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit trouvé. Vérifiez la connexion Shopify." },
        { status: 400 }
      );
    }

    if (!isOpenAIAvailable()) {
      return NextResponse.json({ error: "IA non disponible" }, { status: 503 });
    }

    // Filter to requested products or take first 10
    const targetProducts = body.productIds
      ? products.filter((p: ShopifyProduct) => body.productIds.includes(p.id))
      : products.slice(0, 10);

    // Generate AI fixes
    const productSummaries = targetProducts.map((p: ShopifyProduct) => ({
      id: p.id,
      title: p.title,
      body_html: (p.body_html ?? "").slice(0, 500),
      price: p.variants?.[0]?.price ?? "N/A",
      tags: p.tags,
      images_count: p.images?.length ?? 0,
      has_alt_text: p.images?.some((img) => img.alt && img.alt.length > 0) ?? false,
    }));

    const userMessage = `Voici les produits à optimiser:\n${JSON.stringify(productSummaries, null, 2)}\n\nProduis un JSON avec la structure: { "fixes": [{ "product_id": number, "original_title": string, "new_title": string, "new_body_html": string (HTML complet), "new_seo_title": string, "new_seo_description": string, "new_tags": string, "improvements": string[] }] }`;

    const aiResult = await callOpenAIJson<{ fixes: ProductFix[] }>({
      system: AUTO_FIX_SYSTEM_PROMPT,
      user: userMessage,
      maxTokens: 4000,
      temperature: 0.4,
    });

    if (!aiResult.fixes || !Array.isArray(aiResult.fixes)) {
      return NextResponse.json({ error: "Échec de génération IA" }, { status: 500 });
    }

    if (action === "preview") {
      // Return fixes for user review before applying
      return NextResponse.json({
        products_total: products.length,
        fixes: aiResult.fixes,
        message: `${aiResult.fixes.length} produit(s) à optimiser. Vérifiez les modifications avant d'appliquer.`,
      });
    }

    if (action === "apply") {
      // Apply fixes to Shopify
      const results: Array<{ product_id: number; title: string; success: boolean; error?: string }> = [];

      for (const fix of aiResult.fixes) {
        try {
          const productUpdate = await updateShopifyProduct(storeId, fix.product_id, {
            title: fix.new_title,
            body_html: fix.new_body_html,
            tags: fix.new_tags,
          });

          if (productUpdate) {
            await updateShopifyProductSEO(
              storeId,
              fix.product_id,
              fix.new_seo_title,
              fix.new_seo_description
            );
          }

          results.push({
            product_id: fix.product_id,
            title: fix.new_title,
            success: productUpdate,
          });
        } catch (err) {
          results.push({
            product_id: fix.product_id,
            title: fix.original_title,
            success: false,
            error: err instanceof Error ? err.message : "Erreur inconnue",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      return NextResponse.json({
        results,
        message: `${successCount}/${results.length} produit(s) mis à jour avec succès.`,
      });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (err) {
    console.error("[auto-fix] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}

/** GET: Fetch products with their current data for preview */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const storeId = req.nextUrl.searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json({ error: "storeId requis" }, { status: 400 });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, user_id")
      .eq("id", storeId)
      .single();

    if (!store || store.user_id !== user.id) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }

    const products = await fetchShopifyProducts(storeId);
    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        body_html: (p.body_html ?? "").slice(0, 300),
        handle: p.handle,
        price: p.variants?.[0]?.price ?? null,
        images_count: p.images?.length ?? 0,
        first_image: p.images?.[0]?.src ?? null,
        tags: p.tags,
      })),
      total: products.length,
    });
  } catch (err) {
    console.error("[auto-fix GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
