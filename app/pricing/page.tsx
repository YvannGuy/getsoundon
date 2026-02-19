import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { CheckoutButton } from "@/components/checkout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pricingPlans } from "@/config/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarifs | salledeculte.com",
};

export default function PricingPage() {
  return (
    <main className="container py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Tarifs transparents</h1>
        <p className="mt-4 text-slate-600">Choisissez le plan qui correspond à vos besoins.</p>
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <Card key={plan.id} className={cn("stagger-item", plan.highlighted && "border-slate-800 shadow-lg")}>
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {plan.price}€<span className="text-base font-normal text-slate-500">/mois</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-800" />
                    {feature}
                  </li>
                ))}
              </ul>
              <CheckoutButton planId={plan.id} className="mt-6 w-full">
                Choisir ce plan
              </CheckoutButton>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
