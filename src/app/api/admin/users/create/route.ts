import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  let body: { email: string; password?: string; magic_link?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  if (body.magic_link) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const meta = getRequestMeta(request);
    await logAdminAction({
      admin_user_id: auth.user.id,
      action: "user.create_magic_link",
      target_type: "user",
      target_id: data.user?.id ?? undefined,
      after_state: { email, link: data.properties?.hashed_token ? "[REDACTED]" : null },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return NextResponse.json({ ok: true, message: "Lien magique généré (envoi manuel si besoin)", user_id: data.user?.id });
  }

  const password = body.password?.trim();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "password requis (min 6 caractères) ou magic_link: true" }, { status: 400 });
  }

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "user.create",
    target_type: "user",
    target_id: newUser.user.id,
    after_state: { email, user_id: newUser.user.id },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, user_id: newUser.user.id, email: newUser.user.email });
}
