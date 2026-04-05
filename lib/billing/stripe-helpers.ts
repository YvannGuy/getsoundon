/**
 * Stripe côté serveur uniquement — webhook, Checkout, Connect.
 * Ne pas importer depuis des composants client.
 */

import "server-only";

import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

/**
 * Construit un événement webhook Stripe à partir du corps brut et de la signature.
 * @throws si signature ou secret manquant, ou si la signature est invalide.
 */
export function constructStripeWebhookEvent(
  rawBody: string,
  signature: string | null,
  webhookSecret: string | undefined,
): Stripe.Event {
  if (!signature || !webhookSecret) {
    throw new Error("stripe_webhook_missing_signature_or_secret");
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export { getStripe } from "@/lib/stripe";
