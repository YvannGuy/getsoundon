import { NextResponse } from "next/server";

import { handleStripeWebhook } from "@/lib/stripe-webhook";
import { isDuplicateStripeEvent } from "@/lib/stripe-webhook-store";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("[webhook] Manquant: signature ou STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Signature webhook manquante." }, { status: 400 });
  }

  try {
    const body = await request.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const duplicate = await isDuplicateStripeEvent(event.id, event.type);
    if (duplicate) {
      return NextResponse.json({ received: true, ignored: true, reason: "duplicate_event" });
    }

    const result = await handleStripeWebhook(event);
    if (event.type === "checkout.session.completed") {
      console.log("[webhook] checkout.session.completed traité", result);
    }
    return NextResponse.json({ received: true, result });
  } catch (err) {
    console.error("[webhook] Erreur:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }
}
