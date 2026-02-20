import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callOpenAIJsonWithSchema } from "@/lib/ai/openaiClient";
import { createShopifyProduct } from "@/lib/connectors/shopify";
import { analyzeDigitalMarket } from "@/lib/market-analysis";
import { computeDigitalPricing } from "@/lib/pricing-engine";
import { createDeliveryLink, uploadDigitalAsset } from "@/lib/delivery-system";
import { generateDigitalVisualPack } from "@/lib/image-optimizer";
import { DOMAIN_PROMPTS } from "@/lib/ai/prompts/domain-prompts";
import { getEntitlements } from "@/lib/auth/entitlements";
import { createGenerationJobLog, enforceGenerationQuota, finishGenerationJobLog } from "@/lib/generation-guards";
import { getRuntimeFeatureFlags } from "@/lib/feature-flags";
import {
  EmotionSchema,
  deriveLuxuryBriefFromOnboarding,
  suggestDigitalIdeas,
} from "@/lib/ai/digital-luxury";
import { z } from "zod";

export const maxDuration = 60;

interface DigitalBrief {
  productName: string;
  productType: string;
  audience: string;
  audiencePain?: string;
  promise: string;
  transformation?: string;
  level: string;
  tone: string;
  language: string;
  country: string;
  offerIncludes?: string;
  bonus?: string;
  guaranteeType?: string;
  supportEmail?: string;
  ctaStyle?: string;
}

interface DigitalPagePayload {
  brandName: string;
  title: string;
  subtitle: string;
  hero: string;
  offer: string[];
  objections: string[];
  upsell: string[];
  crossSell: string[];
  launchChecklist: string[];
  faq: Array<{ question: string; answer: string }>;
  guarantee: string;
  legal: string[];
  legalPages?: {
    cgu: string;
    privacy: string;
    refund: string;
  };
  transactionalEmails?: {
    delivery_subject: string;
    delivery_body: string;
    support_subject: string;
    support_body: string;
  };
  pricing: {
    currency: string;
    safe: number;
    optimal: number;
    aggressive: number;
    positioning: "low" | "mid" | "premium";
    why: string[];
  };
  visuals: {
    coverUrl: string;
    heroUrl: string;
    mockupUrls: string[];
  };
  testimonials?: Array<{ name: string; role?: string; quote: string }>;
}

const DigitalPageSchema = z.object({
  brandName: z.string().min(2),
  title: z.string().min(4),
  subtitle: z.string().min(6),
  hero: z.string().min(6),
  offer: z.array(z.string().min(2)).min(2),
  objections: z.array(z.string().min(2)).min(2),
  upsell: z.array(z.string().min(2)).min(1),
  crossSell: z.array(z.string().min(2)).min(1),
  launchChecklist: z.array(z.string().min(2)).min(2),
  faq: z.array(z.object({ question: z.string().min(3), answer: z.string().min(3) })).min(2),
  guarantee: z.string().min(8),
  legal: z.array(z.string().min(2)).min(2),
  testimonials: z
    .array(
      z.object({
        name: z.string().min(2),
        role: z.string().min(2).optional(),
        quote: z.string().min(10),
      })
    )
    .min(2)
    .max(6)
    .optional(),
  legalPages: z
    .object({
      cgu: z.string().min(30),
      privacy: z.string().min(30),
      refund: z.string().min(30),
    })
    .optional(),
  transactionalEmails: z
    .object({
      delivery_subject: z.string().min(5),
      delivery_body: z.string().min(20),
      support_subject: z.string().min(5),
      support_body: z.string().min(20),
    })
    .optional(),
});

