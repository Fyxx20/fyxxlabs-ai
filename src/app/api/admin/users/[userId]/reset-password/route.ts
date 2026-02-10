import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, getSupabaseAdmin, logAdminAction, getRequestMeta } from "@/lib/supabaseAdmin";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) return auth.error;

  const { userId } = await params;
  const admin = getSupabaseAdmin();
  const { data: user } = await admin.auth.admin.getUserById(userId);
  if (!user?.user?.email) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.user.email,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace localhost/default Supabase URL with the real app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fyxxlabs.com";
  let recoveryLink = linkData.properties?.action_link ?? "";
  if (recoveryLink) {
    try {
      const parsed = new URL(recoveryLink);
      const realUrl = new URL(appUrl);
      parsed.protocol = realUrl.protocol;
      parsed.host = realUrl.host;
      recoveryLink = parsed.toString();
    } catch {
      // keep original link if parsing fails
    }
  }

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
