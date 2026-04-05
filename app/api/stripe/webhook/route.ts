import { NextResponse } from "next/server";

import { constructStripeWebhookEvent } from "@/lib/billing/stripe-helpers";
import { handleStripeWebhook } from "@/lib/stripe-webhook";
import {
  isStripeWebhookEventRecorded,
  recordStripeWebhookEventProcessed,
} from "@/lib/stripe-webhook-store";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("[webhook] Manquant: signature ou STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Signature webhook manquante." }, { status: 400 });
  }

  let event: ReturnType<typeof constructStripeWebhookEvent>;
  try {
    const body = await request.text();
    event = constructStripeWebhookEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Corps ou signature invalide:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }

  if (await isStripeWebhookEventRecorded(event.id)) {
    return NextResponse.json({ received: true, ignored: true, reason: "duplicate_event" });
  }

  try {
    const result = await handleStripeWebhook(event);
    await recordStripeWebhookEventProcessed(event.id, event.type);
    if (event.type === "checkout.session.completed") {
      console.log("[webhook] checkout.session.completed traité", result);
    }
    return NextResponse.json({ received: true, result });
  } catch (handlerErr) {
    console.error("[webhook] Erreur traitement:", handlerErr instanceof Error ? handlerErr.message : String(handlerErr));
    return NextResponse.json({ error: "Erreur traitement webhook." }, { status: 500 });
  }
}
