import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { PassCheckoutButton } from "@/components/pass-checkout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarifs | salledeculte.com",
};

const PASS_PLANS = [
  {
    id: "pass_24h" as const,
    name: "Pass 24h",
    description: "Demandes illimitées pendant 24 heures",
    features: ["Envoyez autant de demandes que vous voulez", "Valable 24h après achat", "Idéal pour un projet ponctuel"],
  },
  {
    id: "pass_48h" as const,
    name: "Pass 48h",
    description: "Demandes illimitées pendant 48 heures",
    features: ["Envoyez autant de demandes que vous voulez", "Valable 48h après achat", "Plus de flexibilité"],
    highlighted: true,
  },
  {
    id: "abonnement" as const,
    name: "Abonnement",
    description: "Accès prioritaire illimité",
    features: ["Demandes illimitées", "Accès prioritaire", "Accompagnement personnalisé"],
  },
] as const;

export default async function PricingPage() {
  const settings = await getPlatformSettings();
  const pass = settings.pass;

  const plans = PASS_PLANS.filter((p) => {
    if (p.id === "pass_24h") return pass.pass_24h_enabled;
    if (p.id === "pass_48h") return pass.pass_48h_enabled;
    if (p.id === "abonnement") return pass.abonnement_enabled;
    return false;
  }).map((p) => {
    const price =
      p.id === "pass_24h"
        ? pass.price_24h / 100
        : p.id === "pass_48h"
          ? pass.price_48h / 100
          : pass.price_abonnement / 100;
    return { ...p, price };
  });

  return (
    <main className="container py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black">Tarifs transparents</h1>
        <p className="mt-4 text-slate-600">
          {pass.demandes_gratuites} demandes gratuites pour débuter. Puis choisissez un Pass pour continuer.
        </p>
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn("stagger-item", (plan as { highlighted?: boolean }).highlighted && "border-blue-600 shadow-lg ring-1 ring-blue-100")}
          >
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">
                {plan.price}€
                {plan.id === "abonnement" ? (
                  <span className="text-base font-normal text-slate-500">/mois</span>
                ) : (
                  <span className="text-base font-normal text-slate-500"> unitaire</span>
                )}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                    {feature}
                  </li>
                ))}
              </ul>
              <PassCheckoutButton passType={plan.id} className="mt-6 w-full bg-blue-600 hover:bg-blue-700">
                Choisir ce plan
              </PassCheckoutButton>
            </CardContent>
          </Card>
        ))}
      </section>

      {plans.length === 0 && (
        <div className="mt-12 rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center">
          <p className="text-slate-700">Aucun Pass n&apos;est actuellement disponible.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Les {pass.demandes_gratuites} premières demandes sont gratuites. Ensuite, un Pass 24h, 48h ou un abonnement est
        requis pour continuer.
      </p>
    </main>
  );
}
