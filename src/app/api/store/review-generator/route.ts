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
  const { productName, productFeatures, rating, count, language } = body;

  if (!productName) {
    return NextResponse.json({ error: "Nom du produit requis" }, { status: 400 });
  }

  const result = await callOpenAIJson<{
    reviews: Array<{
      name: string;
      rating: number;
      title: string;
      body: string;
      date: string;
      verified: boolean;
    }>;
  }>({
    system: `Tu es un expert en marketing e-commerce. Tu génères des avis clients réalistes et variés.
Les avis doivent sembler authentiques avec des prénoms réalistes, des formulations naturelles et des détails spécifiques.
Inclus des variations de note (4-5 étoiles principalement, parfois 3).
Chaque avis doit mentionner des aspects différents du produit.
Réponds en JSON.`,
    user: `Produit: ${productName}
Caractéristiques: ${productFeatures || "Non précisées"}
Note moyenne souhaitée: ${rating || "4.5"}/5
Nombre d'avis à générer: ${count || 5}
Langue: ${language || "Français"}

Génère des avis clients réalistes et variés.`,
    schemaHint: `{ "reviews": [{ "name": "string (prénom réaliste)", "rating": number (1-5), "title": "string", "body": "string", "date": "string (date relative type 'il y a 3 jours')", "verified": boolean }] }`,
    maxTokens: 2500,
    temperature: 0.8,
  });

  return NextResponse.json(result);
}
