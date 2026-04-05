import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Email de livraison des notifications transactionnelles.
 *
 * **Source de vérité** : `supabase.auth.admin.getUserById` (même approche que
 * `lib/stripe-webhook-gs-booking.ts` pour les confirmations de paiement).
 * L’email d’auth est la référence pour les comptes ; `profiles.email` peut
 * diverger si la synchro n’est pas garantie partout.
 */
export async function getAuthUserEmail(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email?.trim()) {
    if (error) {
      console.warn("[auth-user-email] getUserById", userId, error.message);
    }
    return null;
  }
  return data.user.email.trim();
}
