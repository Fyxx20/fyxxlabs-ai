import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getEntitlements, assertCanUseCoach } from "@/lib/auth/entitlements";
import { isOpenAIAvailable, callOpenAIChat } from "@/lib/ai/openaiClient";

const FALLBACK_MESSAGE =
  "IA indisponible pour le moment. Tu peux réessayer plus tard ou lancer un scan pour voir ton score et l'action prioritaire.";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { store_id?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const storeId = body.store_id;
  const content = body.content?.trim();
  if (!storeId || !content) {
    return NextResponse.json(
      { error: "store_id et content requis" },
      { status: 400 }
    );
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .single();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_started_at, trial_ends_at, scans_used")
    .eq("user_id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  const entitlements = getEntitlements(profile ?? null, subscription ?? null);
  try {
    assertCanUseCoach(profile ?? null, subscription ?? null);
  } catch {
    return NextResponse.json(
      { error: "Le chatbot FyxxLabs est désactivé pendant l'essai gratuit. Passe sur une version supérieure pour l'activer." },
      { status: 403 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (entitlements.coachMessagesPerHour !== null && entitlements.coachMessagesPerHour >= 0) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: messagesLastHour } = await admin
      .from("coach_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", hourAgo);
    if ((messagesLastHour ?? 0) >= entitlements.coachMessagesPerHour) {
      return NextResponse.json(
        { error: `Limite atteinte: ${entitlements.coachMessagesPerHour} messages/heure sur ton plan actuel.` },
        { status: 429 }
      );
    }
  }

  const { data: messages } = await admin
    .from("coach_messages")
    .select("role, content")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(30);

  const { data: storeRow } = await admin
    .from("stores")
    .select("name, website_url, goal, platform")
    .eq("id", storeId)
    .single();

  const { data: lastScan } = await admin
    .from("scans")
    .select("scan_data_json, summary, score_global, scores_json, issues_json")
    .eq("store_id", storeId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastScan) {
    return NextResponse.json(
      { error: "Analyse indisponible. Lance une analyse pour activer l'assistant." },
      { status: 400 }
    );
  }

  const { data: metricsRows } = await admin
    .from("store_metrics_daily")
    .select("day, revenue, orders_count, total_customers, aov")
    .eq("store_id", storeId)
    .gte("day", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    .order("day", { ascending: false })
    .limit(90);

  const systemPrompt =
    "Tu es FyxxLabs, un expert en e-commerce, CRO et UX. Tu réponds en français. " +
    "Tu ne réponds jamais sans données issues du scan. Tu analyses uniquement les éléments mesurés. " +
    "Tu proposes des actions concrètes, hiérarchisées. Pas de motivation, pas de blabla, pas de promesses. " +
    "Base-toi UNIQUEMENT sur le contexte fourni (scan, métriques si dispo, store). N'invente pas de chiffres.";

  const contextParts: string[] = [];
  if (storeRow) {
    contextParts.push(
      `Store: ${storeRow.name}, URL: ${storeRow.website_url}, objectif: ${storeRow.goal}, plateforme: ${storeRow.platform ?? "non précisé"}`
    );
  }
  if (lastScan?.summary) contextParts.push(`Résumé dernier scan: ${lastScan.summary}`);
  if (lastScan?.score_global != null) contextParts.push(`Score global: ${lastScan.score_global}/100`);
  if (lastScan?.scores_json) {
    const s = lastScan.scores_json as Record<string, number>;
    contextParts.push(`Piliers: conversion=${s.conversion ?? "?"}, trust=${s.trust ?? "?"}, offer=${s.offer ?? "?"}, performance=${s.performance ?? "?"}, traffic=${s.traffic ?? "?"}`);
  }
  if (lastScan?.issues_json) {
    const payload = lastScan.issues_json as { next_best_action?: { title?: string; steps?: string[] }; issues?: { title?: string }[] };
    if (payload.next_best_action?.title)
      contextParts.push(`Action prioritaire scan: ${payload.next_best_action.title}`);
    if (payload.issues?.length)
      contextParts.push(`Issues: ${payload.issues.slice(0, 5).map((i) => i.title).join("; ")}`);
  }
  if (lastScan?.scan_data_json) {
    const sd = lastScan.scan_data_json as { homepage?: { visibleText?: string; hasCTA?: boolean; hasPrice?: boolean }; pages?: unknown[] };
    if (sd?.homepage) {
      contextParts.push(
        `Homepage: CTA=${sd.homepage.hasCTA}, Prix=${sd.homepage.hasPrice}, Extrait: ${(sd.homepage.visibleText ?? "").slice(0, 2000)}`
      );
    }
  }
  if (metricsRows?.length) {
    const rev = metricsRows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const orders = metricsRows.reduce((s, r) => s + (r.orders_count ?? 0), 0);
    contextParts.push(`Métriques (90j): CA≈${rev.toFixed(0)}, commandes≈${orders}, clients≈${metricsRows[0]?.total_customers ?? "?"}`);
  }

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: systemPrompt + (contextParts.length ? `\n\nContexte scan:\n${contextParts.join("\n")}` : ""),
    },
    ...(messages ?? []).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user", content },
  ];

  let assistantContent: string;
  if (!isOpenAIAvailable()) {
    assistantContent = FALLBACK_MESSAGE;
  } else {
    try {
      assistantContent = await callOpenAIChat({ messages: chatMessages });
      if (!assistantContent.trim()) assistantContent = "Désolé, pas de réponse.";
    } catch {
      assistantContent = FALLBACK_MESSAGE;
    }
  }

  const { data: inserted, error: insertError } = await admin.from("coach_messages").insert({
    store_id: storeId,
    user_id: user.id,
    role: "user",
    content,
  }).select("id").single();
  if (!insertError) {
    await admin.from("coach_messages").insert({
      store_id: storeId,
      user_id: user.id,
      role: "assistant",
      content: assistantContent,
    });
  }

  return NextResponse.json({
    id: inserted?.id ?? null,
    content: assistantContent,
    created_at: new Date().toISOString(),
  });
}
