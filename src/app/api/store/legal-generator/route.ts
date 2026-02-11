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
  const { storeName, storeUrl, storeType, country, email, pageType } = body;

  if (!storeName || !pageType) {
    return NextResponse.json({ error: "Nom de la boutique et type de page requis" }, { status: 400 });
  }

  const pageTypes: Record<string, string> = {
    cgv: "Conditions Générales de Vente (CGV) complètes et conformes au droit français/européen",
    privacy: "Politique de confidentialité conforme au RGPD",
    refund: "Politique de retours et remboursements pour e-commerce",
    legal: "Mentions légales obligatoires pour un site e-commerce français",
    shipping: "Politique de livraison détaillée",
  };

  const result = await callOpenAIJson<{
    title: string;
    content: string;
    sections: Array<{ heading: string; body: string }>;
  }>({
    system: `Tu es un expert juridique spécialisé en e-commerce et droit du numérique.
Tu génères des pages légales professionnelles, complètes et conformes au droit français et européen (RGPD, droit de la consommation).
Le contenu doit être prêt à publier sur un site Shopify.
Utilise un langage clair mais juridiquement précis.
Retourne le résultat en JSON.`,
    user: `Boutique: ${storeName}
URL: ${storeUrl || "Non fourni"}
Type de boutique: ${storeType || "E-commerce général"}
Pays: ${country || "France"}
Email de contact: ${email || "contact@example.com"}
Type de page à générer: ${pageTypes[pageType] || pageType}

Génère une page légale complète et professionnelle.`,
    schemaHint: `{ "title": "string", "content": "string (HTML complet de la page)", "sections": [{ "heading": "string", "body": "string (HTML du paragraphe)" }] }`,
    maxTokens: 3000,
    temperature: 0.3,
  });

  return NextResponse.json(result);
}
