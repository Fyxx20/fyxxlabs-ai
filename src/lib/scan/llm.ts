import OpenAI from "openai";
import type { ScanData } from "./types";
import type { IssuesPayload, SingleAdvicePayload } from "./types";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

function buildScanContext(scanData: ScanData): string {
  const home = scanData.homepage;
  let text = `## Homepage (${scanData.homepage.url})\n`;
  text += `Title: ${home.title}\n`;
  text += `Meta: ${home.metaDescription ?? "none"}\n`;
  text += `H1: ${home.h1 ?? "none"}\n`;
  text += `Has price: ${home.hasPrice}, CTA: ${home.hasCTA}, Reviews: ${home.hasReviews}, Trust badges: ${home.hasTrustBadges}, Shipping/returns: ${home.hasShippingReturns}\n`;
  text += `Visible text (extract): ${home.visibleText.slice(0, 3000)}\n\n`;
  for (const p of scanData.pages.slice(0, 5)) {
    text += `## Page: ${p.url}\n`;
    text += `Title: ${p.title}, H1: ${p.h1 ?? "none"}\n`;
    text += `Price: ${p.hasPrice}, CTA: ${p.hasCTA}, Reviews: ${p.hasReviews}, Trust: ${p.hasTrustBadges}\n`;
    text += `Text: ${p.visibleText.slice(0, 1500)}\n\n`;
  }
  return text;
}

export async function generateIssuesAndScores(
  scanData: ScanData,
  goal: string,
  isTrial: boolean
): Promise<{ payload: IssuesPayload; singleAdvice: SingleAdvicePayload | null }> {
  const context = buildScanContext(scanData);

  const systemPrompt = `Tu es un expert CRO (Conversion Rate Optimization) et acquisition e-commerce. Tu analyses les données d'un scan de boutique (pages, textes, éléments détectés). Tu dois :
- Donner des scores de 0 à 100 pour : conversion, trust, offer, performance, traffic. La confiance (confidence) est "low" si peu de données, "medium" ou "high" selon la qualité.
- Lister des issues (problèmes) avec priorité P0/P1/P2, category (Conversion, Trust, Offer, Performance, Traffic), title, why_it_hurts, fix_steps (étapes concrètes), example_copy (exemples de texte si pertinent), expected_impact (low/med/high).
- Proposer une next_best_action : une seule action prioritaire avec title et steps.
Ne invente pas de métriques : base-toi uniquement sur les données fournies. Sois actionnable et concret. Réponds en français.`;

  const userPrompt = `Objectif du marchand : ${goal}\n\nDonnées du scan :\n${context}\n\nProduis le JSON avec scores (conversion, trust, offer, performance, traffic, confidence, optional explanations), issues (liste, max 20), et next_best_action.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("LLM returned empty response");
  const parsed = JSON.parse(raw) as IssuesPayload;
  if (!parsed.scores || !Array.isArray(parsed.issues) || !parsed.next_best_action) {
    throw new Error("LLM did not return valid issues payload");
  }

  let singleAdvice: SingleAdvicePayload | null = null;
  if (isTrial && parsed.next_best_action) {
    singleAdvice = {
      single_advice: {
        title: parsed.next_best_action.title,
        why: "Action prioritaire identifiée par l’analyse.",
        how: (parsed.next_best_action.steps ?? []).join(" "),
        example: (parsed.next_best_action.example_copy ?? [])[0] ?? "Voir les étapes ci-dessus.",
      },
    };
  }

  return { payload: parsed, singleAdvice };
}

export async function generateTrialSingleAdviceOnly(
  scanData: ScanData,
  goal: string
): Promise<SingleAdvicePayload> {
  const context = buildScanContext(scanData);

  const systemPrompt = `Tu es un expert CRO e-commerce. On te donne les données d'un scan de boutique. Tu dois retourner UN SEUL conseil prioritaire (single_advice) avec : title (court), why (pourquoi c'est important), how (comment faire), example (exemple de texte ou placement concret). Un seul conseil, le plus impactant. En français.`;

  const userPrompt = `Objectif : ${goal}\n\nDonnées :\n${context}\n\nRéponds avec le JSON single_advice uniquement.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system",  content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("LLM returned empty response");
  const parsed = JSON.parse(raw) as SingleAdvicePayload;
  if (!parsed?.single_advice) {
    throw new Error("LLM did not return valid single advice");
  }
  return parsed;
}
