import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paiement marketplace MVP (tables gs_bookings / gs_payments).
 * Montant toujours relu depuis la base ; metadata sert à lier session → booking.
 */
export async function handleGsBookingCheckoutCompleted(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
): Promise<void> {
  const bookingId = metadata.booking_id;
  const userId = metadata.user_id;
  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("gs_bookings")
    .select("id, customer_id, status, total_price, listing_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchError || !booking) {
    console.error("[webhook] gs_booking: booking introuvable", bookingId, fetchError?.message);
    return;
  }

  const row = booking as {
    id: string;
    customer_id: string;
    status: string;
    total_price: number | string;
    listing_id: string;
  };

  if (row.customer_id !== userId) {
    console.error("[webhook] gs_booking: customer_id ne correspond pas", bookingId);
    return;
  }

  if (row.status !== "pending") {
    console.log("[webhook] gs_booking: deja traite ou statut", row.status, bookingId);
    return;
  }

  const totalEur = Number(row.total_price);
  if (!Number.isFinite(totalEur) || totalEur < 0) {
    console.error("[webhook] gs_booking: total_price invalide", bookingId);
    return;
  }

  const expectedCents = Math.round(totalEur * 100);
  const paidCents = session.amount_total ?? 0;
  if (paidCents !== expectedCents) {
    console.error("[webhook] gs_booking: montant session != total booking", {
      bookingId,
      paidCents,
      expectedCents,
    });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("gs_bookings")
    .update({ status: "accepted", updated_at: now })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[webhook] gs_booking: update booking", updateError.message);
    return;
  }
  if (!updated) {
    console.log("[webhook] gs_booking: concurrence / deja paye", bookingId);
    return;
  }

  const { error: payError } = await supabase.from("gs_payments").insert({
    booking_id: bookingId,
    amount: totalEur,
    status: "paid",
    stripe_payment_id: paymentIntentId ?? session.id,
    updated_at: now,
  });

  if (payError) {
    console.error("[webhook] gs_booking: insert gs_payments", payError.message);
  } else {
    console.log("[webhook] gs_booking: paiement enregistre", bookingId);
  }
}
