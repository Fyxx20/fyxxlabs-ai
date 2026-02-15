import "server-only";
import type { Plan } from "@/lib/auth/entitlements";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type GenerationJobKind = "physical_create" | "digital_create";

interface CreationLimits {
  daily: number;
  monthly: number;
}

const PLAN_LIMITS: Record<Plan, CreationLimits> = {
  trial: { daily: 0, monthly: 0 },
  free: { daily: 0, monthly: 0 },
  create: { daily: 1, monthly: 3 },
  starter: { daily: 2, monthly: 8 },
  pro: { daily: 5, monthly: 20 },
  elite: { daily: 10, monthly: 60 },
  lifetime: { daily: 10, monthly: 60 },
};

function getUtcDayStartIso(): string {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return dayStart.toISOString();
}

function getUtcMonthStartIso(): string {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return monthStart.toISOString();
}

export async function enforceGenerationQuota(params: {
  userId: string;
  plan: Plan;
}): Promise<{ remainingDaily: number; remainingMonthly: number }> {
  const limits = PLAN_LIMITS[params.plan] ?? PLAN_LIMITS.free;
  if (limits.daily <= 0 || limits.monthly <= 0) {
    throw new Error("PLAN_LIMIT_BLOCKED");
  }

  const admin = getSupabaseAdmin();
  const [todayCountResult, monthCountResult] = await Promise.all([
    admin
      .from("generation_jobs")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", params.userId)
      .in("job_kind", ["physical_create", "digital_create"])
      .gte("created_at", getUtcDayStartIso()),
    admin
      .from("generation_jobs")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", params.userId)
      .in("job_kind", ["physical_create", "digital_create"])
      .gte("created_at", getUtcMonthStartIso()),
  ]);

  const usedToday = todayCountResult.count ?? 0;
  const usedMonth = monthCountResult.count ?? 0;
  if (usedToday >= limits.daily) {
    throw new Error(`PLAN_DAILY_LIMIT:${limits.daily}`);
  }
  if (usedMonth >= limits.monthly) {
    throw new Error(`PLAN_MONTHLY_LIMIT:${limits.monthly}`);
  }

  return {
    remainingDaily: Math.max(0, limits.daily - usedToday - 1),
    remainingMonthly: Math.max(0, limits.monthly - usedMonth - 1),
  };
}

export async function createGenerationJobLog(params: {
  userId: string;
  storeId?: string | null;
  jobKind: GenerationJobKind;
  source?: "builder" | "scan" | "api";
  inputPayload?: Record<string, unknown>;
  step?: string;
}): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("generation_jobs")
      .insert({
        user_id: params.userId,
        store_id: params.storeId ?? null,
        job_kind: params.jobKind,
        source: params.source ?? "builder",
        status: "running",
        step: params.step ?? "init",
        progress: 10,
        input_payload: params.inputPayload ?? {},
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function finishGenerationJobLog(params: {
  jobId: string | null;
  success: boolean;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  if (!params.jobId) return;
  try {
    const admin = getSupabaseAdmin();
    await admin
      .from("generation_jobs")
      .update({
        status: params.success ? "succeeded" : "failed",
        progress: params.success ? 100 : 0,
        output_payload: params.outputPayload ?? {},
        error_message: params.errorMessage ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", params.jobId);
  } catch {
    // ignore logging failures
  }
}
