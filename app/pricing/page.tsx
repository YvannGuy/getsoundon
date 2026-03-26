import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buildCanonical } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tarifs et consultation gratuite",
  description:
    "GetSoundOn propose une consultation gratuite. Les frais de service sont appliques uniquement lors d'une reservation payee.",
  alternates: { canonical: buildCanonical("/pricing") },
};

export default function PricingPage() {
  return (
    <main className="container py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black">Tarifs et consultation gratuite</h1>
        <p className="mt-4 text-slate-600">
          Parcourez les annonces librement et échangez avec les propriétaires sans frais. Les tarifs des locations
          sont fixés par les propriétaires ; une fois votre réservation confirmée, des frais de service fixes de 15 €
          s&apos;ajoutent au moment du paiement pour couvrir la sécurisation des transactions et le support de la plateforme.
        </p>
        <p className="mt-3 text-slate-600">
          Que vous cherchiez une salle pour un culte régulier, un baptême, une conférence ou une retraite spirituelle en Île-de-France,
          vous pouvez comparer les offres, envoyer autant de demandes que nécessaire et ne payer qu&apos;une fois la réservation acceptée.
          Les propriétaires fixent leurs prix à la journée ou à la demi-journée ; le forfait de 15 € est identique quelle que soit la durée.
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
                Demandes et messagerie gratuites
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                Mise en relation directe avec les propriétaires
              </li>
            </ul>
            <Link href="/rechercher" className="mt-6 block">
              <Button className="w-full bg-gs-orange hover:brightness-95">
                Rechercher une salle
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
              La consultation des annonces, l&apos;envoi de demandes et la messagerie avec les propriétaires sont
              entièrement gratuits. Vous ne payez qu&apos;au moment de confirmer une réservation.
            </p>
          </li>
          <li>
            <strong className="text-slate-800">Quels frais s&apos;appliquent à la réservation ?</strong>
            <p className="mt-1">
              Un forfait de 15 € de frais de service est ajouté au moment du paiement de la réservation. Le prix
              de la location est fixé par le propriétaire et indiqué sur chaque annonce.
            </p>
          </li>
          <li>
            <strong className="text-slate-800">Les propriétaires paient-ils pour publier leur salle ?</strong>
            <p className="mt-1">
              La mise en ligne d&apos;une annonce est gratuite. Les propriétaires peuvent souscrire à des packs
              optionnels pour augmenter la visibilité de leurs annonces (voir l&apos;espace propriétaire).
            </p>
          </li>
          <li>
            <strong className="text-slate-800">Puis-je annuler une réservation ?</strong>
            <p className="mt-1">
              Les conditions d&apos;annulation dépendent du propriétaire et sont indiquées sur chaque annonce. En cas de litige,
              la plateforme peut vous accompagner. Consultez nos CGV pour les détails.
            </p>
          </li>
        </ul>
      </section>
    </main>
  );
}
