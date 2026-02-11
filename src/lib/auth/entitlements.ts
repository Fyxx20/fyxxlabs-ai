import "server-only";

export type Plan = "trial" | "free" | "create" | "starter" | "pro" | "elite" | "lifetime";

export interface FreemiumProfile {
  plan: Plan;
  trial_started_at?: string | null;
  trial_ends_at: string | null;
  scans_used: number;
}

/** Subscription row (plan, status) pour recalculer les droits si profile.plan n'est pas à jour. */
export interface SubscriptionForEntitlements {
  plan: string | null;
  status: string | null;
}

export interface FreemiumEntitlements {
  plan: Plan;
  isTrialActive: boolean;
  isPro: boolean;
  isLifetime: boolean;
  isEarlyAccess: boolean;
  canScan: boolean;
  canViewFullScan: boolean;
  /** Backward-compatible alias for legacy callers. */
  canSeeFullIssues: boolean;
  canViewPreviewScan: boolean;
  canUseCoach: boolean;
  canRescan: boolean;
  scanLimitPerDay: number | null;
  coachMessagesPerHour: number | null;
  trialEndsAt: Date | null;
}

/**
 * Plan effectif : profile.plan ou subscription (si abo actif pro/lifetime) pour les comptes
 * dont le plan a été mis à jour côté subscriptions mais pas encore synchronisé sur profiles.
 */
function getEffectivePlan(
  profile: FreemiumProfile | null,
  subscription: SubscriptionForEntitlements | null
): Plan {
  const fromProfile = profile?.plan as Plan | undefined;
  const subPlan = (subscription?.plan ?? "").toLowerCase();
  const subActive = subscription?.status === "active";

  if (subActive) {
    if (subPlan === "create") return "create";
    if (subPlan === "starter") return "starter";
    if (subPlan === "pro") return "pro";
    if (subPlan === "elite" || subPlan === "business") return "elite";
    if (subPlan === "lifetime") return "lifetime";
    if (subPlan === "free") return "free";
  }

  // Legacy compat: profiles.plan = pro => plan payant (tier pro par défaut)
  if (fromProfile === "pro") return "pro";
  if (fromProfile === "lifetime") return "lifetime";
  if (fromProfile === "trial" || fromProfile === "free") return fromProfile;
  return "free";
}

export function getEntitlements(
  profile: FreemiumProfile | null,
  subscription?: SubscriptionForEntitlements | null
): FreemiumEntitlements {
  const now = new Date();
  const plan = getEffectivePlan(profile, subscription ?? null);
  if (!profile && !subscription) {
    return {
      plan: "free",
      isTrialActive: false,
      isPro: false,
      isLifetime: false,
      isEarlyAccess: false,
      canScan: false,
      canViewFullScan: false,
      canSeeFullIssues: false,
      canViewPreviewScan: true,
      canUseCoach: false,
      canRescan: false,
      scanLimitPerDay: null,
      coachMessagesPerHour: null,
      trialEndsAt: null,
    };
  }

  const isPaidPlan = plan === "create" || plan === "starter" || plan === "pro" || plan === "elite" || plan === "lifetime";
  const isPro = isPaidPlan;
  const isLifetime = plan === "lifetime";
  const isEarlyAccess = plan === "elite" || plan === "lifetime";
  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive =
    plan === "trial" && trialEnd !== null && now < trialEnd;
  const canScan =
    isPaidPlan || (isTrialActive && (profile?.scans_used ?? 0) < 1);
  const canRescan = isPaidPlan;
  const canUseCoach = isPaidPlan;
  const canViewFullScan = isPaidPlan;

  const scanLimitPerDay =
    plan === "create"
      ? 1
      : plan === "starter"
        ? 2
        : plan === "pro"
          ? 10
          : plan === "elite" || plan === "lifetime"
            ? null
            : isTrialActive
              ? 1
              : 0;

  const coachMessagesPerHour =
    plan === "create"
      ? 5
      : plan === "starter"
        ? 10
        : plan === "pro" || plan === "elite" || plan === "lifetime"
          ? null
          : 0;

  return {
    plan,
    isTrialActive,
    isPro,
    isLifetime,
    isEarlyAccess,
    canScan,
    canViewFullScan,
    canSeeFullIssues: canViewFullScan,
    canViewPreviewScan: true,
    canUseCoach,
    canRescan,
    scanLimitPerDay,
    coachMessagesPerHour,
    trialEndsAt: isTrialActive ? trialEnd : null,
  };
}

export const PAYWALL_SCAN_LIMIT = "PAYWALL_SCAN_LIMIT";
export const PAYWALL_COACH = "PAYWALL_COACH";

export class PaywallError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "PaywallError";
  }
}

export function assertCanScan(
  profile: FreemiumProfile | null,
  subscription?: SubscriptionForEntitlements | null
): void {
  const e = getEntitlements(profile, subscription);
  if (!e.canScan) {
    throw new PaywallError(
      PAYWALL_SCAN_LIMIT,
      "Tu as utilisé ton scan gratuit. Débloque le plan complet pour continuer."
    );
  }
}

export function assertCanUseCoach(
  profile: FreemiumProfile | null,
  subscription?: SubscriptionForEntitlements | null
): void {
  const e = getEntitlements(profile, subscription);
  if (!e.canUseCoach) {
    throw new PaywallError(
      PAYWALL_COACH,
      "Le Coach IA est réservé au plan complet. Débloque Pro pour y accéder."
    );
  }
}
