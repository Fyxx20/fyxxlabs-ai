/**
 * Creates the 3 products (Starter, Pro, Elite) and 6 prices in Stripe,
 * then prints the env vars to paste into .env.local.
 */
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ── Read .env.local manually ──────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
function envGet(key) {
  const m = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
  return m ? m[1].trim() : undefined;
}

const secretKey = envGet("STRIPE_SECRET_KEY");
if (!secretKey || secretKey.includes("placeholder") || secretKey === "sk_test_...") {
  console.error("❌ STRIPE_SECRET_KEY manquante ou placeholder dans .env.local");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });

// ── Product & Price definitions ───────────────────────────────────────
const products = [
  {
    name: "Starter",
    description: "AXIS Starter — 2 scans/jour, 10 messages chatbot/heure, dashboard complet",
    prices: [
      { envKey: "STRIPE_PRICE_STARTER_MONTHLY", unit_amount: 999, currency: "eur", interval: "month" },
      { envKey: "STRIPE_PRICE_STARTER_YEARLY", unit_amount: 9999, currency: "eur", interval: "year" },
    ],
  },
  {
    name: "Pro",
    description: "AXIS Pro — 10 scans/jour, chatbot illimité, historique complet",
    prices: [
      { envKey: "STRIPE_PRICE_PRO_MONTHLY", unit_amount: 1999, currency: "eur", interval: "month" },
      { envKey: "STRIPE_PRICE_PRO_YEARLY", unit_amount: 19999, currency: "eur", interval: "year" },
    ],
  },
  {
    name: "Elite",
    description: "AXIS Elite — Scans illimités, chatbot illimité, nouveautés en avant-première",
    prices: [
      { envKey: "STRIPE_PRICE_ELITE_MONTHLY", unit_amount: 3499, currency: "eur", interval: "month" },
      { envKey: "STRIPE_PRICE_ELITE_YEARLY", unit_amount: 34999, currency: "eur", interval: "year" },
    ],
  },
];

// ── Create in Stripe ──────────────────────────────────────────────────
const priceIds = {};

for (const prod of products) {
  console.log(`\n📦 Création du produit "${prod.name}"...`);
  const product = await stripe.products.create({
    name: prod.name,
    description: prod.description,
    metadata: { app: "axis" },
  });
  console.log(`   ✅ Produit créé: ${product.id}`);

  for (const p of prod.prices) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.unit_amount,
      currency: p.currency,
      recurring: { interval: p.interval },
      metadata: { app: "axis", plan: prod.name.toLowerCase(), interval: p.interval },
    });
    priceIds[p.envKey] = price.id;
    console.log(`   ✅ Prix ${p.interval}: ${price.id} (${(p.unit_amount / 100).toFixed(2)} €/${p.interval})`);
  }
}

// ── Update .env.local ─────────────────────────────────────────────────
let updatedEnv = envContent;
for (const [key, value] of Object.entries(priceIds)) {
  const regex = new RegExp(`^${key}=.+$`, "m");
  if (regex.test(updatedEnv)) {
    updatedEnv = updatedEnv.replace(regex, `${key}=${value}`);
  } else {
    updatedEnv += `\n${key}=${value}`;
  }
}
writeFileSync(envPath, updatedEnv, "utf-8");

console.log("\n✅ .env.local mis à jour avec les Price IDs !");
console.log("\n── Résumé ──────────────────────────────────────");
for (const [key, value] of Object.entries(priceIds)) {
  console.log(`${key}=${value}`);
}
console.log("────────────────────────────────────────────────\n");
