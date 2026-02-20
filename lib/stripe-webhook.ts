import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata as Record<string, string> | null;
      const productType = metadata?.product_type;

      if (
        productType &&
        ["pass_24h", "pass_48h", "abonnement"].includes(productType) &&
        metadata?.user_id
      ) {
        const amount = session.amount_total ?? 0;
        const supabase = createAdminClient();
        await supabase.from("payments").insert({
          user_id: metadata.user_id,
          stripe_session_id: session.id,
          amount,
          currency: session.currency ?? "eur",
          product_type: productType,
          status: "paid",
        });
        const customerId = session.customer as string | null;
        if (customerId) {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", metadata.user_id);
        }
      }

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
