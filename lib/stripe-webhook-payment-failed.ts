import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import {
  sendGsDepositHoldFailedCustomerEmail,
  sendGsPaymentFailedCustomerEmail,
} from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paiement principal ou caution : métadonnées posées par `checkout-booking` / `checkout-order`
 * et par les webhooks d’empreinte (`deposit_type`).
 */
export async function handlePaymentIntentPaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const md = (pi.metadata ?? {}) as Record<string, string>;
  const bookingId = md.gs_booking_id?.trim();
  const orderId = md.gs_order_id?.trim();
  const depositType = md.deposit_type?.trim();

  if (!bookingId && !orderId) return;

  const admin = createAdminClient();
  const siteBase = siteConfig.url.replace(/\/$/, "");

  try {
    if (depositType === "gs_booking" && bookingId) {
      const { data: booking } = await admin
        .from("gs_bookings")
        .select("customer_id, listing_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (!booking) return;
      const b = booking as { customer_id: string; listing_id: string };
      const { data: auth } = await admin.auth.admin.getUserById(b.customer_id);
      const email = auth.user?.email?.trim();
      if (!email) return;
      let title = "Réservation matériel";
      const { data: lr } = await admin.from("gs_listings").select("title").eq("id", b.listing_id).maybeSingle();
      const t = (lr as { title?: string } | null)?.title?.trim();
      if (t) title = t;
      await sendGsDepositHoldFailedCustomerEmail(email, {
        contextLabel: title,
        bookingUrl: `${siteBase}/dashboard/materiel/${bookingId}`,
      });
      return;
    }

    if (depositType === "gs_order" && orderId) {
      const { data: order } = await admin.from("gs_orders").select("customer_id").eq("id", orderId).maybeSingle();
      if (!order) return;
      const customerId = (order as { customer_id: string }).customer_id;
      const { data: auth } = await admin.auth.admin.getUserById(customerId);
      const email = auth.user?.email?.trim();
      if (!email) return;
      await sendGsDepositHoldFailedCustomerEmail(email, {
        contextLabel: "Commande panier",
        bookingUrl: `${siteBase}/dashboard/materiel/orders/${orderId}`,
      });
      return;
    }

    if (bookingId && !depositType) {
      const { data: booking } = await admin
        .from("gs_bookings")
        .select("customer_id, listing_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (!booking) return;
      const b = booking as { customer_id: string; listing_id: string };
      const { data: auth } = await admin.auth.admin.getUserById(b.customer_id);
      const email = auth.user?.email?.trim();
      if (!email) return;
      let title = "Réservation matériel";
      const { data: lr } = await admin.from("gs_listings").select("title").eq("id", b.listing_id).maybeSingle();
      const lt = (lr as { title?: string } | null)?.title?.trim();
      if (lt) title = lt;
      await sendGsPaymentFailedCustomerEmail(email, {
        contextLabel: title,
        resumeUrl: `${siteBase}/dashboard/materiel/${bookingId}`,
      });
      return;
    }

    if (orderId && !depositType) {
      const { data: order } = await admin.from("gs_orders").select("customer_id").eq("id", orderId).maybeSingle();
      if (!order) return;
      const customerId = (order as { customer_id: string }).customer_id;
      const { data: auth } = await admin.auth.admin.getUserById(customerId);
      const email = auth.user?.email?.trim();
      if (!email) return;
      await sendGsPaymentFailedCustomerEmail(email, {
        contextLabel: "Votre commande panier",
        resumeUrl: `${siteBase}/dashboard/materiel/orders/${orderId}`,
      });
    }
  } catch (e) {
    console.error("[webhook] payment_intent.payment_failed", pi.id, e);
  }
}

/** Paiements différés (ex. SEPA) : session Checkout avec metadata produit GetSoundOn. */
export async function handleCheckoutSessionAsyncPaymentFailed(
  session: Stripe.Checkout.Session
): Promise<void> {
  const md = (session.metadata ?? {}) as Record<string, string>;
  const productType = md.product_type;
  const siteBase = siteConfig.url.replace(/\/$/, "");
  const admin = createAdminClient();

  try {
    if (productType === "gs_booking" && md.booking_id && md.user_id) {
      const bookingId = md.booking_id;
      const { data: booking } = await admin
        .from("gs_bookings")
        .select("listing_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (!booking) return;
      const listingId = (booking as { listing_id: string }).listing_id;
      const { data: auth } = await admin.auth.admin.getUserById(md.user_id);
      const email = auth.user?.email?.trim();
      if (!email) return;
      let title = "Réservation matériel";
      const { data: lr } = await admin.from("gs_listings").select("title").eq("id", listingId).maybeSingle();
      const lt = (lr as { title?: string } | null)?.title?.trim();
      if (lt) title = lt;
      await sendGsPaymentFailedCustomerEmail(email, {
        contextLabel: title,
        resumeUrl: `${siteBase}/dashboard/materiel/${bookingId}`,
      });
      return;
    }

    if (productType === "gs_order" && md.order_id && md.user_id) {
      const orderId = md.order_id;
      const { data: auth } = await admin.auth.admin.getUserById(md.user_id);
      const email = auth.user?.email?.trim();
      if (!email) return;
      await sendGsPaymentFailedCustomerEmail(email, {
        contextLabel: "Votre commande panier",
        resumeUrl: `${siteBase}/dashboard/materiel/orders/${orderId}`,
      });
    }
  } catch (e) {
    console.error("[webhook] checkout.session.async_payment_failed", session.id, e);
  }
}
