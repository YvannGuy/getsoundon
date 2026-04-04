import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { computeGsBookingCheckoutTotals } from "@/lib/gs-booking-platform-fee";
import { getPostHogClient } from "@/lib/posthog-server";
import { providerStripeCanReceivePayments } from "@/lib/gs-provider-stripe-connect";
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

    const canReceive = await providerStripeCanReceivePayments(admin, row.provider_id);

    if (!canReceive) {
      return NextResponse.json(
        {
          error:
            "Le prestataire n'a pas encore activé les paiements ou doit finaliser son compte Stripe. Veuillez le contacter.",
        },
        { status: 400 }
      );
    }

    const { data: providerProfileForConnect } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", row.provider_id)
      .maybeSingle();
    const stripeAccountId =
      (providerProfileForConnect as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Compte Stripe du prestataire introuvable. Veuillez le contacter." },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Récupération du stripe_customer_id existant du locataire (même pattern que checkout-offer)
    const { data: customerProfile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    const existingStripeCustomerId =
      (customerProfile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;

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

    let totals: ReturnType<typeof computeGsBookingCheckoutTotals>;
    try {
      totals = computeGsBookingCheckoutTotals(totalEur);
    } catch {
      return NextResponse.json({ error: "Montant de reservation invalide." }, { status: 400 });
    }

    const checkoutTotalCents = totals.checkoutTotalCents;
    const depositEur = Number(row.deposit_amount ?? 0);
    const depositCents = Number.isFinite(depositEur) && depositEur > 0 ? Math.round(depositEur * 100) : 0;

    if (depositCents > 0) {
      console.log("[checkout-booking] caution demandée", { bookingId, depositCents });
    }

    // Calcul de la date de versement J+2 après la fin de location (policy produit)
    const endDate = new Date(`${row.end_date}T18:00:00.000Z`);
    const payoutDueAt = new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const depositReleaseDueAt = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const successUrl = `${siteConfig.url}/proprietaire/commandes?paid=1&bookingId=${bookingId}`;
    const cancelUrl = `${siteConfig.url}/items/${row.listing_id}?bookingCancel=1`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Location — ${listingTitle}`,
            description: `${row.start_date} → ${row.end_date}`,
          },
          unit_amount: totals.grossCents,
        },
        quantity: 1,
      },
    ];
    if (totals.serviceFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de service",
            description: "Traitement sécurisé du paiement et fonctionnement de la plateforme",
          },
          unit_amount: totals.serviceFeeCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        // setup_future_usage: "off_session" enregistre la PM pour l'empreinte caution hors-session
        setup_future_usage: "off_session",
        metadata: {
          gs_booking_id: bookingId,
          provider_id: row.provider_id,
          provider_stripe_account_id: stripeAccountId,
          deposit_amount_cents: String(depositCents),
          payout_due_at: payoutDueAt,
          deposit_release_due_at: depositReleaseDueAt,
          location_amount_cents: String(totals.grossCents),
          service_fee_cents: String(totals.serviceFeeCents),
          checkout_total_cents: String(checkoutTotalCents),
        },
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: "gs_booking",
        booking_id: bookingId,
        user_id: user.id,
        amount_cents: String(checkoutTotalCents),
        listing_id: row.listing_id,
        provider_id: row.provider_id,
        provider_stripe_account_id: stripeAccountId,
        deposit_amount_cents: String(depositCents),
        payout_due_at: payoutDueAt,
        deposit_release_due_at: depositReleaseDueAt,
        location_amount_cents: String(totals.grossCents),
        service_fee_cents: String(totals.serviceFeeCents),
        checkout_total_cents: String(checkoutTotalCents),
      },
      // Customer attaché ou créé pour garantir pi.customer non-null dans le webhook (empreinte caution)
      ...(existingStripeCustomerId
        ? { customer: existingStripeCustomerId }
        : {
            customer_email: user.email ?? undefined,
            customer_creation: "always" as const,
          }),
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "booking_checkout_session_created",
      properties: {
        booking_id: bookingId,
        listing_id: row.listing_id,
        listing_title: listingTitle,
        start_date: row.start_date,
        end_date: row.end_date,
        checkout_total_eur: checkoutTotalCents / 100,
        deposit_eur: depositCents / 100,
        stripe_session_id: session.id,
      },
    });
    await posthog.shutdown();

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    console.error("[checkout-booking]", error);
    return NextResponse.json({ error: "Erreur lors de la creation du paiement." }, { status: 500 });
  }
}
