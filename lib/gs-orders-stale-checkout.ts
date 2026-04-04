import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Si une session Checkout Stripe est expirée, repasse la commande en `draft` pour permettre un nouveau paiement.
 * Session encore `open` : on laisse `pending_payment` (le client peut reprendre le lien depuis une future UI).
 */
export async function refreshStaleGsOrderCheckoutSession(customerId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("gs_orders")
    .select("id, stripe_checkout_session_id")
    .eq("customer_id", customerId)
    .eq("status", "pending_payment")
    .maybeSingle();

  const row = order as { id: string; stripe_checkout_session_id: string | null } | null;
  if (!row?.stripe_checkout_session_id) return;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
    if (session.status === "expired") {
      await admin
        .from("gs_orders")
        .update({ stripe_checkout_session_id: null, status: "draft" })
        .eq("id", row.id)
        .eq("status", "pending_payment");
    }
  } catch (e) {
    console.warn("[gs-orders-stale-checkout] retrieve session", e);
  }
}
