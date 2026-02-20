import "server-only";

import { z } from "zod";
import { callOpenAIJsonWithSchema } from "@/lib/ai/openaiClient";
import { DOMAIN_PROMPTS } from "@/lib/ai/prompts/domain-prompts";

export const EmotionSchema = z.enum(["confidence", "urgency", "luxury", "fun"]);
export type DigitalEmotion = z.infer<typeof EmotionSchema>;

export const PersonaIdSchema = z.enum([
  "solo-creator",
  "coach",
  "agency",
  "student",
  "freelancer",
  "ecom-owner",
  "marketer",
  "developer",
]);
export type DigitalPersonaId = z.infer<typeof PersonaIdSchema>;

export const DigitalProductTypeSchema = z.enum([
  "ebook",
  "course",
  "notion-template",
  "design-pack",
  "ai-prompt-pack",
  "bundle",
  "other",
]);

export type DerivedLuxuryBrief = {
  productName: string;
  productType: z.infer<typeof DigitalProductTypeSchema>;
  audience: string;
  promise: string;
  level: "beginner" | "intermediate" | "advanced";
  tone: "premium" | "bold" | "friendly" | "minimal";
  language: string;
  country: string;
  // extra context to help downstream generation
  themeName: string;
  personaLabel: string;
  emotion: DigitalEmotion;
  oneLiner: string;
};

const DerivedLuxuryBriefSchema = z.object({
  productName: z.string().min(3),
  productType: DigitalProductTypeSchema,
  audience: z.string().min(6),
  promise: z.string().min(8),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  tone: z.enum(["premium", "bold", "friendly", "minimal"]),
  oneLiner: z.string().min(12),
});

const SuggestionSchema = z.object({
  title: z.string().min(6),
  subtitle: z.string().min(8),
});

const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionSchema).min(2).max(6),
});

export async function suggestDigitalIdeas(input: {
  themeName: string;
  personaLabel: string;
  emotion: DigitalEmotion;
  language: string;
  partial: string;
}): Promise<Array<{ title: string; subtitle: string }>> {
  const safePartial = input.partial.slice(0, 220);
  const parsed = await callOpenAIJsonWithSchema({
    schema: SuggestionsSchema,
    system: `${DOMAIN_PROMPTS.copy}\n\nTu es un assistant produit. Tu proposes des idées de produits digitaux premium. Pas de statistiques inventées. Pas de promesses illégales.`,
    user: `Propose 4 idées de formulation en ${input.language} pour améliorer un champ "C'est quoi ton idée ?".

Contexte:
- Thème visuel: ${input.themeName}
- Persona: ${input.personaLabel}
- Emotion: ${input.emotion}

Texte actuel:
${safePartial}

Contraintes:
- Réponds en JSON strict: { suggestions: [{ title, subtitle }] }
- title = 6-14 mots max
- subtitle = 10-22 mots max
- Style premium, clair, orienté résultat (sans chiffre inventé)
- Pas de markdown.`,
    temperature: 0.7,
    maxTokens: 500,
    retries: 1,
  });
  return parsed.suggestions;
}

export async function deriveLuxuryBriefFromOnboarding(input: {
  themeName: string;
  personaLabel: string;
  emotion: DigitalEmotion;
  language: string;
  country: string;
  idea: string;
}): Promise<DerivedLuxuryBrief> {
  const idea = input.idea.slice(0, 420);

  const derived = await callOpenAIJsonWithSchema({
    schema: DerivedLuxuryBriefSchema,
    system: `${DOMAIN_PROMPTS.branding}\n\n${DOMAIN_PROMPTS.pricing}\n\nTu es un chef de produit et copywriter senior. Tu dois transformer un brief minimal en brief exploitable. Interdiction de stats inventées.`,
    user: `A partir de ces infos, construis un brief "ready for generation" en ${input.language}.

Inputs:
- Thème visuel (gallery): ${input.themeName}
- Persona cible: ${input.personaLabel}
- Emotion à dégager: ${input.emotion}
- Pays: ${input.country}
- Idée utilisateur: ${idea}

Ta mission:
- Proposer un productName court et premium
- Choisir un productType (un seul) parmi: ebook, course, notion-template, design-pack, ai-prompt-pack, bundle, other
- Écrire audience (1 phrase précise)
- Écrire promise (1 phrase orientée résultat)
- Choisir level parmi: beginner, intermediate, advanced
- Choisir tone parmi: premium, bold, friendly, minimal
- Écrire oneLiner (1 phrase que l'utilisateur pourrait mettre en hero)

Contraintes:
- Si l'idée est vague, fais des hypothèses raisonnables, mais reste crédible.
- Ne cite aucune "analyse sur X concurrents" (pas de nombres inventés).
- Réponds uniquement en JSON strict, sans markdown.`,
    temperature: 0.5,
    maxTokens: 700,
    retries: 2,
  });

  return {
    ...derived,
    themeName: input.themeName,
    personaLabel: input.personaLabel,
    emotion: input.emotion,
    language: input.language,
    country: input.country,
  };
}

