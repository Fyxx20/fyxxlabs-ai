import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callOpenAIJson } from "@/lib/ai/openaiClient";
import { createShopifyProduct } from "@/lib/connectors/shopify";
import { analyzeDigitalMarket } from "@/lib/market-analysis";
import { computeDigitalPricing } from "@/lib/pricing-engine";
import { createDeliveryLink, uploadDigitalAsset } from "@/lib/delivery-system";
import { generateDigitalVisualPack } from "@/lib/image-optimizer";

export const maxDuration = 60;

interface DigitalBrief {
  productType: string;
  audience: string;
  promise: string;
  level: string;
  tone: string;
  language: string;
  country: string;
}

interface DigitalPagePayload {
  brandName: string;
  title: string;
  subtitle: string;
  hero: string;
  offer: string[];
  objections: string[];
  faq: Array<{ question: string; answer: string }>;
  guarantee: string;
  legal: string[];
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
}

function buildDigitalProductHtml(page: DigitalPagePayload): string {
  const faqHtml = page.faq
    .map(
      (f) =>
        `<details style="border-bottom:1px solid #e5e7eb;padding:10px 0"><summary style="font-weight:700;cursor:pointer">${f.question}</summary><p style="margin-top:6px;color:#6b7280">${f.answer}</p></details>`
    )
    .join("");
  const offerHtml = page.offer.map((o) => `<li style="margin:6px 0">✅ ${o}</li>`).join("");
  const objectionsHtml = page.objections.map((o) => `<li style="margin:6px 0">• ${o}</li>`).join("");
  const legalHtml = page.legal.map((l) => `<li style="margin:6px 0">${l}</li>`).join("");

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
  <h2 style="font-size:22px;margin-top:16px">Garantie</h2>
  <p>${page.guarantee}</p>
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

    if (action === "generate-page") {
      const { brief } = body as { brief: DigitalBrief };
      if (!brief?.productType || !brief?.promise) {
        return NextResponse.json({ error: "Brief incomplet" }, { status: 400 });
      }

      const market = await analyzeDigitalMarket({
        productType: brief.productType,
        complexity: brief.level === "advanced" ? "high" : brief.level === "intermediate" ? "mid" : "low",
        audienceMaturity: brief.audience.toLowerCase().includes("expert") ? "expert" : brief.audience.toLowerCase().includes("warm") ? "warm" : "cold",
        promiseStrength: brief.promise.length > 80 ? "high" : brief.promise.length > 35 ? "mid" : "low",
        country: brief.country,
      });
      const pricing = computeDigitalPricing({ market });
      const visuals = await generateDigitalVisualPack({
        userId: user.id,
        title: `${brief.productType} ${brief.promise}`,
        tone: brief.tone,
      });

      const generated = await callOpenAIJson<DigitalPagePayload>({
        system:
          "Tu es un copywriter e-commerce senior pour produits digitaux. Réponds en JSON strict uniquement. Interdiction absolue d'inventer des statistiques.",
        user: `Genere une landing digitale persuasive en ${brief.language} pour:
- Type: ${brief.productType}
- Audience: ${brief.audience}
- Promesse: ${brief.promise}
- Niveau: ${brief.level}
- Ton: ${brief.tone}
- Pays cible: ${brief.country}

Pricing recommande (obligatoire):
- Safe: ${pricing.safe}
- Optimal: ${pricing.optimal}
- Aggressive: ${pricing.aggressive}
- Positioning: ${pricing.positioning}

Retourne du JSON avec:
brandName, title, subtitle, hero, offer[], objections[], faq[{question,answer}], guarantee, legal[].
N'inclus aucune statistique inventee.`,
        schemaHint:
          "{brandName:string,title:string,subtitle:string,hero:string,offer:string[],objections:string[],faq:[{question:string,answer:string}],guarantee:string,legal:string[]}",
        temperature: 0.6,
        maxTokens: 2600,
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

      return NextResponse.json({ page, pricing, visuals });
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
