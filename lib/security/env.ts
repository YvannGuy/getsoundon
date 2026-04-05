/**
 * Rappels sur les variables d’environnement sensibles (documentation + vérifs légères).
 * Ne fait pas échouer le build en dev si une clé manque : utiliser les guards au point d’usage (getStripe, etc.).
 */

import "server-only";

/** Préfixes interdits pour des secrets (anti-régression). */
export const FORBIDDEN_PUBLIC_ENV_PREFIXES = [
  "STRIPE_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE",
  "RESEND_API_KEY",
  "CRON_SECRET",
] as const;

/**
 * À appeler depuis un script CI ou un healthcheck : vérifie qu’aucune clé sensible n’est exposée en NEXT_PUBLIC_*.
 * En runtime Next, seules les clés présentes dans process.env sont visibles.
 */
export function assertNoLeakedSecretsInPublicEnv(env: NodeJS.ProcessEnv = process.env): void {
  for (const key of Object.keys(env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    const upper = key.toUpperCase();
    for (const bad of FORBIDDEN_PUBLIC_ENV_PREFIXES) {
      if (upper.includes(bad)) {
        throw new Error(`Variable d'environnement dangereuse : ${key} ne doit pas être NEXT_PUBLIC`);
      }
    }
  }
}
