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
  const { url, niche } = body;

  if (!url) {
    return NextResponse.json({ error: "URL du concurrent requise" }, { status: 400 });
  }

  /* ── Scrape the competitor page ── */
  let pageContent = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    // Extract text content (strip HTML tags, scripts, styles)
    pageContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000); // Limit for API context
  } catch {
    pageContent = `Impossible de scraper ${url}. Analyse basée sur l'URL et la niche uniquement.`;
  }

  const result = await callOpenAIJson<{
    store_name: string;
    overall_score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    categories: Array<{
      name: string;
      score: number;
      analysis: string;
      recommendations: string[];
    }>;
  }>({
    system: `Tu es un expert en analyse concurrentielle e-commerce et marketing digital.
Tu analyses les boutiques en ligne et fournis des rapports détaillés avec des scores, forces, faiblesses et recommandations.
Sois précis, actionnable et stratégique dans tes recommandations.
Réponds en JSON en français.`,
    user: `Analyse ce concurrent e-commerce:
URL: ${url}
Niche: ${niche || "Non précisée"}
Contenu extrait du site: ${pageContent}

Fournis une analyse complète avec:
1. Score global /100
2. Forces et faiblesses
3. Opportunités à exploiter
4. Scores détaillés par catégorie (Design & UX, SEO, Offre produit, Confiance & crédibilité, Marketing, Prix & positionnement)
5. Recommandations actionnables pour chaque catégorie`,
    schemaHint: `{ "store_name": "string", "overall_score": number, "summary": "string", "strengths": ["string"], "weaknesses": ["string"], "opportunities": ["string"], "categories": [{ "name": "string", "score": number (0-100), "analysis": "string", "recommendations": ["string"] }] }`,
    maxTokens: 3000,
    temperature: 0.4,
  });

  return NextResponse.json(result);
}
