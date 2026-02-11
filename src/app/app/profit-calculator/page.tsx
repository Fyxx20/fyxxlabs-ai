import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfitCalculatorClient } from "./profit-calculator-client";

export default async function ProfitCalculatorPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <ProfitCalculatorClient />
    </div>
  );
}
