import { NextResponse } from "next/server";
import { z } from "zod";

import { pricingPlans, siteConfig } from "@/config/site";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  planId: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId } = checkoutSchema.parse(body);

    const selectedPlan = pricingPlans.find((plan) => plan.id === planId);
    if (!selectedPlan?.priceId) {
      return NextResponse.json({ error: "Plan invalide ou non configuré." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      success_url: `${siteConfig.url}/dashboard?checkout=success`,
      cancel_url: `${siteConfig.url}/pricing?checkout=cancel`,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la création de la session Stripe." }, { status: 500 });
  }
}
