import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdCopyClient } from "./ad-copy-client";

export default async function AdCopyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <AdCopyClient />
    </div>
  );
}
