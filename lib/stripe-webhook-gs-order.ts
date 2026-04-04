import type Stripe from "stripe";

import {
  computeGsBookingCheckoutTotals,
  computeGsBookingPaymentSplit,
} from "@/lib/gs-booking-platform-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paiement commande panier (`gs_orders` + `gs_order_payments`).
 * Flux distinct de `gs_booking` : metadata `product_type=gs_order`.
 * Caution : empreinte séparée via `deposit_amount_cents` (max des lignes), comme les réservations unitaires.
 */
export async function handleGsOrderCheckoutCompleted(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
): Promise<void> {
  const orderId = metadata.order_id;
  const userId = metadata.user_id;
  const payoutDueAt = metadata.payout_due_at ?? null;
  const depositReleaseDueAt = metadata.deposit_release_due_at ?? null;
  const depositAmountCents = parseInt(metadata.deposit_amount_cents ?? "0", 10);
  const providerStripeAccountId = metadata.provider_stripe_account_id ?? null;

  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("gs_orders")
    .select(
      "id, customer_id, provider_id, status, location_total_eur, start_date, end_date, deposit_amount_eur"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError || !order) {
    console.error("[webhook] gs_order: commande introuvable", orderId, fetchError?.message);
    return;
  }

  const row = order as {
    id: string;
    customer_id: string;
    provider_id: string | null;
    status: string;
    location_total_eur: number | string;
    start_date: string;
    end_date: string;
    deposit_amount_eur: number | string;
  };

  if (row.customer_id !== userId) {
    console.error("[webhook] gs_order: customer_id ne correspond pas", orderId);
    return;
  }

  if (row.status !== "draft" && row.status !== "pending_payment") {
    console.log("[webhook] gs_order: déjà traité ou statut", row.status, orderId);
    return;
  }

  const totalEur = Number(row.location_total_eur);
  if (!Number.isFinite(totalEur) || totalEur < 0) {
    console.error("[webhook] gs_order: location_total_eur invalide", orderId);
    return;
  }

  let checkout: ReturnType<typeof computeGsBookingCheckoutTotals>;
  try {
    checkout = computeGsBookingCheckoutTotals(totalEur);
  } catch {
    console.error("[webhook] gs_order: montants checkout invalides", orderId);
    return;
  }

  const paidCents = session.amount_total ?? 0;
  const expectedCheckoutCents = checkout.checkoutTotalCents;
  const legacyLocationOnlyCents = checkout.grossCents;
  const isLegacyLocationOnly =
    paidCents === legacyLocationOnlyCents && paidCents !== expectedCheckoutCents;

  if (paidCents !== expectedCheckoutCents && !isLegacyLocationOnly) {
    console.error("[webhook] gs_order: montant session != total attendu", {
      orderId,
      paidCents,
      expectedCheckoutCents,
      legacyLocationOnlyCents,
    });
    return;
  }

  const serviceFeeEur = isLegacyLocationOnly ? 0 : checkout.serviceFeeEur;
  const checkoutTotalEur = isLegacyLocationOnly ? totalEur : checkout.checkoutTotalEur;

  let split: ReturnType<typeof computeGsBookingPaymentSplit>;
  try {
    split = computeGsBookingPaymentSplit(totalEur);
  } catch {
    console.error("[webhook] gs_order: split commission impossible", orderId);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const now = new Date().toISOString();

  const resolvedPayoutDueAt =
    payoutDueAt ??
    new Date(new Date(`${row.end_date}T18:00:00.000Z`).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const resolvedDepositReleaseDueAt =
    depositReleaseDueAt ??
    new Date(new Date(`${row.end_date}T18:00:00.000Z`).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("gs_orders")
    .update({
      status: "accepted",
      stripe_payment_intent_id: paymentIntentId,
      payout_due_at: resolvedPayoutDueAt,
      deposit_release_due_at: resolvedDepositReleaseDueAt,
      payout_status: "pending",
      platform_fee_eur: split.platformFeeEur,
      provider_net_eur: split.providerNetEur,
      service_fee_eur: serviceFeeEur,
      checkout_total_eur: checkoutTotalEur,
      stripe_checkout_session_id: null,
      updated_at: now,
    })
    .eq("id", orderId)
    .in("status", ["draft", "pending_payment"])
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[webhook] gs_order: update commande", updateError.message);
    return;
  }
  if (!updated) {
    console.log("[webhook] gs_order: concurrence / déjà payé", orderId);
    return;
  }

  const { error: payError } = await supabase.from("gs_order_payments").insert({
    order_id: orderId,
    amount: checkoutTotalEur,
    status: "paid",
    stripe_payment_id: paymentIntentId ?? session.id,
    platform_fee_eur: split.platformFeeEur,
    provider_net_eur: split.providerNetEur,
    service_fee_eur: serviceFeeEur,
    checkout_total_eur: checkoutTotalEur,
    updated_at: now,
  });

  if (payError) {
    console.error("[webhook] gs_order: insert gs_order_payments", payError.message);
  } else {
    console.log("[webhook] gs_order: paiement enregistré", orderId);
  }

  const sessionCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (sessionCustomerId) {
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single();
      if (!(existingProfile as { stripe_customer_id?: string } | null)?.stripe_customer_id) {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: sessionCustomerId })
          .eq("id", userId);
        console.log("[webhook] gs_order: stripe_customer_id sauvegardé", sessionCustomerId);
      }
    } catch (custErr) {
      console.error("[webhook] gs_order: erreur sauvegarde stripe_customer_id", custErr);
    }
  }

  if (depositAmountCents > 0 && providerStripeAccountId && paymentIntentId) {
    try {
      const stripe = getStripe();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
      const pmId =
        typeof pi.payment_method === "string"
          ? pi.payment_method
          : (pi.payment_method as { id?: string } | null)?.id ?? null;

      const customerId =
        typeof pi.customer === "string" ? pi.customer : (pi.customer as { id?: string } | null)?.id ?? null;

      if (!pmId) {
        console.error("[webhook] gs_order: PM manquante sur PI, empreinte caution impossible", {
          orderId,
          paymentIntentId,
        });
        await supabase
          .from("gs_orders")
          .update({ deposit_hold_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId);
        return;
      }

      if (!customerId) {
        console.error("[webhook] gs_order: customer manquant sur PI, empreinte caution impossible", {
          orderId,
          paymentIntentId,
        });
        await supabase
          .from("gs_orders")
          .update({ deposit_hold_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId);
        return;
      }

      const depositPi = await stripe.paymentIntents.create(
        {
          amount: depositAmountCents,
          currency: "eur",
          customer: customerId,
          payment_method: pmId,
          capture_method: "manual",
          confirm: true,
          off_session: true,
          metadata: {
            gs_order_id: orderId,
            deposit_type: "gs_order",
            deposit_release_due_at: resolvedDepositReleaseDueAt,
          },
        },
        { idempotencyKey: `gs-order-deposit-hold-${orderId}` }
      );

      const holdStatus = depositPi.status === "requires_capture" ? "authorized" : "failed";
      await supabase
        .from("gs_orders")
        .update({
          deposit_payment_intent_id: depositPi.id,
          deposit_hold_status: holdStatus,
          deposit_amount_cents: depositAmountCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (holdStatus === "authorized") {
        console.log("[webhook] gs_order: empreinte caution autorisée", {
          depositPiId: depositPi.id,
          depositAmountCents,
          orderId,
        });
      }
    } catch (depositErr) {
      console.error("[webhook] gs_order: erreur empreinte caution", orderId, depositErr);
      await supabase
        .from("gs_orders")
        .update({ deposit_hold_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }
  } else if (depositAmountCents <= 0) {
    console.log("[webhook] gs_order: pas de caution (deposit_amount_cents=0)", orderId);
  }
}
