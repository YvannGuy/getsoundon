import { NextResponse } from "next/server";

import { handleStripeWebhook } from "@/lib/stripe-webhook";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Signature webhook manquante." }, { status: 400 });
  }

  try {
    const body = await request.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const result = await handleStripeWebhook(event);
    return NextResponse.json({ received: true, result });
  } catch {
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }
}
