import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { assertOwnerStripeConnectEligible } from "@/lib/auth/guards";
import { getStripe } from "@/lib/stripe";
import { rateLimitByKey } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const RETURN_BASE = "/proprietaire/paiement";

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
      limiterPrefix: "stripe-connect-onboarding-user",
      max: 10,
    });
    if (tooMany) return tooMany;

    if (!(await assertOwnerStripeConnectEligible(user, supabase))) {
      return NextResponse.json(
        { error: "Réservé aux prestataires du catalogue matériel." },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    const stripe = getStripe();
    let accountId = (profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        country: "FR",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });
      accountId = account.id;

      await adminSupabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteConfig.url}${RETURN_BASE}?connect=refresh`,
      return_url: `${siteConfig.url}${RETURN_BASE}?connect=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'activation des paiements." },
      { status: 500 }
    );
  }
}
