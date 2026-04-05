import Stripe from "stripe";

import { handleStripeConnectAccountUpdated } from "@/lib/stripe-webhook-connect";
import { handleGsBookingCheckoutCompleted } from "@/lib/stripe-webhook-gs-booking";
import { handleGsOrderCheckoutCompleted } from "@/lib/stripe-webhook-gs-order";
import {
  handleCheckoutSessionAsyncPaymentFailed,
  handlePaymentIntentPaymentFailed,
} from "@/lib/stripe-webhook-payment-failed";

type CheckoutDispatchResult = Record<string, unknown>;

/**
 * Routage commun quand la session Checkout est réellement payée (carte immédiate ou async finalisé).
 */
async function dispatchPaidCheckoutSession(
  session: Stripe.Checkout.Session,
  sourceEventType: string,
): Promise<CheckoutDispatchResult> {
  const metadata = session.metadata as Record<string, string> | null;
  const productType = metadata?.product_type;

  if (productType === "gs_booking" && metadata?.booking_id && metadata?.user_id) {
    await handleGsBookingCheckoutCompleted(session, metadata);
    return {
      type: sourceEventType,
      customerEmail: session.customer_details?.email ?? null,
      sessionId: session.id,
    };
  }

  if (productType === "gs_order" && metadata?.order_id && metadata?.user_id) {
    await handleGsOrderCheckoutCompleted(session, metadata);
    return {
      type: sourceEventType,
      customerEmail: session.customer_details?.email ?? null,
      sessionId: session.id,
    };
  }

  if (productType === "reservation") {
    console.warn("[webhook] checkout session réservation legacy ignorée (décommission)", {
      sessionId: session.id,
      offer_id: metadata?.offer_id,
      sourceEventType,
    });
    return {
      type: sourceEventType,
      ignored: true,
      reason: "legacy_reservation_decommissioned",
      sessionId: session.id,
    };
  }

  console.log("[webhook] checkout session ignorée (metadata)", {
    productType: productType ?? null,
    sessionId: session.id,
    sourceEventType,
  });
  return {
    type: sourceEventType,
    ignored: true,
    sessionId: session.id,
  };
}

/**
 * Webhook Stripe — Lot E : branche `gs_booking` conservée ; `product_type=reservation` ignorée (décommission).
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode !== "payment") {
        console.log("[webhook] checkout.session.completed ignoré (mode)", session.mode, session.id);
        return {
          type: event.type,
          ignored: true,
          reason: "checkout_mode_not_payment",
          sessionId: session.id,
        };
      }

      const paymentStatus = session.payment_status;
      if (paymentStatus === "unpaid") {
        console.log("[webhook] checkout.session.completed — paiement différé en attente (async)", session.id);
        return {
          type: event.type,
          ignored: true,
          reason: "checkout_async_payment_pending",
          sessionId: session.id,
        };
      }

      if (paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
        console.log("[webhook] checkout.session.completed ignoré (payment_status)", paymentStatus, session.id);
        return {
          type: event.type,
          ignored: true,
          reason: `payment_status_${paymentStatus ?? "unknown"}`,
          sessionId: session.id,
        };
      }

      return dispatchPaidCheckoutSession(session, event.type);
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode !== "payment") {
        console.log("[webhook] async_payment_succeeded ignoré (mode)", session.mode, session.id);
        return {
          type: event.type,
          ignored: true,
          reason: "checkout_mode_not_payment",
          sessionId: session.id,
        };
      }

      const ps = session.payment_status;
      if (ps !== "paid" && ps !== "no_payment_required") {
        console.warn("[webhook] async_payment_succeeded statut inattendu", ps, session.id);
        return {
          type: event.type,
          ignored: true,
          reason: `payment_status_${ps ?? "unknown"}`,
          sessionId: session.id,
        };
      }

      return dispatchPaidCheckoutSession(session, event.type);
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
