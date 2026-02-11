import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReviewGeneratorClient } from "./review-generator-client";

export default async function ReviewGeneratorPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <ReviewGeneratorClient />
    </div>
  );
}
