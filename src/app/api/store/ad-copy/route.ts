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
  const { productName, productDescription, targetAudience, platform, tone, storeId } = body;

  if (!productName || !platform) {
    return NextResponse.json({ error: "Nom du produit et plateforme requis" }, { status: 400 });
  }

  if (storeId) {
    const { data: store } = await supabase.from("stores").select("id, user_id").eq("id", storeId).single();
    if (!store || store.user_id !== user.id) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }
  }

  const platformMap: Record<string, string> = {
    facebook: "Facebook Ads (texte principal + titre + description du lien)",
    tiktok: "TikTok Ads (hook accrocheur de 3 sec, texte court et percutant, CTA)",
    instagram: "Instagram Ads (caption engageante, hashtags pertinents, CTA)",
    google: "Google Ads (titre court 30 chars max, 2 descriptions 90 chars max)",
  };

  const result = await callOpenAIJson<{
    ads: Array<{
      variant: string;
      headline: string;
      body: string;
      cta: string;
      hashtags?: string[];
    }>;
  }>({
    system: `Tu es un expert en copywriting publicitaire e-commerce. Tu crées des textes publicitaires qui convertissent.
Génère 3 variantes de publicités en français pour la plateforme demandée.
Chaque variante doit avoir un angle différent (émotion, urgence, bénéfice).
Réponds en JSON.`,
    user: `Produit: ${productName}
Description: ${productDescription || "Non fournie"}
Audience cible: ${targetAudience || "Large"}
Plateforme: ${platformMap[platform] || platform}
Ton souhaité: ${tone || "Professionnel et engageant"}

Génère 3 variantes de publicités optimisées pour cette plateforme.`,
    schemaHint: `{ "ads": [{ "variant": "string (Émotion/Urgence/Bénéfice)", "headline": "string", "body": "string", "cta": "string", "hashtags": ["string"] }] }`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  return NextResponse.json(result);
}
