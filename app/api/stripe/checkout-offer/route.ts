import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { computePaymentProcessingFeeCents } from "@/lib/payment-processing-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getPlatformFeeCents(params: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  eventType: "ponctuel" | "mensuel";
}): Promise<number> {
  const { adminSupabase, eventType } = params;
  const defaultCommission = { fixed_fee_cents: 1500, ponctuel: true, mensuel: false };

  const { data } = await (adminSupabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "commission")
    .maybeSingle();

  const raw = (data as { value?: Record<string, unknown> } | null)?.value ?? {};
  const fixedFeeValue = Number(raw.fixed_fee_cents);
  const fixedFeeCents = Number.isFinite(fixedFeeValue)
    ? Math.max(0, Math.round(fixedFeeValue))
    : defaultCommission.fixed_fee_cents;
  const enabledPonctuel =
    typeof raw.ponctuel === "boolean" ? raw.ponctuel : defaultCommission.ponctuel;
  const enabledMensuel =
    typeof raw.mensuel === "boolean" ? raw.mensuel : defaultCommission.mensuel;
  const isEnabled = eventType === "mensuel" ? enabledMensuel : enabledPonctuel;
  if (!isEnabled) return 0;
  return fixedFeeCents;
}

const checkoutOfferSchema = z.object({
  offerId: z.string().uuid(),
  acceptedContract: z.literal(true),
  acceptedCgv: z.literal(true),
  acceptanceVersion: z.string().min(1).max(40),
  acceptedAt: z.string().datetime().optional(),
});

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
    const { offerId, acceptedContract, acceptedCgv, acceptanceVersion, acceptedAt } =
      checkoutOfferSchema.parse(body);

    const adminSupabase = createAdminClient();

    const { data: offer, error: offerError } = await adminSupabase
      .from("offers")
      .select("id, conversation_id, demande_id, owner_id, seeker_id, salle_id, amount_cents, payment_mode, upfront_amount_cents, balance_amount_cents, balance_due_at, deposit_amount_cents, service_fee_cents, expires_at, status, event_type, cancellation_policy")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    }

    const offerRow = offer as {
      seeker_id: string;
      owner_id: string;
      amount_cents: number;
      payment_mode?: "full" | "split" | null;
      upfront_amount_cents?: number | null;
      balance_amount_cents?: number | null;
      balance_due_at?: string | null;
      deposit_amount_cents?: number | null;
      service_fee_cents?: number | null;
      expires_at: string;
      status: string;
      demande_id: string | null;
      conversation_id: string;
      salle_id: string;
      event_type: string | null;
      cancellation_policy?: "strict" | "moderate" | "flexible" | null;
    };

    if (offerRow.seeker_id !== user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à payer cette offre." }, { status: 403 });
    }

    if (offerRow.status !== "pending") {
      return NextResponse.json(
        { error: offerRow.status === "paid" ? "Cette offre a déjà été payée." : "Cette offre n'est plus disponible." },
        { status: 400 }
      );
    }
    const acceptedAtIso = acceptedAt ? new Date(acceptedAt).toISOString() : new Date().toISOString();
    const policyLabel =
      offerRow.cancellation_policy === "moderate"
        ? "moderee"
        : offerRow.cancellation_policy === "flexible"
          ? "flexible"
          : "stricte";
    const contractSnapshot = [
      `accept_contract=${acceptedContract ? "yes" : "no"}`,
      `accept_cgv=${acceptedCgv ? "yes" : "no"}`,
      `policy=${policyLabel}`,
      "milestones=J-7_solde,48h_incident,J+3_versement,J+7_liberation_caution",
    ].join(";");
    await adminSupabase
      .from("offers")
      .update({
        contract_accepted_at: acceptedAtIso,
        contract_acceptance_version: acceptanceVersion,
        contract_terms_snapshot: contractSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("status", "pending");

    if (new Date(offerRow.expires_at) < new Date()) {
      await adminSupabase
        .from("offers")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", offerId);
      return NextResponse.json({ error: "Cette offre a expiré." }, { status: 400 });
    }

    const { data: ownerProfile } = await adminSupabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", offerRow.owner_id)
      .single();

    const stripeAccountId = (ownerProfile as { stripe_account_id?: string | null } | null)?.stripe_account_id;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Le propriétaire n'a pas encore activé les paiements." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const capabilities = (account as Stripe.Account).capabilities;
    const canReceive = capabilities?.transfers === "active" || capabilities?.legacy_payments === "active";
    if (!canReceive) {
      return NextResponse.json(
        {
          error:
            "Le propriétaire doit terminer la configuration de son compte de paiement (identité, coordonnées bancaires) avant de pouvoir recevoir des paiements.",
        },
        { status: 400 }
      );
    }

    const { data: salle } = await adminSupabase
      .from("salles")
      .select("name")
      .eq("id", offerRow.salle_id)
      .single();

    const salleName = (salle as { name?: string } | null)?.name ?? "Réservation";

    const { data: seekerProfile } = await adminSupabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const paymentMode = offerRow.payment_mode === "split" ? "split" : "full";
    const amountCents = offerRow.amount_cents;
    const upfrontAmountCents =
      paymentMode === "split"
        ? Math.max(0, offerRow.upfront_amount_cents ?? 0)
        : amountCents;
    const balanceAmountCents =
      paymentMode === "split"
        ? Math.max(0, offerRow.balance_amount_cents ?? Math.max(0, amountCents - upfrontAmountCents))
        : 0;
    const chargeNowCents = paymentMode === "split" ? upfrontAmountCents : amountCents;
    if (chargeNowCents <= 0) {
      return NextResponse.json(
        { error: "Configuration de paiement invalide sur cette offre." },
        { status: 400 }
      );
    }
    const depositAmountCents = Math.max(0, offerRow.deposit_amount_cents ?? 0);
    const serviceFeeCents = await getPlatformFeeCents({
      adminSupabase,
      eventType: offerRow.event_type === "mensuel" ? "mensuel" : "ponctuel",
    });
    if (offerRow.service_fee_cents !== serviceFeeCents) {
      await adminSupabase
        .from("offers")
        .update({ service_fee_cents: serviceFeeCents, updated_at: new Date().toISOString() })
        .eq("id", offerId);
    }
    const charge1BaseCents = chargeNowCents + serviceFeeCents;
    const processingFeeCharge1Cents = computePaymentProcessingFeeCents(charge1BaseCents);
    const checkoutTotalCents = charge1BaseCents + processingFeeCharge1Cents;
    let demandeParam = offerRow.demande_id;
    if (!demandeParam) {
      const { data: conv } = await adminSupabase
        .from("conversations")
        .select("demande_visite_id")
        .eq("id", offerRow.conversation_id)
        .maybeSingle();
      const demandeVisiteId =
        (conv as { demande_visite_id?: string | null } | null)?.demande_visite_id ?? null;
      if (demandeVisiteId) {
        demandeParam = `visite-${demandeVisiteId}`;
      }
    }
    const successUrl = demandeParam
      ? `${siteConfig.url}/dashboard/messagerie?demandeId=${demandeParam}&offer=paid`
      : `${siteConfig.url}/dashboard/messagerie?offer=paid`;
    const cancelUrl = demandeParam
      ? `${siteConfig.url}/dashboard/messagerie?demandeId=${demandeParam}&offer=cancel`
      : `${siteConfig.url}/dashboard/messagerie?offer=cancel`;

    const existingStripeCustomerId =
      (seekerProfile as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Réservation - ${salleName}`,
            description:
              paymentMode === "split"
                ? "Acompte de réservation"
                : "Montant de location",
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
          product_data: {
            name: "Frais plateforme",
            description: "Frais calculés selon les paramètres admin",
          },
          unit_amount: serviceFeeCents,
        },
        quantity: 1,
      });
    }
    if (processingFeeCharge1Cents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de traitement paiement",
            description: "Calculés sur la charge de paiement",
          },
          unit_amount: processingFeeCharge1Cents,
        },
        quantity: 1,
      });
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
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
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        offer_id: offerId,
        user_id: user.id,
        product_type: "reservation",
        amount_cents: String(chargeNowCents),
        reservation_total_cents: String(amountCents),
        upfront_amount_cents: String(upfrontAmountCents),
        balance_amount_cents: String(balanceAmountCents),
        balance_due_at: String(offerRow.balance_due_at ?? ""),
        payment_mode: paymentMode,
        payment_stage: paymentMode === "split" ? "deposit" : "full",
        deposit_amount_cents: String(depositAmountCents),
        service_fee_cents: String(serviceFeeCents),
        processing_fee_charge1_cents: String(processingFeeCharge1Cents),
        checkout_total_cents: String(checkoutTotalCents),
        cancellation_policy: offerRow.cancellation_policy ?? "strict",
        contract_acceptance_version: acceptanceVersion,
        contract_accepted_at: acceptedAtIso,
      },
      ...(existingStripeCustomerId
        ? { customer: existingStripeCustomerId }
        : {
            customer_email: user.email ?? undefined,
            customer_creation: "always" as const,
          }),
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    await adminSupabase
      .from("offers")
      .update({ stripe_session_id: session.id })
      .eq("id", offerId);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    console.error("Checkout offer error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement." },
      { status: 500 }
    );
  }
}
