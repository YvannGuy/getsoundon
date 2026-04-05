import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { buildCanonical } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tarifs et consultation gratuite",
  description:
    "GetSoundOn propose une consultation gratuite. Les frais de service client (3 %) et la commission prestataire (15 %) s’appliquent selon les CGV lors d’une réservation payée.",
  alternates: { canonical: buildCanonical("/pricing") },
};

export default function PricingPage() {
  return (
    <PublicSiteShell>
    <main className="landing-container py-14 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black">Tarifs et consultation gratuite</h1>
        <p className="mt-4 text-slate-600">
          Parcourez le catalogue matériel librement et échangez avec les prestataires sans frais. Les tarifs de
          location sont fixés par annonce ; une fois votre réservation payée, des{" "}
          <strong className="font-medium text-slate-800">frais de service de 3 %</strong> du prix de location
          s&apos;ajoutent côté client au moment du paiement, conformément aux{" "}
          <Link href="/cgv" className="text-gs-orange hover:underline">
            CGV
          </Link>
          .
        </p>
        <p className="mt-3 text-slate-600">
          Comparez les annonces (sono, DJ, lumière, services), envoyez vos demandes et ne payez qu&apos;une fois la
          réservation acceptée. Les prestataires perçoivent le prix de location diminué d&apos;une{" "}
          <strong className="font-medium text-slate-800">commission de 15 %</strong> ; le détail figure dans les
          CGV.
        </p>
      </div>

      <section className="mx-auto mt-12 max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Accès gratuit</CardTitle>
            <CardDescription>Explorez et contactez sans limite</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-black">0 €</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                Consultation des annonces illimitée
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                Demandes et échanges avec les prestataires gratuits
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                Mise en relation avec les prestataires
              </li>
            </ul>
            <Link href="/catalogue" className="mt-6 block">
              <Button className="w-full bg-gs-orange hover:brightness-95">
                Voir le catalogue matériel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-xl font-semibold text-black">Questions fréquentes sur les tarifs</h2>
        <ul className="mt-4 space-y-4 text-sm text-slate-600">
          <li>
            <strong className="text-slate-800">Combien coûte la consultation ?</strong>
            <p className="mt-1">
              La consultation du catalogue, l&apos;envoi de demandes et les échanges avec les prestataires sont
              entièrement gratuits. Vous ne payez qu&apos;au moment de confirmer une réservation matériel.
            </p>
          </li>
          <li>
            <strong className="text-slate-800">Quels frais s&apos;appliquent à la réservation ?</strong>
            <p className="mt-1">
              Le client paie le prix de location affiché sur l&apos;annonce plus des frais de service de{" "}
              <strong className="font-medium text-slate-800">3 %</strong> sur ce prix. Le prestataire reçoit le prix
              de location diminué d&apos;une commission de{" "}
              <strong className="font-medium text-slate-800">15 %</strong>. Voir les{" "}
              <Link href="/cgv" className="text-gs-orange hover:underline">
                CGV
              </Link>{" "}
              pour le détail et les arrondis.
            </p>
          </li>
          <li>
            <strong className="text-slate-800">Les prestataires paient-ils pour publier une annonce ?</strong>
            <p className="mt-1">
              La mise en ligne d&apos;une annonce matériel est gratuite. Des packs optionnels peuvent augmenter la
              visibilité (voir l&apos;espace prestataire).
            </p>
          </li>
          <li>
            <strong className="text-slate-800">Puis-je annuler une réservation ?</strong>
            <p className="mt-1">
              Les conditions d&apos;annulation dépendent du prestataire et sont indiquées sur chaque annonce. En cas
              de litige, la plateforme peut vous accompagner. Consultez nos CGV pour les détails.
            </p>
          </li>
        </ul>
      </section>
    </main>
    </PublicSiteShell>
  );
}
