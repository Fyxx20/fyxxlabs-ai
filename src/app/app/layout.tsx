import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { getEntitlements } from "@/lib/auth/entitlements";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";

function parseEnvEmailList(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, website_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const currentStore = resolveSelectedStore(stores ?? [], selectedStoreId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plan, trial_ends_at, scans_used")
    .eq("user_id", user.id)
    .single();
  const emailLower = (user.email ?? "").toLowerCase();
  const adminEmails = parseEnvEmailList(process.env.ADMIN_EMAILS);
  const superAdminEmails = parseEnvEmailList(process.env.SUPER_ADMIN_EMAILS);
  const isPrivilegedByEnv = adminEmails.includes(emailLower) || superAdminEmails.includes(emailLower);
  const isPrivilegedByRole = profile?.role === "admin" || profile?.role === "super_admin";
  if (isPrivilegedByRole || isPrivilegedByEnv) {
    redirect("/admin/dashboard");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, trial_start, trial_end, advice_consumed, plan, current_period_end, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  const ent = getEntitlements(profile ?? null, subscription ?? null);
  const entitlements = {
    ...ent,
    trialEndsAt: ent.trialEndsAt?.toISOString() ?? null,
  };

  return (
    <AppShell
      user={user}
      stores={stores ?? []}
      currentStoreId={currentStore?.id ?? null}
      subscription={subscription ?? null}
      entitlements={entitlements}
      userRole={profile?.role ?? null}
    >
      {children}
    </AppShell>
  );
}
