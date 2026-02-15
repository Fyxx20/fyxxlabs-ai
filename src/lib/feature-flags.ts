import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface RuntimeFeatureFlags {
  enable_lighthouse_paid: boolean;
  scan_rate_limit_minutes: number;
  max_pages_per_scan: number;
  max_scans_per_day_paid: number;
  enable_ai_image_optimizer: boolean;
  enable_smart_pricing: boolean;
  enable_digital_builder: boolean;
  enable_scan_image_improve: boolean;
  enforce_generation_limits: boolean;
}

export const DEFAULT_FLAGS: RuntimeFeatureFlags = {
  enable_lighthouse_paid: false,
  scan_rate_limit_minutes: 10,
  max_pages_per_scan: 8,
  max_scans_per_day_paid: 50,
  enable_ai_image_optimizer: true,
  enable_smart_pricing: true,
  enable_digital_builder: true,
  enable_scan_image_improve: true,
  enforce_generation_limits: true,
};

export async function getRuntimeFeatureFlags(): Promise<RuntimeFeatureFlags> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("admin_settings")
      .select("value_json")
      .eq("key", "feature_flags")
      .maybeSingle();

    const flags = (data?.value_json as Record<string, unknown> | null) ?? {};
    return {
      ...DEFAULT_FLAGS,
      enable_lighthouse_paid: Boolean(flags.enable_lighthouse_paid ?? DEFAULT_FLAGS.enable_lighthouse_paid),
      scan_rate_limit_minutes: Number(flags.scan_rate_limit_minutes ?? DEFAULT_FLAGS.scan_rate_limit_minutes),
      max_pages_per_scan: Number(flags.max_pages_per_scan ?? DEFAULT_FLAGS.max_pages_per_scan),
      max_scans_per_day_paid: Number(flags.max_scans_per_day_paid ?? DEFAULT_FLAGS.max_scans_per_day_paid),
      enable_ai_image_optimizer: Boolean(flags.enable_ai_image_optimizer ?? DEFAULT_FLAGS.enable_ai_image_optimizer),
      enable_smart_pricing: Boolean(flags.enable_smart_pricing ?? DEFAULT_FLAGS.enable_smart_pricing),
      enable_digital_builder: Boolean(flags.enable_digital_builder ?? DEFAULT_FLAGS.enable_digital_builder),
      enable_scan_image_improve: Boolean(flags.enable_scan_image_improve ?? DEFAULT_FLAGS.enable_scan_image_improve),
      enforce_generation_limits: Boolean(flags.enforce_generation_limits ?? DEFAULT_FLAGS.enforce_generation_limits),
    };
  } catch {
    return DEFAULT_FLAGS;
  }
}
