import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronRight, FileText, Calendar, User } from "lucide-react";

import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pourquoi lister votre salle | Avantages propriétaires",
  description:
    "Découvrez les avantages de proposer votre salle sur salledeculte.com. Plateforme pensée pour les propriétaires, gestion simplifiée, paiements sécurisés.",
  alternates: { canonical: buildCanonical("/avantages") },
};

const PLATEFORME_CARDS = [
  { icon: FileText, title: "Créez des annonces", desc: "Annonces structurées et claires pour cibler les bons organisateurs", color: "bg-blue-100 text-blue-600" },
  { icon: Calendar, title: "Demandes clients", desc: "Centralisez et suivez toutes vos demandes en un seul endroit", color: "bg-violet-100 text-violet-600" },
  { icon: User, title: "Expérience propriétaire complète", desc: "Un espace dédié pour gérer sereinement vos réservations", color: "bg-emerald-100 text-emerald-600" },
];

const GAINS = [
  { title: "Visibilité accrue", desc: "Votre salle est visible auprès des organisateurs recherchant un lieu adapté.", color: "text-blue-600" },
  { title: "Gain de temps", desc: "Moins de prospection, des demandes qualifiées et ciblées.", color: "text-emerald-600" },
  { title: "Gestion facilitée", desc: "Messagerie intégrée, suivi des réservations et paiements simplifiés.", color: "text-amber-600" },
  { title: "Réservations automatisées", desc: "Confirmations, rappels et contrats centralisés sur la plateforme.", color: "text-violet-600" },
  { title: "Paiements sécurisés", desc: "Stripe Connect pour encaisser en toute sécurité. Optionnel.", color: "text-yellow-600" },
  { title: "Revenus additionnels", desc: "Monétisez votre espace sans effort supplémentaire au quotidien.", color: "text-rose-600" },
];

const ETAPES = [
  { step: 1, title: "Créez votre annonce", desc: "Renseignez les infos essentielles : capacité, équipements, tarifs. Photos et description détaillée.", color: "bg-[#213398]" },
  { step: 2, title: "Recevez des demandes", desc: "Les organisateurs vous contactent via la plateforme. Répondez et échangez en messagerie.", color: "bg-emerald-600" },
  { step: 3, title: "Gérez vos réservations", desc: "Proposez une offre, signez le contrat. Tout est centralisé dans votre espace.", color: "bg-violet-600" },
  { step: 4, title: "Encaissez vos paiements", desc: "Si vous activez les paiements en ligne, encaissement sécurisé via Stripe Connect.", color: "bg-amber-500" },
];

const ANNONCES_TIPS = [
  "Photos de haute qualité",
  "Description détaillée",
  "Prix compétitifs",
  "Disponibilités à jour",
  "Réponses rapides",
];

const PAIEMENTS_PROPRIO = [
  "Paiements sécurisés",
  "Historique des transactions",
  "Rapports financiers",
  "Protection contre les impayés",
];

const PAIEMENTS_LOCATAIRES = [
  "Divers modes de paiement",
  "Facturation automatique",
  "Réservation simplifiée",
  "Annulation facile",
];

const FAQ_ITEMS = [
  { q: "Comment fonctionne la plateforme ?", a: "Vous créez une annonce avec les détails de votre salle. Les organisateurs vous envoient des demandes. Vous répondez, négociez et validez les réservations. Les paiements peuvent passer par la plateforme (optionnel)." },
  { q: "Quels sont les frais ?", a: "L'inscription et la création d'annonces sont gratuites. Des frais de service peuvent s'appliquer sur les réservations payées via la plateforme. Consultez nos CGU pour les détails." },
  { q: "Puis-je annuler une réservation ?", a: "Les conditions d'annulation sont définies avec l'organisateur. En cas de force majeure, contactez le support pour trouver une solution." },
  { q: "Comment contacter le support ?", a: "Notre équipe est joignable par email à contact@salledeculte.com. Nous répondons sous 48h ouvrées." },
];

export default function AvantagesPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-slate-50/50 py-16">
        <div className="container max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="text-[32px] font-bold tracking-tight text-black sm:text-[40px] lg:text-[48px]">
                Proposez votre salle. Gagnez du temps.
              </h1>
              <p className="mt-6 text-[17px] leading-relaxed text-slate-600">
                Proposez dès aujourd&apos;hui votre salle et gagnez du temps dans la gestion de vos événements. Une plateforme claire, conçue pour simplifier votre organisation.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/auth?tab=signup&userType=owner"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#213398] px-6 text-[15px] font-semibold text-white transition hover:bg-[#1a2980]"
                >
                  Déposer ma salle
                  <ChevronRight className="h-5 w-5" />
                </Link>
                <Link
                  href="#plateforme"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  En savoir plus
                </Link>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
              <Image
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"
                alt="Salle de réunion moderne"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section id="plateforme" className="py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Une plateforme pensée pour ce type de demande
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PLATEFORME_CARDS.map((item) => (
              <Card key={item.title} className="border-slate-200">
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-[18px] font-semibold text-black">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50/80 py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Ce que vous gagnez concrètement
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GAINS.map((item) => (
              <Card key={item.title} className="border-slate-200 bg-white">
                <CardContent className="p-6">
                  <p className={`text-[20px] font-bold ${item.color}`}>{item.title}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
              <Image
                src="/images/proprietaire-gestion.png"
                alt="Un propriétaire gère ses annonces depuis chez lui"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2 className="text-[28px] font-bold text-black sm:text-[32px]">
                Un outil de gestion conçu pour les propriétaires
              </h2>
              <ul className="mt-8 space-y-4">
                {["Gérez vos annonces", "Suivez vos demandes", "Communiquez avec les locataires", "Générez des rapports", "Optimisez vos prix", "Gagnez en efficacité"].map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#213398]" />
                    <span className="text-[15px] leading-relaxed text-slate-700">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50/80 py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Comment ça marche
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map((item) => (
              <Card key={item.step} className="border-slate-200 bg-white">
                <CardContent className="p-6 text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${item.color} text-lg font-bold text-white`}>
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-black">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Les annonces qui performent le mieux
          </h2>
          <Card className="mx-auto mt-12 max-w-2xl border-slate-200">
            <CardContent className="p-8">
              <ul className="space-y-4">
                {ANNONCES_TIPS.map((tip) => (
                  <li key={tip} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="text-[15px] text-slate-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-slate-50/80 py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Paiements via la plateforme <span className="text-slate-500">(optionnel)</span>
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <h3 className="text-[18px] font-semibold text-black">Pour vous en tant que propriétaire</h3>
                <ul className="mt-4 space-y-3">
                  {PAIEMENTS_PROPRIO.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-[14px] text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <h3 className="text-[18px] font-semibold text-black">Pour vos locataires</h3>
                <ul className="mt-4 space-y-3">
                  {PAIEMENTS_LOCATAIRES.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-[14px] text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Questions fréquentes
          </h2>
          <div className="mx-auto mt-12 max-w-3xl">
            <Accordion type="single" collapsible defaultValue="item-0">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-slate-200">
                  <AccordionTrigger className="py-4 text-[15px] font-medium text-black hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-[14px] leading-relaxed text-slate-600">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="bg-slate-800 py-16">
        <div className="container max-w-[1120px] text-center">
          <h2 className="text-[28px] font-bold text-white sm:text-[32px]">
            Prêt à proposer votre salle ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-slate-300">
            Inscrivez-vous dès maintenant et commencez à générer des revenus supplémentaires.
          </p>
          <Link
            href="/auth?tab=signup&userType=owner"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-white bg-white px-8 text-[15px] font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            S&apos;inscrire
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
