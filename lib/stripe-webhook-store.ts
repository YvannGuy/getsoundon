import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retourne true si l'event a déjà été vu (inséré en base), sinon l'enregistre et retourne false.
 */
export async function isDuplicateStripeEvent(eventId: string, eventType: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_webhook_events")
    .insert({ id: eventId, type: eventType })
    .select("id")
    .maybeSingle();

  if (!error) return false;
  // 23505 = violation de contrainte d'unicité (duplicate key)
  if (error.code === "23505") return true;
  // En cas d'erreur DB autre, on choisit de traiter l'event (ne pas bloquer Stripe)
  return false;
}
