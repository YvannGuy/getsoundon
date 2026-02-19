import Stripe from "stripe";

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: event.type,
        customerEmail: session.customer_details?.email ?? null,
        sessionId: session.id,
      };
    }
    default:
      return { type: event.type, ignored: true };
  }
}