function buildDigitalProductHtml(page: DigitalPagePayload): string {
  const faqHtml = page.faq
    .map(
      (f) =>
        `<details style="border-bottom:1px solid #e5e7eb;padding:10px 0"><summary style="font-weight:700;cursor:pointer">${f.question}</summary><p style="margin-top:6px;color:#6b7280">${f.answer}</p></details>`
    )
    .join("");
  const offerHtml = page.offer.map((o) => `<li style="margin:6px 0">✅ ${o}</li>`).join("");
  const objectionsHtml = page.objections.map((o) => `<li style="margin:6px 0">• ${o}</li>`).join("");
  const upsellHtml = page.upsell.map((o) => `<li style="margin:6px 0">⬆️ ${o}</li>`).join("");
  const crossSellHtml = page.crossSell.map((o) => `<li style="margin:6px 0">🔁 ${o}</li>`).join("");
  const checklistHtml = page.launchChecklist.map((o) => `<li style="margin:6px 0">✅ ${o}</li>`).join("");
  const legalHtml = page.legal.map((l) => `<li style="margin:6px 0">${l}</li>`).join("");
  const testimonialsHtml = (page.testimonials ?? [])
    .map(
      (t) =>
        `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0">
          <p style="font-weight:700;margin:0">${t.name}${t.role ? ` <span style="font-weight:400;color:#6b7280">— ${t.role}</span>` : ""}</p>
          <p style="margin:6px 0 0;color:#374151">“${t.quote}”</p>
        </div>`
    )
    .join("");

  return `
<section style="font-family:Inter,Arial,sans-serif;max-width:900px;margin:0 auto;line-height:1.6;color:#111827">
  <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${page.brandName}</p>
  <h1 style="font-size:34px;line-height:1.2;margin:8px 0 4px">${page.title}</h1>
  <p style="font-size:18px;color:#374151">${page.subtitle}</p>
  <img src="${page.visuals.heroUrl}" alt="${page.title}" style="width:100%;border-radius:14px;margin:18px 0" />
  <h2 style="font-size:22px;margin-top:10px">Ce que vous recevez</h2>
  <ul>${offerHtml}</ul>
  <h2 style="font-size:22px;margin-top:16px">Objections traitées</h2>
  <ul>${objectionsHtml}</ul>
  <h2 style="font-size:22px;margin-top:16px">Upsell & Cross-sell</h2>
  <p style="font-weight:700;margin-bottom:4px">Upsell</p>
  <ul>${upsellHtml}</ul>
  <p style="font-weight:700;margin-bottom:4px;margin-top:8px">Cross-sell</p>
  <ul>${crossSellHtml}</ul>
  <h2 style="font-size:22px;margin-top:16px">Checklist lancement</h2>
  <ul>${checklistHtml}</ul>
  <h2 style="font-size:22px;margin-top:16px">Garantie</h2>
  <p>${page.guarantee}</p>
  ${testimonialsHtml ? `<h2 style="font-size:22px;margin-top:16px">Témoignages (exemples)</h2>${testimonialsHtml}` : ""}
  <h2 style="font-size:22px;margin-top:16px">FAQ</h2>
  ${faqHtml}
  <h2 style="font-size:22px;margin-top:16px">Mentions digitales</h2>
  <ul>${legalHtml}</ul>
</section>`;
}

