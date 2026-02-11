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
  const { productName, productDescription, platforms, contentCount, niche } = body;

  if (!productName) {
    return NextResponse.json({ error: "Nom du produit requis" }, { status: 400 });
  }

  const result = await callOpenAIJson<{
    posts: Array<{
      platform: string;
      type: string;
      caption: string;
      hashtags: string[];
      best_time: string;
      hook: string;
      video_idea?: string;
      carousel_slides?: string[];
    }>;
    weekly_plan: Array<{
      day: string;
      platform: string;
      content_type: string;
      topic: string;
    }>;
  }>({
    system: `Tu es un expert en social media marketing e-commerce. Tu crées du contenu viral optimisé pour chaque plateforme.
Tu connais les algorithmes d'Instagram, TikTok, Facebook et Pinterest.
Génère des posts prêts à publier avec captions, hashtags, hooks, idées de vidéos et un calendrier hebdomadaire.
Réponds en JSON en français.`,
    user: `Produit: ${productName}
Description: ${productDescription || "Non fournie"}
Niche: ${niche || "E-commerce général"}
Plateformes: ${(platforms || ["instagram", "tiktok"]).join(", ")}
Nombre de posts: ${contentCount || 6}

Génère des posts optimisés pour chaque plateforme + un planning hebdomadaire.`,
    schemaHint: `{ "posts": [{ "platform": "string", "type": "string (Reel/Story/Carrousel/Post/TikTok)", "caption": "string", "hashtags": ["string"], "best_time": "string", "hook": "string", "video_idea": "string (optionnel)", "carousel_slides": ["string (optionnel)"] }], "weekly_plan": [{ "day": "Lundi/Mardi/...", "platform": "string", "content_type": "string", "topic": "string" }] }`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  return NextResponse.json(result);
}
