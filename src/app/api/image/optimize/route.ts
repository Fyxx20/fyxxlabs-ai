import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { optimizeBatch, type PhysicalImageStyle } from "@/lib/image-optimizer";

const StyleSchema = new Set<PhysicalImageStyle>(["style_a", "style_b", "style_c"]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const sourceUrls = Array.isArray(body.sourceUrls) ? body.sourceUrls.filter(Boolean) : [];
    const styleRaw = String(body.style ?? "style_a").toLowerCase() as PhysicalImageStyle;
    const style: PhysicalImageStyle = StyleSchema.has(styleRaw) ? styleRaw : "style_a";
    const force = Boolean(body.force);
    const variantKey = body.variantKey ? String(body.variantKey) : undefined;
    const storeId = body.storeId ? String(body.storeId) : null;
    const kind = body.kind === "hero" || body.kind === "thumb" ? body.kind : "gallery";

    if (sourceUrls.length === 0) {
      return NextResponse.json({ error: "Aucune image source fournie" }, { status: 400 });
    }
    if (sourceUrls.length > 12) {
      return NextResponse.json({ error: "Maximum 12 images par requête" }, { status: 400 });
    }

    const optimized = await optimizeBatch({
      userId: user.id,
      imageUrls: sourceUrls,
      context: "manual",
      style,
      variantKey,
      storeId,
      kind,
      force,
    });

    return NextResponse.json({
      success: true,
      style,
      optimizedImages: optimized.map((r) => r.outputImageUrl),
      jobs: optimized.map((r) => ({
        id: r.jobId ?? null,
        sourceUrl: r.sourceImageUrl,
        outputUrl: r.outputImageUrl,
        outputUrls: r.outputUrls ?? null,
        provider: r.provider,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
