/**
 * Clés d’idempotence pour éviter double traitement (webhooks, jobs).
 */

import "server-only";

export function stripeWebhookIdempotencyKey(eventId: string): string {
  return `stripe:event:${eventId}`;
}
