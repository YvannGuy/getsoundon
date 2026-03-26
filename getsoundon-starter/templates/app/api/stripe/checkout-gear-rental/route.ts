import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";

import { computePaymentProcessingFeeCents } from "@/lib/payment-processing-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Template getsoundon - inspire de:
 * app/api/stripe/checkout-offer/route.ts
 *
 * A adapter dans le nouveau projet:
 * - noms de tables/colonnes (rental_offers, gear_listings, profiles...)
 * - URLs success/cancel
 * - calcul de platform fee (config admin)
 */

const checkoutSchema = z.object({
  offerId: z.string().uuid(),
  acceptedContract: z.literal(true),
  acceptedTerms: z.literal(true),
  acceptanceVersion: z.string().min(1).max(40),
  acceptedAt: z.string().datetime().optional(),
});

async function getPlatformFeeCents(): Promise<number> {
  // TODO: brancher sur votre table de settings getsoundon.
  return 1500;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Connectez-vous pour payer cette offre." }, { status: 401 });
    }

    const body = await request.json();
    const { offerId, acceptanceVersion, acceptedAt } = checkoutSchema.parse(body);

    const admin = createAdminClient();

    const { data: offer, error: offerError } = await admin
      .from("rental_offers")
      .select(
        "id, conversation_id, owner_id, seeker_id, listing_id, amount_cents, payment_mode, upfront_amount_cents, balance_amount_cents, balance_due_at, deposit_amount_cents, expires_at, status"
      )
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    }

    const offerRow = offer as {
      id: string;
      seeker_id: string;
      owner_id: string;
      listing_id: string;
      amount_cents: number;
      payment_mode?: "full" | "split" | null;
      upfront_amount_cents?: number | null;
      balance_amount_cents?: number | null;
      balance_due_at?: string | null;
      deposit_amount_cents?: number | null;
      expires_at: string;
      status: "pending" | "paid" | "refused" | "expired";
    };

    if (offerRow.seeker_id !== user.id) {
      return NextResponse.json({ error: "Vous n'etes pas autorise a payer cette offre." }, { status: 403 });
    }

    if (offerRow.status !== "pending") {
      return NextResponse.json({ error: "Cette offre n'est plus payable." }, { status: 400 });
    }

    if (new Date(offerRow.expires_at) < new Date()) {
      await admin
        .from("rental_offers")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", offerId);
      return NextResponse.json({ error: "Cette offre a expire." }, { status: 400 });
    }

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", offerRow.owner_id)
      .single();

    const stripeAccountId = (ownerProfile as { stripe_account_id?: string | null } | null)
      ?.stripe_account_id;
    if (!stripeAccountId) {
      return NextResponse.json({ error: "Le provider n'a pas active les paiements." }, { status: 400 });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const capabilities = (account as Stripe.Account).capabilities;
    const canReceive =
      capabilities?.transfers === "active" || capabilities?.legacy_payments === "active";

    if (!canReceive) {
      return NextResponse.json(
        { error: "Le provider doit terminer sa configuration Stripe Connect." },
        { status: 400 }
      );
    }

    const paymentMode = offerRow.payment_mode === "split" ? "split" : "full";
    const amountCents = offerRow.amount_cents;
    const upfrontAmountCents =
      paymentMode === "split" ? Math.max(0, offerRow.upfront_amount_cents ?? 0) : amountCents;
    const balanceAmountCents =
      paymentMode === "split"
        ? Math.max(0, offerRow.balance_amount_cents ?? Math.max(0, amountCents - upfrontAmountCents))
        : 0;
    const chargeNowCents = paymentMode === "split" ? upfrontAmountCents : amountCents;
    if (chargeNowCents <= 0) {
      return NextResponse.json({ error: "Configuration de paiement invalide." }, { status: 400 });
    }

    const depositAmountCents = Math.max(0, offerRow.deposit_amount_cents ?? 0);
    const serviceFeeCents = await getPlatformFeeCents();
    const charge1BaseCents = chargeNowCents + serviceFeeCents;
    const processingFeeCents = computePaymentProcessingFeeCents(charge1BaseCents);
    const checkoutTotalCents = charge1BaseCents + processingFeeCents;
    const acceptedAtIso = acceptedAt ? new Date(acceptedAt).toISOString() : new Date().toISOString();

    // IMPORTANT: snapshot contract/terms pour audit legal.
    await admin
      .from("rental_offers")
      .update({
        contract_accepted_at: acceptedAtIso,
        contract_acceptance_version: acceptanceVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("status", "pending");

    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard/messaging?offer=paid`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard/messaging?offer=cancel`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Location materiel",
            description: paymentMode === "split" ? "Acompte de reservation" : "Montant de location",
          },
          unit_amount: chargeNowCents,
        },
        quantity: 1,
      },
    ];

    if (serviceFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Frais plateforme" },
          unit_amount: serviceFeeCents,
        },
        quantity: 1,
      });
    }

    if (processingFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Frais de traitement paiement" },
          unit_amount: processingFeeCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          offer_id: offerId,
          seeker_id: user.id,
          owner_id: offerRow.owner_id,
          payment_stage: paymentMode === "split" ? "deposit" : "full",
          payment_mode: paymentMode,
        },
      },
      metadata: {
        offer_id: offerId,
        user_id: user.id,
        product_type: "rental_order",
        amount_cents: String(chargeNowCents),
        reservation_total_cents: String(amountCents),
        upfront_amount_cents: String(upfrontAmountCents),
        balance_amount_cents: String(balanceAmountCents),
        balance_due_at: String(offerRow.balance_due_at ?? ""),
        payment_mode: paymentMode,
        payment_stage: paymentMode === "split" ? "deposit" : "full",
        deposit_amount_cents: String(depositAmountCents),
        service_fee_cents: String(serviceFeeCents),
        processing_fee_charge1_cents: String(processingFeeCents),
        checkout_total_cents: String(checkoutTotalCents),
        contract_acceptance_version: acceptanceVersion,
        contract_accepted_at: acceptedAtIso,
      },
      customer_email: user.email ?? undefined,
      customer_creation: "always",
    });

    await admin
      .from("rental_offers")
      .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", offerId);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    console.error("[checkout-gear-rental] error:", error);
    return NextResponse.json({ error: "Erreur lors de la creation du paiement." }, { status: 500 });
  }
}
