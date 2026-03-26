import { NextResponse } from "next/server";

import { computePaymentProcessingFeeCents } from "@/lib/payment-processing-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_RETRIES = 3;

function isAuthorized(request: Request): boolean {
  const secret = process.env.STRIPE_BALANCE_CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${secret}`;
}

async function processBalances() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: offers } = await admin
    .from("rental_offers")
    .select(
      "id, owner_id, seeker_id, payment_mode, payment_plan_status, balance_amount_cents, balance_due_at, balance_retry_count, stripe_payment_intent_id"
    )
    .eq("status", "paid")
    .eq("payment_mode", "split")
    .in("payment_plan_status", ["balance_scheduled", "balance_failed"])
    .lte("balance_due_at", nowIso)
    .lt("balance_retry_count", MAX_RETRIES)
    .order("balance_due_at", { ascending: true })
    .limit(50);

  const rows = (offers ?? []) as {
    id: string;
    owner_id: string;
    seeker_id: string;
    payment_mode: "split";
    payment_plan_status: string;
    balance_amount_cents: number | null;
    balance_due_at: string | null;
    balance_retry_count: number | null;
    stripe_payment_intent_id: string | null;
  }[];

  const stripe = getStripe();
  let processed = 0;
  let paid = 0;
  let failed = 0;

  for (const offer of rows) {
    processed += 1;
    const balanceAmountCents = Math.max(0, offer.balance_amount_cents ?? 0);
    const processingFeeCents = computePaymentProcessingFeeCents(balanceAmountCents);
    const chargeTotalCents = balanceAmountCents + processingFeeCents;

    if (!offer.stripe_payment_intent_id || balanceAmountCents <= 0) {
      failed += 1;
      await admin
        .from("rental_offers")
        .update({
          payment_plan_status: "balance_failed",
          balance_last_error: "Paiement initial introuvable ou solde nul.",
          balance_retry_count: (offer.balance_retry_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id);
      continue;
    }

    try {
      const initialPi = await stripe.paymentIntents.retrieve(offer.stripe_payment_intent_id);
      const customerId =
        typeof initialPi.customer === "string" ? initialPi.customer : initialPi.customer?.id ?? null;
      const paymentMethodId =
        typeof initialPi.payment_method === "string"
          ? initialPi.payment_method
          : initialPi.payment_method?.id ?? null;

      if (!customerId || !paymentMethodId) {
        throw new Error("Customer ou moyen de paiement introuvable.");
      }

      const balancePi = await stripe.paymentIntents.create({
        amount: chargeTotalCents,
        currency: "eur",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          offer_id: offer.id,
          seeker_id: offer.seeker_id,
          owner_id: offer.owner_id,
          payment_stage: "balance",
          payment_mode: "split",
          product_type: "rental_order",
        },
      });

      await admin
        .from("rental_offers")
        .update({
          payment_plan_status: "fully_paid",
          balance_payment_intent_id: balancePi.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      await admin.from("rental_payments").insert({
        user_id: offer.seeker_id,
        stripe_session_id: balancePi.id,
        amount: chargeTotalCents,
        currency: "eur",
        product_type: "rental_order",
        status: "paid",
        payment_type: "balance",
        offer_id: offer.id,
      });

      paid += 1;
    } catch (error) {
      failed += 1;
      const lastError = error instanceof Error ? error.message : "Erreur prelevement solde.";
      const nextRetry = (offer.balance_retry_count ?? 0) + 1;
      await admin
        .from("rental_offers")
        .update({
          payment_plan_status: nextRetry >= MAX_RETRIES ? "expired_unpaid" : "balance_failed",
          balance_last_error: lastError,
          balance_retry_count: nextRetry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id);
    }
  }

  return { processed, paid, failed };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processBalances();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 }
    );
  }
}
