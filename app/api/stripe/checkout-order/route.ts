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
  orderId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Connectez-vous pour payer." }, { status: 401 });
    }

    const { orderId } = bodySchema.parse(await request.json());
    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
      .from("gs_orders")
      .select(
        "id, customer_id, provider_id, status, start_date, end_date, location_total_eur, deposit_amount_eur"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const row = order as {
      customer_id: string;
      provider_id: string | null;
      status: string;
      start_date: string | null;
      end_date: string | null;
      location_total_eur: number | string;
      deposit_amount_eur: number | string;
    };

    if (row.customer_id !== user.id) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (row.status !== "draft") {
      return NextResponse.json({ error: "Cette commande n'est plus payable depuis le panier." }, { status: 400 });
    }

    if (!row.provider_id || !row.start_date || !row.end_date) {
      return NextResponse.json({ error: "Panier incomplet (prestataire ou dates)." }, { status: 400 });
    }

    const { count } = await admin
      .from("gs_order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);

    if (!count || count < 1) {
      return NextResponse.json({ error: "Panier vide." }, { status: 400 });
    }

    const canReceive = await providerStripeCanReceivePayments(admin, row.provider_id);

    if (!canReceive) {
      return NextResponse.json(
        {
          error:
            "Le prestataire n'a pas encore activé les paiements ou doit finaliser son compte Stripe. Contacte-le pour continuer.",
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
        { error: "Compte Stripe du prestataire introuvable. Contacte le prestataire." },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const { data: customerProfile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    const existingStripeCustomerId =
      (customerProfile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;

    const totalEur = Number(row.location_total_eur);
    if (!Number.isFinite(totalEur) || totalEur <= 0) {
      return NextResponse.json({ error: "Montant de location invalide." }, { status: 400 });
    }

    let totals: ReturnType<typeof computeGsBookingCheckoutTotals>;
    try {
      totals = computeGsBookingCheckoutTotals(totalEur);
    } catch {
      return NextResponse.json({ error: "Montant de location invalide." }, { status: 400 });
    }

    const checkoutTotalCents = totals.checkoutTotalCents;
    const depositEur = Number(row.deposit_amount_eur ?? 0);
    const depositCents = Number.isFinite(depositEur) && depositEur > 0 ? Math.round(depositEur * 100) : 0;

    const endDate = new Date(`${row.end_date}T18:00:00.000Z`);
    const payoutDueAt = new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const depositReleaseDueAt = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const successUrl = `${siteConfig.url}/proprietaire/commandes/orders/${orderId}?paid=1`;
    const cancelUrl = `${siteConfig.url}/panier?orderCancel=1`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Location",
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
        setup_future_usage: "off_session",
        metadata: {
          gs_order_id: orderId,
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
        product_type: "gs_order",
        order_id: orderId,
        user_id: user.id,
        amount_cents: String(checkoutTotalCents),
        provider_id: row.provider_id,
        provider_stripe_account_id: stripeAccountId,
        deposit_amount_cents: String(depositCents),
        payout_due_at: payoutDueAt,
        deposit_release_due_at: depositReleaseDueAt,
        location_amount_cents: String(totals.grossCents),
        service_fee_cents: String(totals.serviceFeeCents),
        checkout_total_cents: String(checkoutTotalCents),
      },
      ...(existingStripeCustomerId
        ? { customer: existingStripeCustomerId }
        : {
            customer_email: user.email ?? undefined,
            customer_creation: "always" as const,
          }),
    });

    const { data: updated, error: updErr } = await admin
      .from("gs_orders")
      .update({
        status: "pending_payment",
        stripe_checkout_session_id: session.id,
      })
      .eq("id", orderId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (updErr || !updated) {
      console.error("[checkout-order] impossible de verrouiller la commande", updErr?.message);
      return NextResponse.json(
        { error: "Impossible de démarrer le paiement (commande déjà en cours ou modifiée)." },
        { status: 409 }
      );
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "order_checkout_session_created",
      properties: {
        order_id: orderId,
        start_date: row.start_date,
        end_date: row.end_date,
        checkout_total_eur: checkoutTotalCents / 100,
        deposit_eur: depositCents / 100,
        item_count: count,
        stripe_session_id: session.id,
      },
    });
    await posthog.shutdown();

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    console.error("[checkout-order]", error);
    return NextResponse.json({ error: "Erreur lors de la création du paiement." }, { status: 500 });
  }
}
