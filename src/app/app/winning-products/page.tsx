import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WinningProductsClient } from "./winning-products-client";

export default async function WinningProductsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <WinningProductsClient />
    </div>
  );
}
