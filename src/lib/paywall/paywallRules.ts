/**
 * Règles d'affichage du paywall (non agressif, max 1/jour).
 * Afficher seulement quand l'utilisateur tente une action verrouillée.
 */

const PAYWALL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface PaywallProfile {
  last_paywall_shown_at: string | null;
  paywall_show_count_today?: number;
  paywall_show_day?: string | null;
}

/** Retourne true si on peut afficher le paywall (max 1 fois par 24h). */
export function canShowPaywall(profile: PaywallProfile | null): boolean {
  if (!profile) return true;
  const last = profile.last_paywall_shown_at ? new Date(profile.last_paywall_shown_at).getTime() : 0;
  return Date.now() - last >= PAYWALL_COOLDOWN_MS;
}
