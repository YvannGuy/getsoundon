import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

/**
 * Cache court après un retrieve Stripe réussi : réduit la latence des GET fiche / bookings
 * sans changer la vérité métier (les capacités Connect changent rarement).
 * Erreurs réseau/API : pas de mise en cache (comportement inchangé).
 */
const STRIPE_CAPABILITY_CACHE_TTL_MS = 90_000;
const stripeCapabilityCache = new Map<string, { value: boolean; expiresAt: number }>();

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

  const now = Date.now();
  const cached = stripeCapabilityCache.get(stripeAccountId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const capabilities = (account as Stripe.Account).capabilities;
    const ok =
      capabilities?.transfers === "active" || capabilities?.legacy_payments === "active";
    stripeCapabilityCache.set(stripeAccountId, {
      value: ok,
      expiresAt: now + STRIPE_CAPABILITY_CACHE_TTL_MS,
    });
    return ok;
  } catch (e) {
    console.error("[gs-provider-stripe-connect] retrieve account:", e);
    return false;
  }
}
