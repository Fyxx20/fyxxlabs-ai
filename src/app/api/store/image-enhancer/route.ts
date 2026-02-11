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
  const { imageUrl, productType, storeId } = body;

  if (!imageUrl) {
    return NextResponse.json({ error: "URL de l'image requise" }, { status: 400 });
  }

  if (storeId) {
    const { data: store } = await supabase.from("stores").select("id, user_id").eq("id", storeId).single();
    if (!store || store.user_id !== user.id) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }
  }

  const result = await callOpenAIJson<{
    overall_score: number;
    analysis: string;
    issues: Array<{
      issue: string;
      severity: "high" | "medium" | "low";
      fix: string;
    }>;
    recommendations: Array<{
      category: string;
      tip: string;
      impact: "high" | "medium" | "low";
    }>;
    alt_text_suggestion: string;
    seo_filename_suggestion: string;
  }>({
    system: `Tu es un expert en photographie e-commerce et en optimisation d'images produit.
Tu analyses les images produit et fournis des recommandations détaillées pour améliorer les conversions.
Même si tu ne peux pas "voir" l'image, analyse l'URL et le type de produit pour donner des conseils photographiques professionnels.
Réponds en JSON en français.`,
    user: `Analyse cette image produit pour un site e-commerce:
URL de l'image: ${imageUrl}
Type de produit: ${productType || "Non précisé"}

Fournis:
1. Un score global de qualité /100
2. Les problèmes détectés avec sévérité et solution
3. Des recommandations par catégorie (éclairage, composition, fond, résolution, lifestyle, angles)
4. Une suggestion de texte alt SEO
5. Une suggestion de nom de fichier SEO`,
    schemaHint: `{ "overall_score": number, "analysis": "string", "issues": [{ "issue": "string", "severity": "high|medium|low", "fix": "string" }], "recommendations": [{ "category": "string", "tip": "string", "impact": "high|medium|low" }], "alt_text_suggestion": "string", "seo_filename_suggestion": "string" }`,
    maxTokens: 2000,
    temperature: 0.4,
  });

  return NextResponse.json(result);
}
