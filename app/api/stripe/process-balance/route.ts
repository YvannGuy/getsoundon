import { NextResponse } from "next/server";

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
    .from("offers")
    .select(
      "id, owner_id, seeker_id, payment_mode, payment_plan_status, balance_amount_cents, balance_due_at, balance_retry_count, stripe_payment_intent_id, deposit_amount_cents, deposit_payment_intent_id, deposit_hold_status"
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
    deposit_amount_cents: number | null;
    deposit_payment_intent_id: string | null;
    deposit_hold_status: string | null;
  }[];

  const stripe = getStripe();
  let processed = 0;
  let paid = 0;
  let failed = 0;

  for (const offer of rows) {
    processed += 1;
    const balanceAmountCents = Math.max(0, offer.balance_amount_cents ?? 0);
    if (!offer.stripe_payment_intent_id || balanceAmountCents <= 0) {
      failed += 1;
      await admin
        .from("offers")
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
      const [{ data: ownerProfile }, initialPi] = await Promise.all([
        admin
          .from("profiles")
          .select("stripe_account_id")
          .eq("id", offer.owner_id)
          .single(),
        stripe.paymentIntents.retrieve(offer.stripe_payment_intent_id),
      ]);

      const stripeAccountId =
        (ownerProfile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
      const customerId =
        typeof initialPi.customer === "string" ? initialPi.customer : initialPi.customer?.id ?? null;
      const paymentMethodId =
        typeof initialPi.payment_method === "string"
          ? initialPi.payment_method
          : initialPi.payment_method?.id ?? null;

      if (!stripeAccountId || !customerId || !paymentMethodId) {
        throw new Error("Compte Stripe, customer ou moyen de paiement introuvable.");
      }

      const balancePi = await stripe.paymentIntents.create({
        amount: balanceAmountCents,
        currency: "eur",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        transfer_data: { destination: stripeAccountId },
        metadata: {
          offer_id: offer.id,
          seeker_id: offer.seeker_id,
          owner_id: offer.owner_id,
          payment_stage: "balance",
          payment_mode: "split",
          product_type: "reservation",
        },
      });

      let nextDepositPaymentIntentId = offer.deposit_payment_intent_id;
      let nextDepositHoldStatus = offer.deposit_hold_status ?? "none";
      const depositAmountCents = Math.max(0, offer.deposit_amount_cents ?? 0);
      const hasExistingDepositHold = !!offer.deposit_payment_intent_id;
      const shouldCreateDepositHold = depositAmountCents > 0 && !hasExistingDepositHold;

      if (shouldCreateDepositHold) {
        if (!customerId || !paymentMethodId) {
          nextDepositHoldStatus = "failed";
          console.warn("[balance] Caution non initialisée au solde: customer/payment_method manquant", {
            offerId: offer.id,
            hasCustomerId: !!customerId,
            hasPaymentMethodId: !!paymentMethodId,
          });
        } else {
          try {
            try {
              await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
            } catch {
              // Ignore already attached errors and proceed.
            }

            const depositPi = await stripe.paymentIntents.create({
              amount: depositAmountCents,
              currency: "eur",
              customer: customerId,
              payment_method: paymentMethodId,
              capture_method: "manual",
              confirm: true,
              off_session: true,
              description: `Empreinte caution offre ${offer.id} (au paiement du solde)`,
              metadata: {
                type: "deposit_hold",
                offer_id: offer.id,
                seeker_id: offer.seeker_id,
                owner_id: offer.owner_id,
                payment_stage: "balance",
                payment_mode: "split",
              },
            });

            nextDepositPaymentIntentId = depositPi.id;
            nextDepositHoldStatus =
              depositPi.status === "requires_capture" ? "authorized" : "failed";

            console.log("[balance] Empreinte caution créée au solde:", {
              offerId: offer.id,
              depositPaymentIntentId: depositPi.id,
              depositStatus: depositPi.status,
            });
          } catch (depositError) {
            nextDepositHoldStatus = "failed";
            console.error("[balance] Erreur création empreinte caution au solde:", depositError);
          }
        }
      }

      await admin
        .from("offers")
        .update({
          payment_plan_status: "fully_paid",
          balance_payment_intent_id: balancePi.id,
          balance_paid_at: new Date().toISOString(),
          deposit_status: depositAmountCents > 0 ? "held" : "none",
          deposit_payment_intent_id: nextDepositPaymentIntentId,
          deposit_hold_status: nextDepositHoldStatus,
          balance_last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      await admin.from("payments").insert({
        user_id: offer.seeker_id,
        stripe_session_id: balancePi.id,
        amount: balanceAmountCents,
        currency: "eur",
        product_type: "reservation",
        status: "paid",
        payment_type: "balance",
        offer_id: offer.id,
      });

      const { data: conv } = await admin
        .from("offers")
        .select("conversation_id")
        .eq("id", offer.id)
        .single();
      const conversationId = (conv as { conversation_id?: string } | null)?.conversation_id;
      if (conversationId) {
        const msgContent = `Le solde de la réservation (${(balanceAmountCents / 100).toFixed(2)} €) a été payé automatiquement.`;
        await admin.from("messages").insert({
          conversation_id: conversationId,
          sender_id: offer.seeker_id,
          content: msgContent,
        });
        await admin.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: msgContent,
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      }

      paid += 1;
    } catch (error) {
      failed += 1;
      const lastError = error instanceof Error ? error.message : "Erreur prélèvement solde.";
      const nextRetry = (offer.balance_retry_count ?? 0) + 1;
      await admin
        .from("offers")
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

export async function GET(request: Request) {
  return POST(request);
}
