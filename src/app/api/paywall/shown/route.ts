import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await admin
    .from("profiles")
    .select("paywall_show_day, paywall_show_count_today")
    .eq("user_id", user.id)
    .single();

  const currentDay = profile?.paywall_show_day === today ? (profile?.paywall_show_count_today ?? 0) : 0;

  await admin
    .from("profiles")
    .update({
      last_paywall_shown_at: new Date().toISOString(),
      paywall_show_day: today,
      paywall_show_count_today: currentDay + 1,
    })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
