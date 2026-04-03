import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

/**
 * Même règle que `checkout-booking` : le prestataire peut encaisser uniquement si
 * les capacités Stripe Connect sont actives (transfers ou legacy_payments).
 */
export async function providerStripeCanReceivePayments(
  admin: SupabaseClient,
  providerUserId: string,
): Promise<boolean> {
  const { data: providerProfile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", providerUserId)
    .maybeSingle();

  const stripeAccountId =
    (providerProfile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;

  if (!stripeAccountId) return false;

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const capabilities = (account as Stripe.Account).capabilities;
    return capabilities?.transfers === "active" || capabilities?.legacy_payments === "active";
  } catch (e) {
    console.error("[gs-provider-stripe-connect] retrieve account:", e);
    return false;
  }
}
