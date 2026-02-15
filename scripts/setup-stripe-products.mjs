/**
 * Creates FyxxLabs products/prices in Stripe,
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
    name: "Create",
    description: "FyxxLabs Create — Génération complète d'une boutique Shopify (paiement unique)",
    prices: [
      { envKey: "STRIPE_PRICE_CREATE_ONE_TIME", unit_amount: 1499, currency: "eur", interval: null },
    ],
  },
  {
    name: "Pro",
    description: "FyxxLabs Pro — Analyse avancée, scans quotidiens, chatbot illimité",
    prices: [
      { envKey: "STRIPE_PRICE_PRO_MONTHLY", unit_amount: 3900, currency: "eur", interval: "month" },
    ],
  },
  {
    name: "Agence",
    description: "FyxxLabs Agence — Pour les agences, multi-boutiques, fonctionnalités premium",
    prices: [
      { envKey: "STRIPE_PRICE_AGENCE_MONTHLY", unit_amount: 7900, currency: "eur", interval: "month" },
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
    const priceParams = {
      product: product.id,
      unit_amount: p.unit_amount,
      currency: p.currency,
      metadata: { app: "fyxxlabs", plan: prod.name.toLowerCase(), interval: p.interval ?? "one_time" },
    };
    if (p.interval) {
      priceParams.recurring = { interval: p.interval };
    }
    const price = await stripe.prices.create(priceParams);
    priceIds[p.envKey] = price.id;
    console.log(`   ✅ Prix ${p.interval ?? "one_time"}: ${price.id} (${(p.unit_amount / 100).toFixed(2)} €${p.interval ? "/" + p.interval : ""})`);
  }
}

// First-subscription 50% coupon
const firstTrialCoupon = await stripe.coupons.create({
  percent_off: 50,
  duration: "once",
  name: "FYXX_FIRST_TRIAL_50",
  metadata: { app: "fyxxlabs", offer: "first_subscription_50" },
});
priceIds.STRIPE_COUPON_FIRST_TRIAL_50 = firstTrialCoupon.id;

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

console.log("\n✅ .env.local mis à jour avec les Price IDs + coupon !");
console.log("\n── Résumé ──────────────────────────────────────");
for (const [key, value] of Object.entries(priceIds)) {
  console.log(`${key}=${value}`);
}
console.log("────────────────────────────────────────────────\n");