async function handleUpload(req: NextRequest, userId: string) {
  const formData = await req.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "Digital asset");
  const kind = String(formData.get("kind") ?? "other") as "ebook" | "template" | "course" | "bundle" | "other";
  const storeId = String(formData.get("storeId") ?? "") || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadDigitalAsset({
    userId,
    storeId,
    title,
    kind,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileBuffer: buffer,
  });

  return NextResponse.json({
    assetId: uploaded.assetId,
    bytes: uploaded.bytes,
    checksum: uploaded.checksumSha256,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return await handleUpload(req, user.id);
    }

    const body = await req.json();
    const { action } = body as { action: string };
    const flags = await getRuntimeFeatureFlags();

    if (action === "usage-stats") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_started_at, trial_ends_at, scans_used")
        .eq("user_id", user.id)
        .single();
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();
      const entitlements = getEntitlements(profile ?? null, subscription ?? null);
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
      const { count } = await supabase
        .from("generation_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("job_kind", ["physical_create", "digital_create"])
        .gte("created_at", monthStart);
      const limit = entitlements.plan === "elite" || entitlements.plan === "lifetime" ? 60 : entitlements.plan === "pro" ? 20 : 3;
      return NextResponse.json({ used: count ?? 0, limit });
    }

    if (action === "suggest-idea") {
      const themeName = String((body as any).theme ?? "").trim();
      const personaLabel = String((body as any).persona ?? "").trim();
      const emotionRaw = String((body as any).emotion ?? "luxury");
      const emotion = EmotionSchema.safeParse(emotionRaw).success ? (emotionRaw as any) : "luxury";
      const language = String((body as any).language ?? "fr").slice(0, 5) || "fr";
      const input = String((body as any).input ?? "").trim();

      if (!input || input.length < 6) {
        return NextResponse.json({ suggestions: [] });
      }

      const suggestions = await suggestDigitalIdeas({
        themeName: themeName || "Premium",
        personaLabel: personaLabel || "Créateur",
        emotion,
        language,
        partial: input,
      });

      return NextResponse.json({ suggestions });
    }

    if (action === "generate-luxury") {
      if (!flags.enable_digital_builder) {
        return NextResponse.json({ error: "Digital builder temporairement désactivé." }, { status: 503 });
      }

      // Guard quota (same model as generate-page)
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_started_at, trial_ends_at, scans_used")
        .eq("user_id", user.id)
        .single();
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();
      const entitlements = getEntitlements(profile ?? null, subscription ?? null);
      await enforceGenerationQuota({ userId: user.id, plan: entitlements.plan });

      const themeName = String((body as any).themeName ?? "").trim() || "Premium";
      const personaLabel = String((body as any).personaLabel ?? "").trim() || "Créateur";
      const emotionRaw = String((body as any).emotion ?? "luxury");
      const emotion = EmotionSchema.safeParse(emotionRaw).success ? (emotionRaw as any) : "luxury";
      const language = String((body as any).language ?? "fr").slice(0, 5) || "fr";
      const country = String((body as any).country ?? "FR").slice(0, 3) || "FR";
      const idea = String((body as any).idea ?? "").trim();

      if (!idea || idea.length < 12) {
        return NextResponse.json({ error: "Brief incomplet (idée trop courte)." }, { status: 400 });
      }

      const derived = await deriveLuxuryBriefFromOnboarding({
        themeName,
        personaLabel,
        emotion,
        language,
        country,
        idea,
      });

      const jobId = await createGenerationJobLog({
        userId: user.id,
        jobKind: "digital_create",
        source: "builder",
        step: "generate-luxury",
        inputPayload: {
          theme_name: themeName,
          persona: personaLabel,
          emotion,
          product_name: derived.productName,
          product_type: derived.productType,
          language: derived.language,
          country: derived.country,
        },
      });

      try {
        const pricing = flags.enable_smart_pricing
          ? computeDigitalPricing({
              market: await analyzeDigitalMarket({
                productType: derived.productType,
                complexity: derived.level === "advanced" ? "high" : derived.level === "intermediate" ? "mid" : "low",
                audienceMaturity: derived.audience.toLowerCase().includes("expert")
                  ? "expert"
                  : derived.audience.toLowerCase().includes("warm")
                    ? "warm"
                    : "cold",
                promiseStrength: derived.promise.length > 80 ? "high" : derived.promise.length > 35 ? "mid" : "low",
                country: derived.country,
              }),
            })
          : {
              currency: "EUR",
              safe: 19.99,
              optimal: 39.99,
              aggressive: 59.99,
              estimatedMinMarginPct: 40,
              estimatedOptimalMarginPct: 65,
              positioning: "mid" as const,
              explanation: {
                why: ["Mode fallback: smart pricing désactivé par feature flag."],
                competitorLow: null,
                competitorAvg: null,
                competitorHigh: null,
                baselineCost: 0,
              },
            };

        const visuals = flags.enable_ai_image_optimizer
          ? await generateDigitalVisualPack({
              userId: user.id,
              title: `${derived.productName} — ${derived.promise}`,
              tone: derived.tone,
            })
          : {
              coverUrl: "/placeholder.svg",
              heroUrl: "/placeholder.svg",
              mockupUrls: ["/placeholder.svg"],
              provider: "flag-disabled",
            };

        const generated = await callOpenAIJsonWithSchema({
          schema: DigitalPageSchema,
          system: `${DOMAIN_PROMPTS.copy}\n\n${DOMAIN_PROMPTS.pricing}\n\n${DOMAIN_PROMPTS.branding}\n\n${DOMAIN_PROMPTS.legal}`,
          user: `Génère une landing digitale ultra persuasive en ${derived.language}.

Contexte:
- Thème visuel: ${derived.themeName}
- Persona: ${derived.personaLabel}
- Emotion principale: ${derived.emotion}

Brief produit:
- Nom produit: ${derived.productName}
- Type: ${derived.productType}
- Audience: ${derived.audience}
- Promesse: ${derived.promise}
- Niveau: ${derived.level}
- Ton: ${derived.tone}
- Pays cible: ${derived.country}
- One-liner hero: ${derived.oneLiner}

Pricing recommandé (obligatoire):
- Safe: ${pricing.safe}
- Optimal: ${pricing.optimal}
- Aggressive: ${pricing.aggressive}
- Positioning: ${pricing.positioning}

Exigences copy:
- Structure claire: Hero → Douleur → Solution → Offre → Objections → FAQ → Garantie → CTA.
- Utilise AIDA (sans le mentionner explicitement).
- Témoignages: tu peux en produire 2 à 4 comme "exemples" (pas de stats).
- Interdiction de chiffres inventés (ex: \"15 concurrents\"). Si tu estimes, précise que c'est une estimation heuristique.

Retourne du JSON avec:
brandName, title, subtitle, hero, offer[], objections[], upsell[], crossSell[], launchChecklist[], faq[{question,answer}], guarantee, legal[], testimonials?[{name,role?,quote}], legalPages{cgu,privacy,refund}, transactionalEmails{delivery_subject,delivery_body,support_subject,support_body}.
Réponds uniquement en JSON strict, sans markdown.`,
          schemaHint:
            "{brandName,title,subtitle,hero,offer[],objections[],upsell[],crossSell[],launchChecklist[],faq[{question,answer}],guarantee,legal[],testimonials?[{name,role?,quote}],legalPages{cgu,privacy,refund},transactionalEmails{delivery_subject,delivery_body,support_subject,support_body}}",
          temperature: 0.65,
          maxTokens: 2700,
          retries: 2,
        });

        const page: DigitalPagePayload = {
          ...generated,
          pricing: {
            currency: pricing.currency,
            safe: pricing.safe,
            optimal: pricing.optimal,
            aggressive: pricing.aggressive,
            positioning: pricing.positioning,
            why: pricing.explanation.why,
          },
          visuals: {
            coverUrl: visuals.coverUrl,
            heroUrl: visuals.heroUrl,
            mockupUrls: visuals.mockupUrls,
          },
        };

        await finishGenerationJobLog({
          jobId,
          success: true,
          outputPayload: {
            pricing_optimal: pricing.optimal,
            visuals_count: visuals.mockupUrls.length + 2,
          },
        });

        return NextResponse.json({ page, pricing, visuals, derived });
      } catch (err) {
        await finishGenerationJobLog({
          jobId,
          success: false,
          errorMessage: err instanceof Error ? err.message : "DIGITAL_LUXURY_GENERATION_FAILED",
        });
        throw err;
      }
    }

    if (action === "generate-page") {
      if (!flags.enable_digital_builder) {
        return NextResponse.json({ error: "Digital builder temporairement désactivé." }, { status: 503 });
      }
      const { brief } = body as { brief: DigitalBrief };
      if (
        !brief?.productName ||
        !brief?.productType ||
        !brief?.audience ||
        !brief?.promise ||
        !brief?.level ||
        !brief?.tone ||
        !brief?.language ||
        !brief?.country
      ) {
        return NextResponse.json({ error: "Brief incomplet" }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_started_at, trial_ends_at, scans_used")
        .eq("user_id", user.id)
        .single();
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();
      const entitlements = getEntitlements(profile ?? null, subscription ?? null);
      if (flags.enforce_generation_limits) {
        try {
          await enforceGenerationQuota({ userId: user.id, plan: entitlements.plan });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.startsWith("PLAN_DAILY_LIMIT:")) {
            const limit = msg.split(":")[1];
            return NextResponse.json({ error: `Limite atteinte: ${limit} créations max par jour pour ton plan.` }, { status: 429 });
          }
          if (msg.startsWith("PLAN_MONTHLY_LIMIT:")) {
            const limit = msg.split(":")[1];
            return NextResponse.json({ error: `Limite atteinte: ${limit} créations max par mois pour ton plan.` }, { status: 429 });
          }
          return NextResponse.json({ error: "Ton plan actuel ne permet pas de lancer une génération." }, { status: 403 });
        }
      }

      const jobId = await createGenerationJobLog({
        userId: user.id,
        jobKind: "digital_create",
        source: "builder",
        step: "generate-page",
        inputPayload: {
          product_name: brief.productName,
          product_type: brief.productType,
          language: brief.language,
          country: brief.country,
        },
      });

      try {
        const pricing = flags.enable_smart_pricing
          ? computeDigitalPricing({
              market: await analyzeDigitalMarket({
                productType: brief.productType,
                complexity: brief.level === "advanced" ? "high" : brief.level === "intermediate" ? "mid" : "low",
                audienceMaturity: brief.audience.toLowerCase().includes("expert") ? "expert" : brief.audience.toLowerCase().includes("warm") ? "warm" : "cold",
                promiseStrength: brief.promise.length > 80 ? "high" : brief.promise.length > 35 ? "mid" : "low",
                country: brief.country,
              }),
            })
          : {
              currency: "EUR",
              safe: 19.99,
              optimal: 39.99,
              aggressive: 59.99,
              estimatedMinMarginPct: 40,
              estimatedOptimalMarginPct: 65,
              positioning: "mid" as const,
              explanation: {
                why: ["Mode fallback: smart pricing désactivé par feature flag."],
                competitorLow: null,
                competitorAvg: null,
                competitorHigh: null,
                baselineCost: 0,
              },
            };
        const visuals = flags.enable_ai_image_optimizer
          ? await generateDigitalVisualPack({
              userId: user.id,
              title: `${brief.productType} ${brief.promise}`,
              tone: brief.tone,
            })
          : {
              coverUrl: "/placeholder.svg",
              heroUrl: "/placeholder.svg",
              mockupUrls: ["/placeholder.svg"],
              provider: "flag-disabled",
            };

        const generated = await callOpenAIJsonWithSchema({
          schema: DigitalPageSchema,
          system: `${DOMAIN_PROMPTS.copy}\n\n${DOMAIN_PROMPTS.pricing}\n\n${DOMAIN_PROMPTS.branding}\n\n${DOMAIN_PROMPTS.legal}`,
          user: `Genere une landing digitale persuasive en ${brief.language} pour:
- Nom produit: ${brief.productName}
- Type: ${brief.productType}
- Audience: ${brief.audience}
- Douleur audience: ${brief.audiencePain ?? "A inférer intelligemment"}
- Promesse: ${brief.promise}
- Transformation attendue: ${brief.transformation ?? "A inférer intelligemment"}
- Niveau: ${brief.level}
- Ton: ${brief.tone}
- Pays cible: ${brief.country}
- Contenu inclus: ${brief.offerIncludes ?? "A inférer"}
- Bonus/upsell souhaités: ${brief.bonus ?? "A inférer"}
- Garantie: ${brief.guaranteeType ?? "7 jours satisfait ou rembourse (digital)"}
- Email support: ${brief.supportEmail ?? "support@fyxxlabs.com"}
- Style CTA: ${brief.ctaStyle ?? "premium"}

Pricing recommande (obligatoire):
- Safe: ${pricing.safe}
- Optimal: ${pricing.optimal}
- Aggressive: ${pricing.aggressive}
- Positioning: ${pricing.positioning}

Retourne du JSON avec:
brandName, title, subtitle, hero, offer[], objections[], upsell[], crossSell[], launchChecklist[], faq[{question,answer}], guarantee, legal[], legalPages{cgu,privacy,refund}, transactionalEmails{delivery_subject,delivery_body,support_subject,support_body}.
Tu dois inférer automatiquement pain points, objections, FAQ et structure de vente à partir du peu d'inputs utilisateur.
N'inclus aucune statistique inventee.`,
          schemaHint: "{brandName,title,subtitle,hero,offer[],objections[],upsell[],crossSell[],launchChecklist[],faq[{question,answer}],guarantee,legal[],legalPages{cgu,privacy,refund},transactionalEmails{delivery_subject,delivery_body,support_subject,support_body}}",
          temperature: 0.6,
          maxTokens: 2600,
          retries: 2,
        });

        const page: DigitalPagePayload = {
          ...generated,
          pricing: {
            currency: pricing.currency,
            safe: pricing.safe,
            optimal: pricing.optimal,
            aggressive: pricing.aggressive,
            positioning: pricing.positioning,
            why: pricing.explanation.why,
          },
          visuals: {
            coverUrl: visuals.coverUrl,
            heroUrl: visuals.heroUrl,
            mockupUrls: visuals.mockupUrls,
          },
        };

        await finishGenerationJobLog({
          jobId,
          success: true,
          outputPayload: {
            pricing_optimal: pricing.optimal,
            visuals_count: visuals.mockupUrls.length + 2,
          },
        });
        return NextResponse.json({ page, pricing, visuals });
      } catch (err) {
        await finishGenerationJobLog({
          jobId,
          success: false,
          errorMessage: err instanceof Error ? err.message : "DIGITAL_GENERATION_FAILED",
        });
        throw err;
      }
    }

    if (action === "publish-shopify") {
      const { storeId, page, coverImageUrl } = body as {
        storeId: string;
        page: DigitalPagePayload;
        coverImageUrl?: string;
      };
      if (!storeId || !page?.title) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
      }

      const { data: store } = await supabase
        .from("stores")
        .select("id, user_id")
        .eq("id", storeId)
        .single();
      if (!store || store.user_id !== user.id) {
        return NextResponse.json({ error: "Boutique non trouvée" }, { status: 403 });
      }

      const { data: integration } = await supabase
        .from("store_integrations")
        .select("status")
        .eq("store_id", storeId)
        .eq("provider", "shopify")
        .eq("status", "connected")
        .maybeSingle();
      if (!integration) {
        return NextResponse.json({ error: "Shopify non connecté" }, { status: 400 });
      }

      const res = await createShopifyProduct(storeId, {
        title: page.title,
        body_html: buildDigitalProductHtml(page),
        product_type: "digital",
        tags: "digital,fyxxlabs,ai-generated",
        images: [{ src: coverImageUrl || page.visuals.coverUrl }],
        variants: [
          {
            title: "Acces digital",
            price: String(page.pricing.optimal),
            compare_at_price: String(page.pricing.aggressive),
          },
        ],
      });

      return NextResponse.json({
        success: res.success,
        productId: res.productId ?? null,
        error: res.error ?? null,
      });
    }

    if (action === "create-delivery-link") {
      const { assetId, customerEmail, orderRef } = body as {
        assetId: string;
        customerEmail: string;
        orderRef?: string;
      };
      if (!assetId || !customerEmail) {
        return NextResponse.json({ error: "assetId et customerEmail requis" }, { status: 400 });
      }
      const delivery = await createDeliveryLink({
        userId: user.id,
        assetId,
        customerEmail,
        orderRef,
      });
      return NextResponse.json(delivery);
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
