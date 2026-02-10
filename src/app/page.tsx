import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LandingContent } from "@/components/landing-content";

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasStore = false;
  if (user) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    hasStore = (stores?.length ?? 0) >= 1;
  }

  return (
    <LandingContent
      hasSession={!!user}
      hasStore={hasStore}
    />
  );
}
