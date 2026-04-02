import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  bookingId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Connectez-vous pour payer cette reservation." }, { status: 401 });
    }

    const { bookingId } = bodySchema.parse(await request.json());
    const admin = createAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("gs_bookings")
      .select("id, customer_id, provider_id, status, total_price, start_date, end_date, listing_id, deposit_amount")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Reservation introuvable." }, { status: 404 });
    }

    const row = booking as {
      customer_id: string;
      provider_id: string;
      status: string;
      total_price: number | string;
      start_date: string;
      end_date: string;
      listing_id: string;
      deposit_amount: number | string | null;
    };

    if (row.customer_id !== user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas payer cette reservation." }, { status: 403 });
    }

    // "pending" = demande standard ; "accepted" = instant booking (confirmation directe)
    if (row.status !== "pending" && row.status !== "accepted") {
      return NextResponse.json(
        { error: "Cette reservation n'est plus payable." },
        { status: 400 }
      );
    }

    // Vérification Stripe Connect du provider
    const { data: providerProfile } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", row.provider_id)
      .maybeSingle();

    const stripeAccountId =
      (providerProfile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Le prestataire n'a pas encore activé les paiements. Veuillez le contacter." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const capabilities = (account as Stripe.Account).capabilities;
    const canReceive =
      capabilities?.transfers === "active" || capabilities?.legacy_payments === "active";

    if (!canReceive) {
      return NextResponse.json(
        {
          error:
            "Le prestataire doit finaliser la configuration de son compte de paiement avant de pouvoir accepter des réservations.",
        },
        { status: 400 }
      );
    }

    const { data: listingRow } = await admin
      .from("gs_listings")
      .select("title")
      .eq("id", row.listing_id)
      .maybeSingle();

    const listingTitle = (listingRow as { title?: string } | null)?.title ?? "Location materiel";

    const totalEur = Number(row.total_price);
    if (!Number.isFinite(totalEur) || totalEur <= 0) {
      return NextResponse.json({ error: "Montant de reservation invalide." }, { status: 400 });
    }

    const totalCents = Math.round(totalEur * 100);
    const depositEur = Number(row.deposit_amount ?? 0);
    const depositCents = Number.isFinite(depositEur) && depositEur > 0 ? Math.round(depositEur * 100) : 0;

    // Calcul de la date de versement J+3 après la fin de location
    const endDate = new Date(`${row.end_date}T18:00:00.000Z`);
    const payoutDueAt = new Date(endDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const depositReleaseDueAt = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const successUrl = `${siteConfig.url}/items/${row.listing_id}?bookingPaid=1&bookingId=${bookingId}`;
    const cancelUrl = `${siteConfig.url}/items/${row.listing_id}?bookingCancel=1`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Reservation — ${listingTitle}`,
            description: `${row.start_date} → ${row.end_date}`,
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          gs_booking_id: bookingId,
          provider_id: row.provider_id,
          provider_stripe_account_id: stripeAccountId,
          deposit_amount_cents: String(depositCents),
          payout_due_at: payoutDueAt,
          deposit_release_due_at: depositReleaseDueAt,
        },
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: "gs_booking",
        booking_id: bookingId,
        user_id: user.id,
        amount_cents: String(totalCents),
        listing_id: row.listing_id,
        provider_id: row.provider_id,
        provider_stripe_account_id: stripeAccountId,
        deposit_amount_cents: String(depositCents),
        payout_due_at: payoutDueAt,
        deposit_release_due_at: depositReleaseDueAt,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    console.error("[checkout-booking]", error);
    return NextResponse.json({ error: "Erreur lors de la creation du paiement." }, { status: 500 });
  }
}
