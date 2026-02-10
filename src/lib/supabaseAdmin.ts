/**
 * Admin back-office: client service role + helpers.
 * NE JAMAIS exposer SUPABASE_SERVICE_ROLE_KEY côté client.
 * Utilisé uniquement dans les API routes /api/admin/* et server actions admin.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type { User };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let _adminClient: SupabaseClient | null = null;

/** Client Supabase avec service role (bypass RLS). À utiliser uniquement côté serveur. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  }
  if (!_adminClient) {
    _adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _adminClient;
}

export type AdminAuditTargetType = "user" | "store" | "subscription" | "scan" | "integration" | "profile";

export interface AdminAuditEntry {
  admin_user_id: string;
  action: string;
  target_type: AdminAuditTargetType;
  target_id?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  ip?: string | null;
  user_agent?: string | null;
}

/** Insère une entrée dans admin_audit_logs (via service role). */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from("admin_audit_logs").insert({
    admin_user_id: entry.admin_user_id,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id ?? null,
    before_state: entry.before_state ?? null,
    after_state: entry.after_state ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.user_agent ?? null,
  });
}

/** Récupère IP et User-Agent depuis une Request (pour audit). */
export function getRequestMeta(request: Request | NextRequest): { ip?: string; user_agent?: string } {
  const req = request as NextRequest & { headers?: Headers };
  const headers = req.headers ?? new Request(request).headers;
  return {
    ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? undefined,
    user_agent: headers.get("user-agent") ?? undefined,
  };
}

export interface RequireAdminResult {
  user: User;
  profile: { role: string; is_banned?: boolean };
}

/** Emails considérés comme admin même si profiles.role n'est pas à jour (env ADMIN_EMAILS, séparés par des virgules). */
function getAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Vérifie session + role admin. À appeler dans chaque route /api/admin/*.
 * Utilise le client Supabase serveur (cookies), pas le service role.
 * Si l'email du user est dans ADMIN_EMAILS, il est reconnu admin (et le profil est mis à jour si besoin).
 */
export async function requireAdmin(
  getServerSupabase: () => Promise<SupabaseClient>
): Promise<{ ok: true; user: User; profile: { role: string; is_banned?: boolean } } | { ok: false; error: NextResponse }> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_banned")
    .eq("user_id", user.id)
    .single();

  const adminEmails = getAdminEmailsFromEnv();
  const emailLower = (user.email ?? "").toLowerCase();
  const isAdminByEmail = adminEmails.length > 0 && adminEmails.includes(emailLower);

  if (profile?.role === "admin" || isAdminByEmail) {
    if (isAdminByEmail && profile?.role !== "admin") {
      try {
        const admin = getSupabaseAdmin();
        await admin
          .from("profiles")
          .update({ role: "admin", email: user.email ?? undefined, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } catch {
        // ignore update error
      }
    }
    return {
      ok: true,
      user,
      profile: { role: "admin", is_banned: profile?.is_banned ?? false },
    };
  }

  return { ok: false, error: NextResponse.json({ error: "Réservé aux admins" }, { status: 403 }) };
}
