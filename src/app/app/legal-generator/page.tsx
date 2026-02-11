import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LegalGeneratorClient } from "./legal-generator-client";

export default async function LegalGeneratorPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <LegalGeneratorClient />
    </div>
  );
}
