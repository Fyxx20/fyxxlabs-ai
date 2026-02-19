import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";
import { getEntitlements } from "@/lib/auth/entitlements";
import type { SubscriptionRow } from "@/lib/entitlements";

function parseEnvEmailList(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type AppContextProfile = {
  role: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  scans_used: number | null;
  trial_started_at?: string | null;
};

export type AppContextSubscription = {
  status: SubscriptionRow["status"] | null;
  trial_start: string | null;
  trial_end: string | null;
  advice_consumed: boolean | null;
  plan: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const AllowedSubscriptionStatuses = new Set<SubscriptionRow["status"]>([
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

function toSubscriptionRow(input: AppContextSubscription | null): SubscriptionRow | null {
  if (!input?.plan) return null;
  if (!input.status || !AllowedSubscriptionStatuses.has(input.status)) return null;
  return {
    status: input.status,
    plan: input.plan,
    trial_start: input.trial_start ?? new Date(0).toISOString(),
    trial_end: input.trial_end ?? new Date(0).toISOString(),
    advice_consumed: input.advice_consumed ?? false,
    stripe_customer_id: input.stripe_customer_id ?? null,
    stripe_subscription_id: input.stripe_subscription_id ?? null,
    current_period_end: input.current_period_end ?? null,
  };
}

export type AppContextStore = {
  id: string;
  name: string;
  website_url: string;
};

export const getAppContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      stores: [] as AppContextStore[],
      currentStore: null as AppContextStore | null,
      profile: null as AppContextProfile | null,
      subscription: null as AppContextSubscription | null,
      entitlements: getEntitlements(null, null),
      isPrivileged: false,
    };
  }

  const [storesRes, profileRes, subscriptionRes] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, website_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("role, plan, trial_ends_at, scans_used, trial_started_at")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select(
        "status, trial_start, trial_end, advice_consumed, plan, current_period_end, stripe_customer_id, stripe_subscription_id"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const stores = (storesRes.data ?? []) as AppContextStore[];
  const profile = (profileRes.data ?? null) as AppContextProfile | null;
  const subscription = (subscriptionRes.data ?? null) as AppContextSubscription | null;

  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const currentStore = resolveSelectedStore(stores, selectedStoreId);

  const ent = getEntitlements(
    profile
      ? {
          plan: (profile.plan ?? "free") as any,
          trial_ends_at: profile.trial_ends_at ?? null,
          scans_used: profile.scans_used ?? 0,
          trial_started_at: profile.trial_started_at ?? null,
        }
      : null,
    subscription
      ? { plan: subscription.plan ?? null, status: subscription.status ?? null }
      : null
  );

  const emailLower = (user.email ?? "").toLowerCase();
  const adminEmails = parseEnvEmailList(process.env.ADMIN_EMAILS);
  const superAdminEmails = parseEnvEmailList(process.env.SUPER_ADMIN_EMAILS);
  const isPrivilegedByEnv = adminEmails.includes(emailLower) || superAdminEmails.includes(emailLower);
  const isPrivilegedByRole = profile?.role === "admin" || profile?.role === "super_admin";

  return {
    supabase,
    user,
    stores,
    currentStore,
    profile,
    subscription: toSubscriptionRow(subscription),
    entitlements: {
      ...ent,
      trialEndsAt: ent.trialEndsAt?.toISOString() ?? null,
    },
    isPrivileged: isPrivilegedByEnv || isPrivilegedByRole,
  };
});

