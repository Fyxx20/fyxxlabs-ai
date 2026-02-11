import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CompetitorSpyClient } from "./competitor-spy-client";

export default async function CompetitorSpyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <CompetitorSpyClient />
    </div>
  );
}
