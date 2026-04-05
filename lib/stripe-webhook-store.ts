import { createAdminClient } from "@/lib/supabase/admin";

/**
 * True si l’événement est déjà enregistré comme traité (évite doubles effets sur retry / livraisons multiples Stripe).
 */
export async function isStripeWebhookEventRecorded(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[webhook] isStripeWebhookEventRecorded", error.message);
    return false;
  }
  return !!data;
}

/**
 * Enregistre l’événement après traitement réussi. Les retries Stripe avec le même `id` seront ignorés en amont.
 * 23505 = déjà inséré (concurrence) — ignoré.
 */
export async function recordStripeWebhookEventProcessed(eventId: string, eventType: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({ id: eventId, type: eventType });
  if (error && error.code !== "23505") {
    console.error("[webhook] recordStripeWebhookEventProcessed", error.message);
    throw new Error(`stripe_webhook_record_failed:${error.message}`);
  }
}
