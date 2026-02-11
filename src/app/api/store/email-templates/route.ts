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
  const { storeName, templateType, productName, discount, tone } = body;

  if (!storeName || !templateType) {
    return NextResponse.json({ error: "Nom de boutique et type de template requis" }, { status: 400 });
  }

  const templateTypes: Record<string, string> = {
    welcome: "Email de bienvenue pour un nouvel inscrit / nouveau client",
    abandoned_cart: "Email de relance pour panier abandonné (séquence de 3 emails)",
    post_purchase: "Email post-achat (remerciement + demande d'avis + upsell)",
    promotion: "Email promotionnel / offre spéciale / vente flash",
    reengagement: "Email de ré-engagement pour clients inactifs",
    launch: "Email de lancement de nouveau produit",
  };

  const result = await callOpenAIJson<{
    emails: Array<{
      subject: string;
      preheader: string;
      body_html: string;
      send_timing: string;
      tips: string[];
    }>;
  }>({
    system: `Tu es un expert en email marketing e-commerce. Tu crées des emails qui ont des taux d'ouverture et de conversion élevés.
Les emails doivent être en français, avec un HTML simple et propre (compatible email clients).
Utilise des emojis dans les objets pour augmenter le taux d'ouverture.
Chaque email doit inclure : objet, preheader, corps HTML, timing d'envoi optimal et conseils.
Réponds en JSON.`,
    user: `Boutique: ${storeName}
Type: ${templateTypes[templateType] || templateType}
Produit mentionné: ${productName || "Produits de la boutique en général"}
Réduction à mentionner: ${discount || "Aucune réduction spécifique"}
Ton: ${tone || "Professionnel et chaleureux"}

Génère les emails de cette séquence.`,
    schemaHint: `{ "emails": [{ "subject": "string", "preheader": "string", "body_html": "string (HTML simple)", "send_timing": "string", "tips": ["string"] }] }`,
    maxTokens: 3000,
    temperature: 0.6,
  });

  return NextResponse.json(result);
}
