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
      .select("id, demande_id, owner_id, seeker_id, salle_id, amount_cents, expires_at, status")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    }

    const offerRow = offer as {
      seeker_id: string;
      owner_id: string;
      amount_cents: number;
      expires_at: string;
      status: string;
      demande_id: string;
      salle_id: string;
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
    const applicationFeeCents = Math.round(amountCents * 0.1);

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: stripeAccountId },
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
              description: "Paiement de l'offre acceptée",
            },
            unit_amount: amountCents,
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
