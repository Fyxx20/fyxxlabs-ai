import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callOpenAIJson } from "@/lib/ai/openaiClient";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { niche, budget, targetMarket, season } = body;

  const result = await callOpenAIJson<{
    products: Array<{
      name: string;
      category: string;
      description: string;
      why_winning: string;
      estimated_buy_price: string;
      suggested_sell_price: string;
      estimated_margin: string;
      target_audience: string;
      marketing_angle: string;
      competition_level: "low" | "medium" | "high";
      trend_score: number;
      sourcing_tips: string;
      ad_hook: string;
    }>;
    market_insights: string[];
    avoid_products: string[];
  }>({
    system: `Tu es un expert en dropshipping et en recherche de produits gagnants (winning products).
Tu connais les tendances e-commerce, les produits viraux sur TikTok/Instagram, et les niches rentables.
Tu analyses les tendances actuelles du marché pour suggérer des produits à fort potentiel de vente.
Base-toi sur les tendances actuelles (2024-2025), les saisons, et les comportements d'achat.
Réponds en JSON en français.`,
    user: `Trouve des produits gagnants pour un dropshipper:
Niche préférée: ${niche || "Toutes niches"}
Budget de départ: ${budget || "Non précisé"}
Marché cible: ${targetMarket || "France / Europe"}
Saison actuelle: ${season || "Toute saison"}

Suggère 5 produits gagnants avec analyse complète.
Inclus aussi des insights marché et des produits à éviter.`,
    schemaHint: `{ "products": [{ "name": "string", "category": "string", "description": "string", "why_winning": "string", "estimated_buy_price": "string", "suggested_sell_price": "string", "estimated_margin": "string", "target_audience": "string", "marketing_angle": "string", "competition_level": "low|medium|high", "trend_score": number (1-100), "sourcing_tips": "string", "ad_hook": "string" }], "market_insights": ["string"], "avoid_products": ["string"] }`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  return NextResponse.json(result);
}
