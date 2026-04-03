import Stripe from "stripe";

import { handleGsBookingCheckoutCompleted } from "@/lib/stripe-webhook-gs-booking";

const processedEventIds = new Map<string, number>();
const WEBHOOK_EVENT_TTL_MS = 1000 * 60 * 60 * 24;

function shouldProcessEvent(eventId: string): boolean {
  const now = Date.now();
  for (const [id, ts] of processedEventIds) {
    if (now - ts > WEBHOOK_EVENT_TTL_MS) {
      processedEventIds.delete(id);
    }
  }
  if (processedEventIds.has(eventId)) {
    return false;
  }
  processedEventIds.set(eventId, now);
  return true;
}

/**
 * Webhook Stripe — Lot E : branche `gs_booking` conservée ; `product_type=reservation` ignorée (décommission).
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  if (!shouldProcessEvent(event.id)) {
    return { type: event.type, ignored: true, reason: "duplicate_event" };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata as Record<string, string> | null;
      const productType = metadata?.product_type;

      if (productType === "gs_booking" && metadata?.booking_id && metadata?.user_id) {
        await handleGsBookingCheckoutCompleted(session, metadata);
        return {
          type: event.type,
          customerEmail: session.customer_details?.email ?? null,
          sessionId: session.id,
        };
      }

      if (productType === "reservation") {
        console.warn("[webhook] checkout.session.completed réservation legacy ignorée (décommission)", {
          sessionId: session.id,
          offer_id: metadata?.offer_id,
        });
        return {
          type: event.type,
          ignored: true,
          reason: "legacy_reservation_decommissioned",
          sessionId: session.id,
        };
      }

      console.log("[webhook] checkout.session.completed ignoré (metadata)", {
        productType: productType ?? null,
        sessionId: session.id,
      });
      return {
        type: event.type,
        ignored: true,
        sessionId: session.id,
      };
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const md = (pi.metadata ?? {}) as Record<string, string>;
      if (md.product_type === "reservation") {
        console.warn("[webhook] payment_intent.payment_failed réservation legacy ignoré", {
          paymentIntentId: pi.id,
        });
      }
      return { type: event.type, paymentIntentId: pi.id };
    }
    default:
      return { type: event.type, ignored: true };
  }
}
