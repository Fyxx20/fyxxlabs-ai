/**
 * Active l'abonnement à vie (status = active) pour un compte, pour les tests.
 * Usage: node scripts/activate-lifetime.mjs
 * Prérequis: .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = { ...process.env };
  const path = join(__dirname, "..", ".env.local");
  if (!existsSync(path)) {
    console.error("Fichier .env.local introuvable.");
    process.exit(1);
  }
  const content = readFileSync(path, "utf-8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "m.harea@storepilot.ia";

async function main() {
  let userId = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", EMAIL)
    .single();
  if (profile?.user_id) userId = profile.user_id;

  if (!userId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const user = list?.users?.find((u) => u.email === EMAIL);
    if (user) userId = user.id;
  }

  if (!userId) {
    console.error("Compte introuvable pour", EMAIL);
    process.exit(1);
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: "2099-12-31T23:59:59Z",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Erreur:", error.message);
    process.exit(1);
  }

  console.log("✓ Abonnement à vie activé pour", EMAIL);
}

main();
