#!/usr/bin/env node
/**
 * Seed admin + lifetime (comptes internes).
 * Usage: node scripts/seed-users.mjs
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * - admin@storepilot.ia → role = admin
 * - m.harea@storepilot.ia → subscription plan = lifetime, status = active, source = manual
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const adminEmail = "admin@storepilot.ia";
  const lifetimeEmail = "m.harea@storepilot.ia";

  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users?.find((u) => u.email === adminEmail);
  const lifetimeUser = users?.users?.find((u) => u.email === lifetimeEmail);

  if (adminUser) {
    const { error: e1 } = await supabase
      .from("profiles")
      .upsert(
        { user_id: adminUser.id, role: "admin", email: adminUser.email, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (e1) console.error("Profile admin upsert error:", e1.message);
    else console.log("OK: admin@storepilot.ia → role = admin");
  } else {
    console.warn("User not found:", adminEmail);
  }

  if (lifetimeUser) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", lifetimeUser.id)
      .single();

    const row = {
      plan: "lifetime",
      status: "active",
      ends_at: null,
      source: "manual",
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: e2 } = await supabase
        .from("subscriptions")
        .update(row)
        .eq("user_id", lifetimeUser.id);
      if (e2) console.error("Subscription lifetime update error:", e2.message);
      else console.log("OK: m.harea@storepilot.ia → subscription lifetime (updated)");
    } else {
      const { error: e3 } = await supabase.from("subscriptions").insert({
        user_id: lifetimeUser.id,
        trial_start: new Date().toISOString(),
        trial_end: new Date().toISOString(),
        ...row,
      });
      if (e3) console.error("Subscription lifetime insert error:", e3.message);
      else console.log("OK: m.harea@storepilot.ia → subscription lifetime (inserted)");
    }
  } else {
    console.warn("User not found:", lifetimeEmail);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
