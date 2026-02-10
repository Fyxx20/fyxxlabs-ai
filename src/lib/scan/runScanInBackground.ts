import { createClient } from "@supabase/supabase-js";
import { runScan, buildScanPreview } from "./scanRunner";

const STEP_LABELS: Record<string, string> = {
  QUEUED: "En file",
  FETCH_HOME: "Récupération page d'accueil",
  DISCOVER_PAGES: "Détection des pages clés",
  EXTRACT: "Extraction des signaux",
  SCORE: "Calcul du score",
  AI_SUMMARY: "Synthèse IA",
  DONE: "Terminé",
};

export interface RunScanInBackgroundOptions {
  userId: string;
  isPro: boolean;
}

export async function runScanInBackground(
  scanId: string,
  options: RunScanInBackgroundOptions
): Promise<void> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updateScan = async (updates: Record<string, unknown>) => {
    try {
      await admin.from("scans").update(updates).eq("id", scanId);
    } catch {
      // Colonnes progress/step absentes si migration 012 non appliquée
    }
  };

  const updateScanSafe = async (updates: Record<string, unknown>) => {
    const { progress, step, ...rest } = updates;
    await admin.from("scans").update(rest).eq("id", scanId);
    if (progress !== undefined || step !== undefined) {
      try {
        await admin.from("scans").update({ progress, step }).eq("id", scanId);
      } catch {
        // Colonnes optionnelles
      }
    }
  };

  const addEvent = async (type: "info" | "warn" | "error" | "metric", message: string, payload?: Record<string, unknown>) => {
    try {
      await admin.from("scan_events").insert({
        scan_id: scanId,
        type,
        message,
        payload: payload ?? null,
      });
    } catch {
      // Table scan_events absente si migration 012 non appliquée
    }
  };

  try {
    const { data: scan, error: scanErr } = await admin
      .from("scans")
      .select("id, store_id")
      .eq("id", scanId)
      .single();

    if (scanErr || !scan) {
      console.error("[runScanInBackground] Scan not found:", scanId, scanErr);
      return;
    }

    const { data: store, error: storeErr } = await admin
      .from("stores")
      .select("id, user_id, website_url, goal, platform, country, stage, traffic_source, aov_bucket")
      .eq("id", scan.store_id)
      .single();

    if (storeErr || !store || store.user_id !== options.userId) {
      await updateScan({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_code: "STORE_NOT_FOUND",
        error_message: "Boutique introuvable ou accès refusé.",
      });
      await addEvent("error", "Boutique introuvable.");
      return;
    }

    await updateScanSafe({
      status: "running",
      started_at: new Date().toISOString(),
      progress: 0,
      step: "RUNNING",
    });
    await addEvent("info", "Analyse démarrée.");

    let metrics: { orders?: number; revenue?: number; customers?: number; aov?: number } | null = null;
    const { data: metricsRow } = await admin
      .from("store_metrics_daily")
      .select("orders_count, revenue, total_customers, aov")
      .eq("store_id", scan.store_id)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (metricsRow) {
      metrics = {
        orders: metricsRow.orders_count ?? undefined,
        revenue: metricsRow.revenue != null ? Number(metricsRow.revenue) : undefined,
        customers: metricsRow.total_customers ?? undefined,
        aov: metricsRow.aov != null ? Number(metricsRow.aov) : undefined,
      };
    }

    const result = await runScan({
      storeId: store.id,
      url: store.website_url,
      platform: store.platform ?? null,
      country: store.country ?? null,
      stage: store.stage ?? null,
      traffic_source: store.traffic_source ?? null,
      aov: store.aov_bucket ?? null,
      goal: store.goal ?? undefined,
      metrics,
      onProgress: async (progress, step, message) => {
        await updateScan({ progress: Math.min(100, Math.max(0, progress)), step });
        await addEvent("info", message, { progress, step });
      },
    });

    const preview = buildScanPreview(result);
    const b = result.breakdown;
    const scoresJson = {
      conversion: b.funnel,
      trust: b.trust,
      offer: b.offer,
      performance: b.speed,
      traffic: b.ux,
    };
    const computedGlobalScore = Math.round(
      (scoresJson.conversion + scoresJson.trust + scoresJson.offer + scoresJson.performance + scoresJson.traffic) / 5
    );

    const succeededPayload = (extra: Record<string, unknown>) => ({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      progress: 100,
      step: "DONE",
      ...extra,
    });

    const tryUpdate = async (payload: Record<string, unknown>) => {
      const { progress, step, ...rest } = payload;
      const withProgress = { ...payload };
      try {
        await admin.from("scans").update(withProgress).eq("id", scanId);
      } catch {
        await admin.from("scans").update(rest).eq("id", scanId);
      }
    };

    if (options.isPro) {
      await tryUpdate({
        ...succeededPayload({
          free_preview: false,
          result_preview: null,
          score_global: computedGlobalScore,
          scores_json: scoresJson,
          issues_json: {
            issues: result.issues,
            next_best_action: result.priority_action,
            scores: { confidence: result.confidence },
          },
          trial_single_advice: null,
          scan_data_json: {
            pages_scanned: result.pages_scanned,
            price_insights: result.raw.price_insights ?? null,
            product_analysis: result.raw.product_analysis ?? [],
            business_metrics: result.raw.business_metrics ?? null,
          },
          summary: `Score ${computedGlobalScore}/100. Confiance: ${result.confidence}.`,
          mode: result.raw.mode,
          confidence: result.confidence,
          breakdown: result.breakdown,
          priority_action: result.priority_action,
          checklist: result.checklist,
          pages: result.pages_scanned.length > 0 ? result.pages_scanned : null,
          raw: result.raw,
        }),
      });
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("scans_used")
        .eq("user_id", options.userId)
        .single();

      await tryUpdate({
        ...succeededPayload({
          free_preview: true,
          result_preview: preview,
          score_global: preview.score,
          scan_data_json: {
            pages_scanned: result.pages_scanned,
            price_insights: result.raw.price_insights ?? null,
            product_analysis: result.raw.product_analysis ?? [],
            business_metrics: result.raw.business_metrics ?? null,
          },
          summary: `Diagnostic express : score ${preview.score}/100. Confiance : ${preview.confidence}.`,
          mode: result.raw.mode,
          confidence: preview.confidence,
          raw: result.raw,
        }),
      });

      await admin
        .from("profiles")
        .update({ scans_used: (profile?.scans_used ?? 0) + 1 })
        .eq("user_id", options.userId);
    }

    await addEvent("info", `Analyse terminée. Score : ${computedGlobalScore}/100.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const e = err as Error & { code?: string };
    const errorCode = (err instanceof Error && e.code) ? e.code : (err instanceof Error ? err.name : null) ?? "SCAN_FAILED";
    const debug = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack?.slice(0, 500) } : { err: String(err) };

    try {
      await admin.from("scans").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        progress: 0,
        step: "FAILED",
        error_message: message,
        error_code: typeof errorCode === "string" ? errorCode : "SCAN_FAILED",
        debug,
      }).eq("id", scanId);
    } catch {
      await admin.from("scans").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: message,
        error_code: typeof errorCode === "string" ? errorCode : "SCAN_FAILED",
      }).eq("id", scanId);
    }
    await addEvent("error", message, { error_code: errorCode });
    console.error("[runScanInBackground] Failed:", scanId, err);
  }
}

export { STEP_LABELS };
