import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

function buildRecoveryLink(actionLink: string, appUrl: string, supabaseUrl?: string): string {
  if (!actionLink) return "";
  try {
    const parsed = new URL(actionLink);
    const safeRedirect = `${appUrl.replace(/\/$/, "")}/app/settings?passwordReset=1`;
    const appHost = new URL(appUrl).host;

    if (parsed.pathname.startsWith("/auth/v1/verify")) {
      parsed.searchParams.set("redirect_to", safeRedirect);
      if (supabaseUrl && parsed.host === appHost) {
        const supabase = new URL(supabaseUrl);
        parsed.protocol = supabase.protocol;
        parsed.host = supabase.host;
      }
    }
    return parsed.toString();
  } catch {
    return actionLink;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  const { userId } = await params;
  const admin = getSupabaseAdmin();
  const { data: user } = await admin.auth.admin.getUserById(userId);
  if (!user?.user?.email) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? "https://fyxxlabs.com";
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.user.email,
    options: {
      redirectTo: `${appUrl.replace(/\/$/, "")}/app/settings?passwordReset=1`,
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recoveryLink = buildRecoveryLink(
    linkData.properties?.action_link ?? "",
    appUrl,
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const meta = getRequestMeta(request);
  await logAdminAction({
    admin_user_id: auth.user.id,
    action: "user.reset_password_link",
    target_type: "user",
    target_id: userId,
    after_state: { email: user.user.email },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({
    ok: true,
    message: "Lien de réinitialisation généré (à envoyer manuellement à l'utilisateur)",
    recovery_link: recoveryLink,
  });
}
