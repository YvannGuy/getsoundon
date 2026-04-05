import { NextResponse } from "next/server";

import { assertOwnerStripeConnectEligible } from "@/lib/auth/guards";
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
      limiterPrefix: "stripe-connect-login-link-user",
      max: 15,
    });
    if (tooMany) return tooMany;

    if (!(await assertOwnerStripeConnectEligible(user, supabase))) {
      return NextResponse.json(
        { error: "Réservé aux prestataires du catalogue matériel." },
        { status: 403 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    const accountId = (profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;

    if (!accountId) {
      return NextResponse.json(
        { error: "Activez d'abord les paiements pour accéder à votre espace Stripe." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("Stripe Connect login link error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'accès à l'espace Stripe." },
      { status: 500 }
    );
  }
}
