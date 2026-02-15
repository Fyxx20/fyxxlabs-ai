import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

type FeatureFlagsPayload = {
  enable_lighthouse_paid?: boolean;
  scan_rate_limit_minutes?: number;
  max_pages_per_scan?: number;
  max_scans_per_day_paid?: number;
  enable_ai_image_optimizer?: boolean;
  enable_smart_pricing?: boolean;
  enable_digital_builder?: boolean;
  enable_scan_image_improve?: boolean;
  enforce_generation_limits?: boolean;
};

function toSafeInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const intVal = Math.floor(n);
  return Math.max(min, Math.min(max, intVal));
}

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: FeatureFlagsPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: existingRow } = await admin
    .from("admin_settings")
    .select("value_json")
    .eq("key", "feature_flags")
    .single();

  const previous = (existingRow?.value_json as Record<string, unknown> | null) ?? {};

  const nextFlags = {
    enable_lighthouse_paid: Boolean(body.enable_lighthouse_paid ?? previous.enable_lighthouse_paid ?? false),
    scan_rate_limit_minutes: toSafeInt(body.scan_rate_limit_minutes, Number(previous.scan_rate_limit_minutes ?? 10), 1, 120),
    max_pages_per_scan: toSafeInt(body.max_pages_per_scan, Number(previous.max_pages_per_scan ?? 8), 1, 100),
    max_scans_per_day_paid: toSafeInt(body.max_scans_per_day_paid, Number(previous.max_scans_per_day_paid ?? 50), 1, 1000),
    enable_ai_image_optimizer: Boolean(body.enable_ai_image_optimizer ?? previous.enable_ai_image_optimizer ?? true),
    enable_smart_pricing: Boolean(body.enable_smart_pricing ?? previous.enable_smart_pricing ?? true),
    enable_digital_builder: Boolean(body.enable_digital_builder ?? previous.enable_digital_builder ?? true),
    enable_scan_image_improve: Boolean(body.enable_scan_image_improve ?? previous.enable_scan_image_improve ?? true),
    enforce_generation_limits: Boolean(body.enforce_generation_limits ?? previous.enforce_generation_limits ?? true),
  };

  const { error } = await admin.from("admin_settings").upsert(
    {
      key: "feature_flags",
      value_json: nextFlags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "admin_settings.feature_flags.update",
    target_type: "profile",
    target_id: auth.user.id,
    before_state: previous,
    after_state: nextFlags,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, flags: nextFlags });
}
