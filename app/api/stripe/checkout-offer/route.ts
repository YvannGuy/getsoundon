import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const checkoutOfferSchema = z.object({
  offerId: z.string().uuid(),
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
    const { offerId } = checkoutOfferSchema.parse(body);

    const adminSupabase = createAdminClient();

    const { data: offer, error: offerError } = await adminSupabase
      .from("offers")
      .select("id, demande_id, owner_id, seeker_id, salle_id, amount_cents, deposit_amount_cents, service_fee_cents, expires_at, status, event_type")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    }

    const offerRow = offer as {
      seeker_id: string;
      owner_id: string;
      amount_cents: number;
      deposit_amount_cents?: number | null;
      service_fee_cents?: number | null;
      expires_at: string;
      status: string;
      demande_id: string;
      salle_id: string;
      event_type: string | null;
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

    const amountCents = offerRow.amount_cents;
    const depositAmountCents = Math.max(0, offerRow.deposit_amount_cents ?? 0);
    const serviceFeeCents = Math.max(0, offerRow.service_fee_cents ?? 1500);
    const applicationFeeCents = serviceFeeCents;
    const checkoutTotalCents = amountCents + serviceFeeCents;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: stripeAccountId },
        setup_future_usage: "off_session",
        metadata: {
          offer_id: offerId,
          seeker_id: user.id,
          owner_id: offerRow.owner_id,
        },
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Réservation - ${salleName}`,
              description: "Montant de location",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Frais de service",
              description: "Frais fixes de plateforme",
            },
            unit_amount: serviceFeeCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteConfig.url}/dashboard/messagerie?demandeId=${offerRow.demande_id}&offer=paid`,
      cancel_url: `${siteConfig.url}/dashboard/messagerie?demandeId=${offerRow.demande_id}&offer=cancel`,
      metadata: {
        offer_id: offerId,
        user_id: user.id,
        product_type: "reservation",
        amount_cents: String(amountCents),
        deposit_amount_cents: String(depositAmountCents),
        service_fee_cents: String(serviceFeeCents),
        checkout_total_cents: String(checkoutTotalCents),
      },
      ...((seekerProfile as { stripe_customer_id?: string } | null)?.stripe_customer_id
        ? { customer: (seekerProfile as { stripe_customer_id: string }).stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
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
