#!/usr/bin/env node
/**
 * Crée (ou met à jour) un compte super admin avec accès total.
 *
 * Usage:
 *   node scripts/create-super-admin.mjs --email admin@fyxxlabs.com --password "MotDePasseFort123!"
 *
 * Variables requises:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--email") out.email = argv[i + 1];
    if (arg === "--password") out.password = argv[i + 1];
  }
  return out;
}

function loadEnvFromLocalFileIfNeeded() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFromLocalFileIfNeeded();

  const { email, password } = parseArgs(process.argv.slice(2));
  if (!email || !password) {
    console.error("Usage: node scripts/create-super-admin.mjs --email <email> --password <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit contenir au moins 8 caractères.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Variables manquantes: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const normalizedEmail = email.trim().toLowerCase();

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Erreur listUsers:", listError.message);
    process.exit(1);
  }

  let user = usersData.users.find((u) => (u.email ?? "").toLowerCase() === normalizedEmail);
  if (!user) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      console.error("Erreur createUser:", createError?.message ?? "création impossible");
      process.exit(1);
    }
    user = created.user;
  } else {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      console.error("Erreur updateUserById:", updateError.message);
      process.exit(1);
    }
  }

  const now = new Date().toISOString();
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        role: "super_admin",
        email: normalizedEmail,
        plan: "lifetime",
        scans_used: 0,
        trial_ends_at: null,
        is_banned: false,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
  if (profileError) {
    console.error("Erreur profile upsert:", profileError.message);
    process.exit(1);
  }

  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        status: "active",
        trial_start: now,
        trial_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        plan: "lifetime",
        ends_at: null,
        source: "manual",
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
  if (subError) {
    console.error("Erreur subscription upsert:", subError.message);
    process.exit(1);
  }

  console.log("Super admin prêt:");
  console.log(`- email: ${normalizedEmail}`);
  console.log(`- user_id: ${user.id}`);
  console.log("- role: super_admin");
  console.log("- abonnement: lifetime / active");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
