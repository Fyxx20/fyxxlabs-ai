export interface SubscriptionRow {
  status: "trialing" | "active" | "past_due" | "canceled";
  trial_start: string;
  trial_end: string;
  advice_consumed?: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan: string;
  current_period_end?: string | null;
  ends_at?: string | null;
  source?: string | null;
}

export interface UserEntitlements {
  isTrialActive: boolean;
  hasAdviceRemaining: boolean;
  isPaid: boolean;
  isLifetime: boolean;
  trialEndsAt: Date | null;
  canScan: boolean;
  canUseCoach: boolean;
  canSeeFullIssues: boolean;
  canRescan: boolean;
}

export function getUserEntitlements(sub: SubscriptionRow | null): UserEntitlements {
  const now = new Date();
  if (!sub) {
    return {
      isTrialActive: false,
      hasAdviceRemaining: false,
      isPaid: false,
      isLifetime: false,
      trialEndsAt: null,
      canScan: false,
      canUseCoach: false,
      canSeeFullIssues: false,
      canRescan: false,
    };
  }

  const isLifetime = sub.plan === "lifetime" && sub.status === "active";
  const isPaid =
    sub.status === "active" && ["create", "starter", "pro", "elite", "business", "lifetime"].includes(sub.plan);

  if (isLifetime || isPaid) {
    return {
      isTrialActive: false,
      hasAdviceRemaining: true,
      isPaid: true,
      isLifetime,
      trialEndsAt: null,
      canScan: true,
      canUseCoach: true,
      canSeeFullIssues: true,
      canRescan: true,
    };
  }

  const trialEnd = new Date(sub.trial_end);
  const isTrialActive = sub.status === "trialing" && now < trialEnd;
  const hasAdviceRemaining = sub.advice_consumed !== true;

  const canScan = isPaid || (isTrialActive && hasAdviceRemaining);
  const canUseCoach = isPaid;
  const canSeeFullIssues = isPaid;
  const canRescan = isPaid;

  return {
    isTrialActive,
    hasAdviceRemaining,
    isPaid: false,
    isLifetime: false,
    trialEndsAt: isTrialActive ? trialEnd : null,
    canScan,
    canUseCoach,
    canSeeFullIssues,
    canRescan,
  };
}
