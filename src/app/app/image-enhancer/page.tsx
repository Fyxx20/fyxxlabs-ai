import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ImageEnhancerClient } from "./image-enhancer-client";

export default async function ImageEnhancerPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <ImageEnhancerClient />
    </div>
  );
}
