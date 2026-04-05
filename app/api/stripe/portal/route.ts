import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { getStripe } from "@/lib/stripe";
import { rateLimitByKey } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const tooMany = await rateLimitByKey(user.id, {
      limiterPrefix: "stripe-portal-user",
      max: 20,
    });
    if (tooMany) return tooMany;

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Aucun compte Stripe associé. Effectuez un achat pour enregistrer votre carte." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteConfig.url}/dashboard/paiement`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'accès à l'espace gestion." },
      { status: 500 }
    );
  }
}
