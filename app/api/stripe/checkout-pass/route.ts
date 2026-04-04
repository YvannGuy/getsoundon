import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { siteConfig } from "@/config/site";
import { getPostHogClient } from "@/lib/posthog-server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const checkoutPassSchema = z.object({
  passType: z.enum(["pass_24h", "pass_48h", "abonnement"]),
  returnBase: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Connectez-vous pour acheter un Pass." }, { status: 401 });
    }

    const body = await request.json();
    const { passType, returnBase } = checkoutPassSchema.parse(body);
    const base = returnBase || "/dashboard/paiement";

    const settings = await getPlatformSettings();
    const pass = settings.pass;

    const config: Record<string, { price: number; enabled: boolean; name: string; description: string }> = {
      pass_24h: {
        price: pass.price_24h,
        enabled: pass.pass_24h_enabled,
        name: "Pass 24h",
        description: "Demandes illimitées pendant 24 heures",
      },
      pass_48h: {
        price: pass.price_48h,
        enabled: pass.pass_48h_enabled,
        name: "Pass 48h",
        description: "Demandes illimitées pendant 48 heures",
      },
      abonnement: {
        price: pass.price_abonnement,
        enabled: pass.abonnement_enabled,
        name: "Abonnement mensuel",
        description: "Accès prioritaire illimité",
      },
    };

    const plan = config[passType];
    if (!plan?.enabled) {
      return NextResponse.json({ error: "Ce Pass n'est pas disponible." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const stripe = getStripe();
    const isSubscription = passType === "abonnement";
    const priceId = process.env.STRIPE_PRICE_ABONNEMENT;

    if (isSubscription && !priceId) {
      return NextResponse.json(
        { error: "Abonnement non configuré. Définissez STRIPE_PRICE_ABONNEMENT dans les variables d'environnement." },
        { status: 500 }
      );
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = isSubscription
      ? {
          mode: "subscription",
          line_items: [{ price: priceId!, quantity: 1 }],
          success_url: `${siteConfig.url}${base}?checkout=success`,
          cancel_url: `${siteConfig.url}${base}?checkout=cancel`,
          metadata: { user_id: user.id, product_type: passType },
          subscription_data: { metadata: { user_id: user.id, product_type: passType } },
          ...(profile?.stripe_customer_id
            ? { customer: profile.stripe_customer_id }
            : { customer_email: user.email ?? undefined }),
        }
      : {
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: { name: plan.name, description: plan.description },
                unit_amount: plan.price,
              },
              quantity: 1,
            },
          ],
          success_url: `${siteConfig.url}${base}?checkout=success`,
          cancel_url: `${siteConfig.url}${base}?checkout=cancel`,
          metadata: { user_id: user.id, product_type: passType },
          payment_intent_data: { setup_future_usage: "off_session" },
          ...(profile?.stripe_customer_id
            ? { customer: profile.stripe_customer_id }
            : { customer_email: user.email ?? undefined }),
        };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "pass_checkout_session_created",
      properties: {
        pass_type: passType,
        pass_name: plan.name,
        price_cents: plan.price,
        is_subscription: isSubscription,
        stripe_session_id: session.id,
      },
    });
    await posthog.shutdown();

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la création de la session Stripe." }, { status: 500 });
  }
}
