import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import {
  sendGsBookingPaymentConfirmedLocataireEmail,
  sendGsBookingPaymentConfirmedPrestataireEmail,
} from "@/lib/email";
import {
  computeGsBookingCheckoutTotals,
  computeGsBookingPaymentSplit,
} from "@/lib/gs-booking-platform-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function gsBookingCautionHtmlLocataire(cents: number, hold: string): string | null {
  if (!cents || cents <= 0) return null;
  const eur = (cents / 100).toFixed(2);
  if (hold === "authorized") {
    return `<p>Une empreinte de <strong>caution</strong> de ${eur} EUR a été enregistrée sur votre moyen de paiement (aucun débit immédiat de ce montant en l’état).</p>`;
  }
  if (hold === "failed") {
    return `<p>La mise en place de la <strong>caution</strong> (${eur} EUR) n’a pas pu aboutir. Consultez le détail de votre réservation.</p>`;
  }
  return `<p>Une <strong>caution</strong> de ${eur} EUR est prévue ; son statut est visible depuis votre réservation.</p>`;
}

function gsBookingCautionHtmlPrestataire(cents: number, hold: string): string | null {
  if (!cents || cents <= 0) return null;
  const eur = (cents / 100).toFixed(2);
  if (hold === "authorized") {
    return `<p>Empreinte de <strong>caution / dépôt de garantie</strong> côté client en place (${eur} EUR), selon les règles de l’annonce.</p>`;
  }
  if (hold === "failed") {
    return `<p>L’empreinte de <strong>caution / dépôt de garantie</strong> (${eur} EUR) côté client n’a pas pu être finalisée.</p>`;
  }
  return `<p>Une <strong>caution</strong> de ${eur} EUR est prévue sur cette réservation ; le statut se met à jour automatiquement.</p>`;
}

/**
 * Paiement marketplace MVP (tables gs_bookings / gs_payments).
 * Montant toujours relu depuis la base ; metadata sert à lier session → booking.
 * Après paiement :
 *  - gs_bookings → accepted, PI, payout_due_at, deposit_hold, commission/net sur la location, service_fee_eur, checkout_total_eur
 *  - gs_payments → amount = total Checkout (location + frais service), traçabilité explicite
 *  - Si deposit_amount_cents > 0 → PaymentIntent d'autorisation (empreinte caution)
 */
