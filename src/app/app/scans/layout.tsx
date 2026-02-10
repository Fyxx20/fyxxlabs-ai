import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AnalysisContextBar } from "@/components/analysis/analysis-context-bar";
import { ScansSubnav } from "@/components/analysis/scans-subnav";
import { resolveSelectedStore, STORE_SELECTION_COOKIE } from "@/lib/store-selection";

export default async function ScansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, website_url, platform, country, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(STORE_SELECTION_COOKIE)?.value ?? null;
  const store = resolveSelectedStore(stores ?? [], selectedStoreId);

  if (!store) redirect("/onboarding");

  const { data: lastScan } = await supabase
    .from("scans")
    .select("id, status, score_global, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AnalysisContextBar store={store} lastScan={lastScan} />
      <ScansSubnav lastScanId={lastScan?.id ?? null} />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
