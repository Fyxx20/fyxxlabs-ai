import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { fetchShopifyProducts } from "@/lib/connectors/shopify";
import { optimizeBatch } from "@/lib/image-optimizer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: scan } = await supabase
    .from("scans")
    .select("id, store_id")
    .eq("id", id)
    .single();
  if (!scan) return NextResponse.json({ error: "Scan introuvable" }, { status: 404 });

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", scan.store_id)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const products = await fetchShopifyProducts(store.id);
  const imageUrls = Array.from(
    new Set(
      products
        .flatMap((p) => p.images ?? [])
        .map((img) => img.src)
        .filter((u): u is string => typeof u === "string" && u.length > 0)
    )
  ).slice(0, 40);

  if (!imageUrls.length) {
    return NextResponse.json({
      optimized: [],
      total: 0,
      message: "Aucune image exploitable trouvée sur Shopify.",
    });
  }

  const optimized = await optimizeBatch({
    userId: user.id,
    imageUrls,
    context: "scan",
    storeId: store.id,
    scanId: scan.id,
  });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    await admin.from("scan_events").insert({
      scan_id: scan.id,
      type: "info",
      message: `Optimisation IA lancée: ${optimized.length} image(s) traitée(s).`,
      payload: {
        optimized_count: optimized.length,
      },
    });
  } catch {
    // best effort
  }

  return NextResponse.json({
    total: optimized.length,
    optimized: optimized.map((r) => ({
      source: r.sourceImageUrl,
      output: r.outputImageUrl,
      before: r.qualityScoreBefore,
      after: r.qualityScoreAfter,
      operations: r.operationsApplied,
    })),
  });
}
