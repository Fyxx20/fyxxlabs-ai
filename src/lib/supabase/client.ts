import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True si l'app a de vraies cles Supabase (evite "Failed to fetch"). */
export function isSupabaseConfigured(): boolean {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    !supabaseUrl.includes("placeholder") &&
    supabaseKey !== "placeholder-anon-key"
  );
}

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
