#!/usr/bin/env node
/**
 * Définit le mot de passe des comptes seed (admin + lifetime) sur la valeur donnée.
 * Usage: node scripts/set-seed-passwords.mjs [password]
 *        Par défaut: Test123
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (depuis .env.local si présent)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, ".env.local");

if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      process.env[m[1]] = val;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set in .env.local or env)");
  process.exit(1);
}

const newPassword = process.argv[2] ?? "Test123";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const adminEmail = "admin@storepilot.ia";
const lifetimeEmail = "m.harea@storepilot.ia";

async function main() {
  const { data: list } = await supabase.auth.admin.listUsers();
  const users = list?.users ?? [];
  const adminUser = users.find((u) => u.email === adminEmail);
  const lifetimeUser = users.find((u) => u.email === lifetimeEmail);

  for (const [label, user] of [
    ["Admin (admin@storepilot.ia)", adminUser],
    ["User lifetime (m.harea@storepilot.ia)", lifetimeUser],
  ]) {
    if (!user) {
      console.warn("User not found:", label);
      continue;
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) {
      console.error(label, "→ error:", error.message);
    } else {
      console.log("OK:", label, "→ password set to", newPassword);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
