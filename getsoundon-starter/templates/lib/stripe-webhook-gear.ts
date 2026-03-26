import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Template minimal getsoundon.
 * A completer avec:
 * - generation contrat/facture
 * - notifications email/telegram
 * - gestion caution avancée (capture/release selon incidents)
 */
export async function handleStripeWebhookGear(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = (session.metadata ?? {}) as Record<string, string>;
      const productType = metadata.product_type;

      if (productType !== "rental_order" || !metadata.offer_id || !metadata.user_id) {
        return { type: event.type, ignored: true };
      }

      const admin = createAdminClient();
      const offerId = metadata.offer_id;
      const now = new Date().toISOString();
      const amountTotal = session.amount_total ?? 0;
      const paymentMode = metadata.payment_mode === "split" ? "split" : "full";
      const paymentStage = metadata.payment_stage === "deposit" ? "deposit" : "full";

      // Idempotence: un seul webhook gagne si l'offre est encore pending.
      const { data: updatedOffer, error: updateError } = await admin
        .from("rental_offers")
        .update({
          status: "paid",
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          payment_plan_status: paymentMode === "split" ? "balance_scheduled" : "fully_paid",
          updated_at: now,
        })
        .eq("id", offerId)
        .eq("status", "pending")
        .select("id, conversation_id")
        .maybeSingle();

      if (updateError || !updatedOffer) {
        return { type: event.type, offerId, skipped: true };
      }

      await admin.from("rental_payments").insert({
        offer_id: offerId,
        user_id: metadata.user_id,
        stripe_session_id: session.id,
        amount: amountTotal,
        currency: session.currency ?? "eur",
        product_type: "rental_order",
        payment_type: paymentStage === "deposit" ? "deposit" : "full",
        status: "paid",
      });

      const convId = (updatedOffer as { conversation_id?: string | null }).conversation_id;
      if (convId) {
        const msg =
          paymentStage === "deposit"
            ? "Acompte paye. Le solde sera preleve automatiquement a l'echeance."
            : "Paiement confirme pour la location.";
        await admin.from("rental_messages").insert({
          conversation_id: convId,
          sender_id: metadata.user_id,
          content: msg,
        });
        await admin
          .from("rental_conversations")
          .update({
            last_message_at: now,
            last_message_preview: msg,
            updated_at: now,
          })
          .eq("id", convId);
      }

      return { type: event.type, offerId, sessionId: session.id };
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const metadata = (pi.metadata ?? {}) as Record<string, string>;
      if (metadata.product_type !== "rental_order" || !metadata.offer_id) {
        return { type: event.type, ignored: true };
      }

      const admin = createAdminClient();
      await admin
        .from("rental_offers")
        .update({
          payment_plan_status: "balance_failed",
          balance_last_error:
            pi.last_payment_error?.message ?? "Echec de paiement Stripe.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", metadata.offer_id);

      return { type: event.type, offerId: metadata.offer_id, paymentIntentId: pi.id };
    }

    default:
      return { type: event.type, ignored: true };
  }
}
