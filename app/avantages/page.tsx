import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

import { AddSalleLink } from "@/components/links/add-salle-link";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pourquoi lister votre salle | Avantages propriétaires",
  description:
    "Decouvrez les avantages de proposer votre salle sur GetSoundOn. Plateforme pensee pour les proprietaires, gestion simplifiee, paiements securises.",
  alternates: { canonical: buildCanonical("/avantages") },
};

const PLATEFORME_CARDS = [
  {
    number: "1",
    title: "Ciblage pertinent",
    desc: "Touchez une audience qui cherche un lieu pour des besoins spirituels et cérémoniels.",
  },
  {
    number: "2",
    title: "Cadre structuré",
    desc: "Demandes, échanges, offres et suivi sont encadrés dans un seul espace.",
  },
  {
    number: "3",
    title: "Relation simplifiée",
    desc: "Une expérience claire pour le propriétaire comme pour l'organisateur.",
  },
];

const GAINS = [
  { title: "Visibilité locale ciblée", desc: "Votre salle apparaît auprès d'organisateurs réellement pertinents." },
  { title: "Gain de temps au quotidien", desc: "Moins d'aller-retours, plus de demandes qualifiées." },
  { title: "Réservations mieux cadrées", desc: "Offres, contrat et suivi regroupés dans un même parcours." },
  { title: "Gestion des demandes unifiée", desc: "Tout est centralisé: échanges, statuts et prochaines actions." },
  { title: "Paiement optionnel sécurisé", desc: "Encaissements en ligne possibles via Stripe Connect." },
  { title: "Meilleure expérience client", desc: "Un parcours clair qui inspire confiance aux organisateurs." },
];

const ETAPES = [
  { step: 1, title: "Créez votre annonce", desc: "Ajoutez photos, capacité et règles de location." },
  { step: 2, title: "Recevez des demandes", desc: "Échangez directement avec les organisateurs intéressés." },
  { step: 3, title: "Proposez une offre", desc: "Validez le cadre et les conditions de réservation." },
  { step: 4, title: "Finalisez", desc: "Paiement en ligne optionnel, suivi depuis le dashboard." },
];

const ANNONCES_TIPS = [
  "Mise en ligne rapide de votre salle",
  "Espace clair pour gérer les demandes",
  "Messagerie intégrée avec organisateurs",
  "Historique des échanges et actions",
  "Possibilité de paiement en ligne",
  "Suivi simplifié des réservations",
];

const PAIEMENTS_PROPRIO = [
  "Encaissement sécurisé via Stripe",
  "Historique des transactions",
  "Suivi des paiements en dashboard",
  "Activation uniquement si vous le souhaitez",
];

const PAIEMENTS_LOCATAIRES = [
  "Paiement clair et rassurant",
  "Validation rapide de la réservation",
  "Parcours fluide jusqu'à la confirmation",
  "Confiance renforcée dans la transaction",
];

const FAQ_ITEMS = [
  { q: "Comment fonctionne la plateforme ?", a: "Vous créez une annonce avec les détails de votre salle. Les organisateurs vous envoient des demandes. Vous répondez, négociez et validez les réservations. Les paiements peuvent passer par la plateforme (optionnel)." },
  { q: "Quels sont les frais ?", a: "L'inscription et la création d'annonces sont gratuites. Les frais plateforme sont fixes (15 €) et s'appliquent uniquement au moment du paiement d'une réservation." },
  { q: "Puis-je annuler une réservation ?", a: "Les conditions d'annulation sont définies avec l'organisateur. En cas de force majeure, contactez le support pour trouver une solution." },
  { q: "Comment contacter le support ?", a: "Notre equipe est joignable par email a contact@getsoundon.com. Nous repondons sous 48h ouvrees." },
];

export default function AvantagesPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-[#f6f7fb] py-14">
        <div className="container max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h1 className="text-[32px] font-bold tracking-tight text-black sm:text-[40px] lg:text-[48px]">
                Mettez votre salle
                <br />
                en location.
                <span className="block text-gs-orange">On s&apos;occupe du cadre.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-slate-600">
                Publiez votre salle et recevez des demandes qualifiées. Un parcours clair pour gérer vos échanges, vos offres et vos réservations.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <AddSalleLink className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gs-orange px-6 text-[15px] font-semibold text-white transition hover:brightness-95">
                  Ajouter ma salle
                  <ChevronRight className="h-5 w-5" />
                </AddSalleLink>
                <Link
                  href="#plateforme"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voir les avantages
                </Link>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Inscription gratuite</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Paiement en ligne optionnel</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Dashboard propriétaire simple</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
              <Image
                src="/images/proprietaire-gestion.png"
                alt="Aperçu plateforme propriétaire"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plateforme" className="py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Conçu pour les demandes événementielles, professionnelles et cérémonielles.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PLATEFORME_CARDS.map((item) => (
              <Card key={item.title} className="border-slate-200">
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-gs-orange">
                    {item.number}
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
                  <p className="text-[17px] font-semibold text-black">{item.title}</p>
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
            <div>
              <h2 className="text-[28px] font-bold text-black sm:text-[32px]">
                Votre espace propriétaire (dashboard)
              </h2>
              <ul className="mt-8 space-y-3">
                {ANNONCES_TIPS.map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" />
                    <span className="text-[15px] leading-relaxed text-slate-700">{text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-slate-500">
                * Les fonctions peuvent évoluer selon vos besoins et votre activité.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
              <Image
                src="/images/avantages-dashboard-owner.png"
                alt="Aperçu dashboard propriétaire"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
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
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-gs-orange">
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

      <section className="bg-slate-50/80 py-16">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[28px] font-bold text-black sm:text-[32px]">
            Paiement en ligne : optionnel, mais très utile
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Card className="border-blue-100 bg-blue-50/40">
              <CardContent className="p-6">
                <h3 className="text-[18px] font-semibold text-black">Pour vous (propriétaire)</h3>
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
            <Card className="border-emerald-100 bg-emerald-50/40">
              <CardContent className="p-6">
                <h3 className="text-[18px] font-semibold text-black">Pour l&apos;organisateur</h3>
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
          <p className="mt-8 text-center text-sm text-amber-700">
            Le paiement en ligne reste optionnel: vous gardez le contrôle sur votre mode de fonctionnement.
          </p>
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

      <section className="bg-orange-50 py-16">
        <div className="container max-w-[1120px] text-center">
          <h2 className="text-[28px] font-bold text-black sm:text-[32px]">
            Prêt à proposer votre salle ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-slate-600">
            Testez gratuitement et activez ensuite les options selon vos besoins.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <AddSalleLink className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gs-orange px-8 text-[15px] font-semibold text-white transition hover:brightness-95">
              Ajouter ma salle
            </AddSalleLink>
            <Link
              href="/centre-aide/proprietaire"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-8 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Centre d&apos;aide
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