export async function handleGsBookingCheckoutCompleted(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
): Promise<void> {
  const bookingId = metadata.booking_id;
  const userId = metadata.user_id;
  const payoutDueAt = metadata.payout_due_at ?? null;
  const depositReleaseDueAt = metadata.deposit_release_due_at ?? null;
  const depositAmountCents = parseInt(metadata.deposit_amount_cents ?? "0", 10);
  const providerStripeAccountId = metadata.provider_stripe_account_id ?? null;

  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("gs_bookings")
    .select("id, customer_id, provider_id, status, total_price, listing_id, end_date")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchError || !booking) {
    console.error("[webhook] gs_booking: booking introuvable", bookingId, fetchError?.message);
    return;
  }

  const row = booking as {
    id: string;
    customer_id: string;
    provider_id: string;
    status: string;
    total_price: number | string;
    listing_id: string;
    end_date: string;
  };

  if (row.customer_id !== userId) {
    console.error("[webhook] gs_booking: customer_id ne correspond pas", bookingId);
    return;
  }

  // Accepter les statuts "pending" (demande standard) et "accepted" (instant booking)
  if (row.status !== "pending" && row.status !== "accepted") {
    console.log("[webhook] gs_booking: deja traite ou statut", row.status, bookingId);
    return;
  }

  const totalEur = Number(row.total_price);
  if (!Number.isFinite(totalEur) || totalEur < 0) {
    console.error("[webhook] gs_booking: total_price invalide", bookingId);
    return;
  }

  let checkout: ReturnType<typeof computeGsBookingCheckoutTotals>;
  try {
    checkout = computeGsBookingCheckoutTotals(totalEur);
  } catch {
    console.error("[webhook] gs_booking: montants checkout invalides", bookingId);
    return;
  }

  const paidCents = session.amount_total ?? 0;
  const expectedCheckoutCents = checkout.checkoutTotalCents;
  const legacyLocationOnlyCents = checkout.grossCents;
  const isLegacyLocationOnly =
    paidCents === legacyLocationOnlyCents && paidCents !== expectedCheckoutCents;

  if (paidCents !== expectedCheckoutCents && !isLegacyLocationOnly) {
    console.error("[webhook] gs_booking: montant session != total attendu", {
      bookingId,
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
    console.error("[webhook] gs_booking: split commission impossible", bookingId);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const now = new Date().toISOString();

  // Calcul fallback des dates si absentes des metadata — policy produit J+2
  const resolvedPayoutDueAt =
    payoutDueAt ??
    new Date(new Date(`${row.end_date}T18:00:00.000Z`).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const resolvedDepositReleaseDueAt =
    depositReleaseDueAt ??
    new Date(new Date(`${row.end_date}T18:00:00.000Z`).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("gs_bookings")
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
      updated_at: now,
    })
    .eq("id", bookingId)
    .in("status", ["pending", "accepted"])
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
    console.error("[webhook] gs_booking: insert gs_payments", payError.message);
  } else {
    console.log("[webhook] gs_booking: paiement enregistre", bookingId);
  }

  // Sauvegarde du stripe_customer_id sur profiles si nouveau client (cohérent avec checkout-offer)
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
        console.log("[webhook] gs_booking: stripe_customer_id sauvegardé", sessionCustomerId);
      }
    } catch (custErr) {
      console.error("[webhook] gs_booking: erreur sauvegarde stripe_customer_id", custErr);
    }
  }

  // Création de l'empreinte caution si applicable
  if (depositAmountCents > 0 && providerStripeAccountId && paymentIntentId) {
    try {
      const stripe = getStripe();

      // Récupération de la PM du PaymentIntent pour le hold off-session
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
        console.error("[webhook] gs_booking: PM manquante sur PI, empreinte caution impossible", {
          bookingId,
          paymentIntentId,
        });
        await supabase
          .from("gs_bookings")
          .update({ deposit_hold_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", bookingId);
        // Ne pas return : les emails de confirmation de paiement doivent partir malgré l’échec de l’empreinte.
      } else if (!customerId) {
        console.error("[webhook] gs_booking: customer manquant sur PI, empreinte caution impossible", {
          bookingId,
          paymentIntentId,
          hint: "Vérifier que checkout-booking passe customer ou customer_creation:always",
        });
        await supabase
          .from("gs_bookings")
          .update({ deposit_hold_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", bookingId);
        // Ne pas return : idem.
      } else {

        const depositPi = await stripe.paymentIntents.create(
          {
            amount: depositAmountCents,
            currency: "eur",
            customer: customerId,
            payment_method: pmId,
            // hold seulement — pas de débit immédiat
            capture_method: "manual",
            confirm: true,
            off_session: true,
            metadata: {
              gs_booking_id: bookingId,
              deposit_type: "gs_booking",
              deposit_release_due_at: resolvedDepositReleaseDueAt,
            },
          },
          { idempotencyKey: `gs-deposit-hold-${bookingId}` }
        );

        const holdStatus = depositPi.status === "requires_capture" ? "authorized" : "failed";
        await supabase
          .from("gs_bookings")
          .update({
            deposit_payment_intent_id: depositPi.id,
            deposit_hold_status: holdStatus,
            deposit_amount_cents: depositAmountCents,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (holdStatus === "authorized") {
          console.log("[webhook] gs_booking: empreinte caution autorisée", {
            depositPiId: depositPi.id,
            depositAmountCents,
            bookingId,
          });
        } else {
          console.warn("[webhook] gs_booking: empreinte caution status inattendu", {
            depositPiId: depositPi.id,
            status: depositPi.status,
            bookingId,
          });
        }
      }
    } catch (depositErr) {
      console.error("[webhook] gs_booking: erreur empreinte caution", bookingId, depositErr);
      await supabase
        .from("gs_bookings")
        .update({ deposit_hold_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", bookingId);
    }
  } else if (depositAmountCents <= 0) {
    console.log("[webhook] gs_booking: pas de caution (deposit_amount_cents=0)", bookingId);
  }

  try {
    const siteBase = siteConfig.url.replace(/\/$/, "");
    const [{ data: listingRow }, { data: bookingFinal }, customerUserRes, providerUserRes] =
      await Promise.all([
        supabase.from("gs_listings").select("title").eq("id", row.listing_id).maybeSingle(),
        supabase
          .from("gs_bookings")
          .select("deposit_amount_cents, deposit_hold_status")
          .eq("id", bookingId)
          .maybeSingle(),
        supabase.auth.admin.getUserById(row.customer_id),
        supabase.auth.admin.getUserById(row.provider_id),
      ]);

    const title =
      (listingRow as { title?: string } | null)?.title?.trim() || "Annonce matériel";
    const locationEurStr = totalEur.toFixed(2);
    const checkoutTotalStr = checkoutTotalEur.toFixed(2);
    const serviceFeeStr = serviceFeeEur.toFixed(2);
    const finalB = bookingFinal as {
      deposit_amount_cents?: number | null;
      deposit_hold_status?: string | null;
    } | null;
    const depCents = Math.max(
      0,
      Number(finalB?.deposit_amount_cents ?? 0),
      depositAmountCents
    );
    const hold = String(finalB?.deposit_hold_status ?? "none");

    const locataireCaution = gsBookingCautionHtmlLocataire(depCents, hold);
    const prestataireCaution = gsBookingCautionHtmlPrestataire(depCents, hold);

    const customerEmail = customerUserRes.data?.user?.email ?? null;
    const providerEmail = providerUserRes.data?.user?.email ?? null;

    const emailTasks: Promise<{ success: boolean; error?: string }>[] = [];
    if (customerEmail) {
      emailTasks.push(
        sendGsBookingPaymentConfirmedLocataireEmail(
          customerEmail,
          title,
          checkoutTotalStr,
          `${siteBase}/dashboard/materiel/${bookingId}`,
          locataireCaution,
          isLegacyLocationOnly
            ? null
            : {
                locationEur: locationEurStr,
                serviceFeeEur: serviceFeeStr,
                totalEur: checkoutTotalStr,
              }
        )
      );
    }
    if (providerEmail) {
      emailTasks.push(
        sendGsBookingPaymentConfirmedPrestataireEmail(
          providerEmail,
          title,
          locationEurStr,
          `${siteBase}/proprietaire/materiel/${bookingId}`,
          prestataireCaution,
          {
            platformFeeEur: split.platformFeeEur.toFixed(2),
            providerNetEur: split.providerNetEur.toFixed(2),
            serviceFeePaidByCustomerEur: isLegacyLocationOnly ? undefined : serviceFeeStr,
            checkoutTotalEur: isLegacyLocationOnly ? undefined : checkoutTotalStr,
          }
        )
      );
    }
    if (emailTasks.length > 0) {
      const results = await Promise.allSettled(emailTasks);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error("[webhook] gs_booking: email confirmation", i, r.reason);
        } else if (!r.value.success) {
          console.warn("[webhook] gs_booking: email confirmation", i, r.value.error);
        }
      });
    }
  } catch (e) {
    console.error("[webhook] gs_booking: emails confirmation", e);
  }
}
