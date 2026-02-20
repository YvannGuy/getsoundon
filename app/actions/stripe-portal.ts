"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export type PaymentMethodInfo = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export async function getPaymentMethods(userId: string): Promise<PaymentMethodInfo[]> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.stripe_customer_id) return [];

  try {
    const stripe = getStripe();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: "card",
    });
    return (paymentMethods.data ?? []).map((pm) => {
      const card = pm.card;
      return {
        id: pm.id,
        brand: card?.brand ?? "card",
        last4: card?.last4 ?? "****",
        expMonth: card?.exp_month ?? 0,
        expYear: card?.exp_year ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();
  return profile?.stripe_customer_id ?? null;
}
