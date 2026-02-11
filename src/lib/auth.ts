/**
 * Helpers d'autorisation côté serveur. Ne jamais se baser uniquement sur le client.
 */

export type ProfileRole = "user" | "admin" | "super_admin";

export interface ProfileRow {
  role: ProfileRole;
  user_id?: string;
  email?: string | null;
}

export interface SubscriptionForAccess {
  status: string;
  plan: string;
  ends_at?: string | null;
  source?: string | null;
}

/** true si le profil a le rôle admin */
export function isAdmin(profile: ProfileRow | null): boolean {
  return profile?.role === "admin" || profile?.role === "super_admin";
}

/** true si le profil a le rôle super admin */
export function isSuperAdmin(profile: ProfileRow | null): boolean {
  return profile?.role === "super_admin";
}

/**
 * true si l'utilisateur a un abonnement actif (starter/pro/elite/lifetime).
 * status === 'active' et plan dans ('starter', 'pro', 'elite', 'business', 'lifetime').
 */
export function hasActiveSubscription(sub: SubscriptionForAccess | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  return ["starter", "pro", "elite", "business", "lifetime"].includes(sub.plan);
}

/**
 * true si accès à vie (plan lifetime, actif, pas de date de fin).
 */
export function hasLifetimeAccess(sub: SubscriptionForAccess | null): boolean {
  if (!sub) return false;
  return sub.plan === "lifetime" && sub.status === "active";
}
