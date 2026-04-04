import { NextResponse } from "next/server";

import { getProviderNetTransferCents } from "@/lib/gs-booking-platform-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/cron/auth";

/**
 * Cron — Versement Connect des prestataires (réservations matériel `gs_bookings`).
 * Échéance : `payout_due_at` (calculée fin de location + 2 jours en checkout).
 * Montant transféré : net prestataire (~85 % du brut), pas le montant total encaissé.
 * Conditions : status accepted|completed, payout pending|scheduled|blocked, pas d’incident bloquant, etc.
 */
export async function POST(request: Request) {
  const authorized = await verifyCronRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const stripe = getStripe();
  const nowIso = new Date().toISOString();

  const { data: bookings } = await admin
    .from("gs_bookings")
    .select(
      "id, provider_id, customer_id, total_price, provider_net_eur, payout_due_at, payout_status, stripe_payment_intent_id, incident_status, deposit_claim_status"
    )
    .in("status", ["accepted", "completed"])
    .in("payout_status", ["pending", "scheduled", "blocked"])
    .lte("payout_due_at", nowIso)
    .not("payout_due_at", "is", null)
    .limit(100);

  let paid = 0;
  let blocked = 0;
  let skipped = 0;

  for (const raw of bookings ?? []) {
    const row = raw as {
      id: string;
      provider_id: string;
      customer_id: string;
      total_price: number | string;
      provider_net_eur?: number | string | null;
      payout_status: string | null;
      stripe_payment_intent_id: string | null;
      incident_status: string | null;
      deposit_claim_status: string | null;
    };

    // Incident ouvert → bloquer le payout
    if (row.incident_status === "open") {
      blocked += 1;
      await admin
        .from("gs_bookings")
        .update({ payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    // Incident resolved mais décision caution pas encore prise → bloquer
    if (row.deposit_claim_status === "pending_capture") {
      blocked += 1;
      await admin
        .from("gs_bookings")
        .update({ payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    if (!row.stripe_payment_intent_id) {
      skipped += 1;
      continue;
    }

    const payoutAmountCents = getProviderNetTransferCents(row);
    if (payoutAmountCents === null || payoutAmountCents <= 0) {
      blocked += 1;
      await admin
        .from("gs_bookings")
        .update({ payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    const { data: providerProfile } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", row.provider_id)
      .maybeSingle();

    const stripeAccountId =
      (providerProfile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      blocked += 1;
      await admin
        .from("gs_bookings")
        .update({ payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    try {
      const paidAt = new Date().toISOString();
      const transfer = await stripe.transfers.create(
        {
          amount: payoutAmountCents,
          currency: "eur",
          destination: stripeAccountId,
          metadata: {
            gs_booking_id: row.id,
            provider_id: row.provider_id,
            customer_id: row.customer_id,
            source: "cron_payout_gs_bookings",
          },
          description: `Versement net prestataire (J+2 fin location) ${row.id}`,
        },
        { idempotencyKey: `payout-gs-bookings-${row.id}` }
      );

      await admin
        .from("gs_bookings")
        .update({
          payout_status: "paid",
          payout_transfer_id: transfer.id,
          payout_paid_at: paidAt,
          updated_at: paidAt,
        })
        .eq("id", row.id);

      paid += 1;
    } catch (error) {
      console.error("[payout-gs-bookings] transfer error", row.id, error);
      blocked += 1;
      await admin
        .from("gs_bookings")
        .update({ payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: (bookings ?? []).length,
    paid,
    blocked,
    skipped,
  });
}
