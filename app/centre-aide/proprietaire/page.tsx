import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Aide propriétaire",
  description: "Decouvrez comment proposer votre salle et recevoir des demandes ciblees sur GetSoundOn.",
  alternates: { canonical: buildCanonical("/centre-aide/proprietaire") },
};
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const FAQ_PROPRIETAIRE = [
  {
    q: "Comment ajouter ma salle sur la plateforme ?",
    a: "Créez un compte, cliquez sur « Ajoutez ma salle » et suivez l'onboarding. Vous pourrez ajouter les photos, la capacité, les équipements et les contraintes de votre lieu.",
  },
  {
    q: "Dois-je payer pour publier mon annonce ?",
    a: "La publication d'une annonce est gratuite. Vous recevez des demandes d'organisateurs sans frais d'inscription.",
  },
  {
    q: "Comment recevoir des demandes ?",
    a: "Une fois votre salle publiée et validée, les organisateurs peuvent vous envoyer des demandes. Vous êtes notifié par email et dans votre messagerie.",
  },
  {
    q: "Combien de temps ai-je pour répondre à une demande ?",
    a: "Nous vous encourageons à répondre sous 24 à 48 heures. Une réponse rapide améliore votre visibilité et le taux de réservation.",
  },
  {
    q: "Puis-je refuser une demande ?",
    a: "Oui. Vous pouvez indiquer que la salle n'est pas disponible ou demander des précisions. L'organisateur sera informé de votre réponse.",
  },
  {
    q: "Comment gérer ma messagerie ?",
    a: "Accédez à « Messagerie » depuis votre tableau de bord. Vous y verrez toutes vos conversations avec les organisateurs et pourrez répondre directement.",
  },
  {
    q: "Comment modifier ou supprimer mon annonce ?",
    a: "Allez dans « Mes annonces » puis cliquez sur l'annonce concernée. Vous pouvez modifier les informations ou désactiver l'annonce à tout moment.",
  },
  {
    q: "Comment fonctionnent les disponibilités ?",
    a: "Pour l'instant, les demandes incluent la date souhaitée. Vous indiquez si vous êtes disponible dans votre réponse. Une gestion avancée des disponibilités est à venir.",
  },
  {
    q: "Quelles informations dois-je renseigner pour mon annonce ?",
    a: "Capacité, équipements (sono, vidéo, cuisine…), contraintes (alcool, horaires, accès handicapé…), photos et une description claire. Plus votre annonce est précise, plus les demandes sont pertinentes.",
  },
  {
    q: "Ma salle doit-elle être dédiée aux cultes ?",
    a: "Non. Toute salle pouvant accueillir des événements à caractère cultuel (conférences, baptêmes, cultes, retraites…) peut être proposée.",
  },
  {
    q: "Comment sont vérifiées les annonces ?",
    a: "Chaque annonce est contrôlée par notre équipe avant publication pour garantir des informations fiables et cohérentes.",
  },
  {
    q: "Puis-je avoir plusieurs salles ?",
    a: "Oui. Vous pouvez publier plusieurs lieux depuis votre espace propriétaire. Chaque salle a sa propre annonce et reçoit des demandes indépendantes.",
  },
  {
    q: "Comment mettre en avant mon annonce ?",
    a: "Travaillez surtout la qualité de votre annonce (photos nettes, description précise, infos complètes) et répondez rapidement aux demandes : ce sont les leviers principaux de visibilité.",
  },
  {
    q: "Qui peut voir mon annonce ?",
    a: "Les organisateurs inscrits sur {siteConfig.name} qui recherchent une salle dans votre zone géographique et pour le type d'événement que vous acceptez.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Ecrivez-nous a contact@getsoundon.com. Nous sommes la pour vous accompagner dans la mise en ligne et la gestion de vos annonces.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="mb-8">
      <h3 className="font-semibold text-black">{question}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{answer}</p>
    </div>
  );
}

export default function CentreAideProprietairePage() {
  const half = Math.ceil(FAQ_PROPRIETAIRE.length / 2);
  const left = FAQ_PROPRIETAIRE.slice(0, half);
  const right = FAQ_PROPRIETAIRE.slice(half);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <SiteHeader />
      <main className="container max-w-[1000px] py-16 px-4">
        <Link href="/centre-aide" className="text-[14px] font-medium text-slate-600 hover:text-black">
          ← Retour au centre d&apos;aide
        </Link>
        <h1 className="mt-6 text-[32px] font-bold tracking-tight text-black">Propriétaire</h1>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-slate-600">
          Découvrez tout ce qu&apos;il faut savoir pour proposer votre salle sur {siteConfig.name} et recevoir
          des demandes ciblées d&apos;organisateurs.
        </p>

        <div className="mt-12 grid gap-x-12 gap-y-4 md:grid-cols-2">
          <div>
            {left.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a.replace("{siteConfig.name}", siteConfig.name)} />
            ))}
          </div>
          <div>
            {right.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a.replace("{siteConfig.name}", siteConfig.name)} />
            ))}
          </div>
        </div>

        <Link href="/centre-aide" className="mt-12 inline-block text-[14px] font-medium text-slate-600 hover:text-black">
          ← Retour au centre d&apos;aide
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
