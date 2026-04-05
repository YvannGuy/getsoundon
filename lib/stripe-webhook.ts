import Stripe from "stripe";

import { handleStripeConnectAccountUpdated } from "@/lib/stripe-webhook-connect";
import { handleGsBookingCheckoutCompleted } from "@/lib/stripe-webhook-gs-booking";
import { handleGsOrderCheckoutCompleted } from "@/lib/stripe-webhook-gs-order";
import {
  handleCheckoutSessionAsyncPaymentFailed,
  handlePaymentIntentPaymentFailed,
} from "@/lib/stripe-webhook-payment-failed";

/**
 * Webhook Stripe — Lot E : branche `gs_booking` conservée ; `product_type=reservation` ignorée (décommission).
 */
export async function handleStripeWebhook(event: Stripe.Event) {
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

      if (productType === "gs_order" && metadata?.order_id && metadata?.user_id) {
        await handleGsOrderCheckoutCompleted(session, metadata);
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
        return { type: event.type, paymentIntentId: pi.id, ignored: true };
      }
      await handlePaymentIntentPaymentFailed(pi);
      return { type: event.type, paymentIntentId: pi.id };
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionAsyncPaymentFailed(session);
      return { type: event.type, sessionId: session.id };
    }
    case "account.updated": {
      await handleStripeConnectAccountUpdated(event);
      return { type: event.type, accountId: (event.data.object as Stripe.Account).id };
    }
    default:
      return { type: event.type, ignored: true };
  }
}
