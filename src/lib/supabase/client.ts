import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** À true si l’app est configurée avec de vraies clés Supabase (évite "Failed to fetch"). */
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseKey &&
  !supabaseUrl.includes("placeholder") &&
  supabaseKey !== "placeholder-anon-key";

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
