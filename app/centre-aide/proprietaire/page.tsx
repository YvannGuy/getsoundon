import type { Metadata } from "next";
import Link from "next/link";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Prestataire — aide",
  description: `Publier et gérer vos annonces de matériel sur ${siteConfig.name}, recevoir des demandes et encaisser en ligne.`,
  alternates: { canonical: buildCanonical("/centre-aide/proprietaire") },
};

const FAQ_PRESTATAIRE = [
  {
    q: "Comment proposer mon matériel sur GetSoundOn ?",
    a: "Créez un compte prestataire, complétez votre profil puis publiez une annonce : photos, catégorie (sono, DJ, lumière…), description, tarif à la journée, disponibilité, options (livraison, installation, technicien) et zone d’intervention.",
  },
  {
    q: "Publier une annonce est-il payant ?",
    a: "La mise en ligne d’annonces est en principe gratuite. Des frais de plateforme peuvent s’appliquer au moment d’une transaction réussie, selon les règles en vigueur sur GetSoundOn.",
  },
  {
    q: "Comment recevoir des demandes et réservations ?",
    a: "Une fois l’annonce en ligne (et validée si un contrôle est requis), les locataires peuvent vous écrire ou réserver selon les options que vous avez activées. Vous êtes notifié par email et dans votre espace prestataire.",
  },
  {
    q: "Comment activer les paiements (Stripe Connect) ?",
    a: "Depuis l’espace prestataire (Paiements), suivez l’onboarding Stripe Connect pour recevoir les virements liés aux réservations payées via la plateforme.",
  },
  {
    q: "Combien de temps ai-je pour répondre à une demande ?",
    a: "Répondre sous 24 à 48 h améliore votre taux de conversion et la confiance. Un délai trop long peut décourager les locataires.",
  },
  {
    q: "Puis-je refuser une demande ?",
    a: "Oui. Indiquez un refus ou proposez une alternative (autres dates, autre matériel) depuis votre espace (réservations / messages liés à la location matériel) pour garder une relation claire avec le client.",
  },
  {
    q: "Comment gérer les échanges avec les locataires ?",
    a: "Ouvrez « Locations matériel » dans votre tableau de bord prestataire : les échanges liés aux réservations matériel y sont regroupés par location.",
  },
  {
    q: "Comment modifier ou désactiver mon annonce ?",
    a: "Allez dans « Mes annonces » (ou équivalent), sélectionnez l’annonce puis modifiez les champs ou désactivez-la si le matériel n’est plus disponible.",
  },
  {
    q: "Comment gérer mes disponibilités ?",
    a: "Selon les outils disponibles, mettez à jour les créneaux ou répondez aux demandes en indiquant si les dates demandées sont possibles. Gardez votre calendrier à jour pour éviter les doubles réservations.",
  },
  {
    q: "Quelles informations donner pour une bonne annonce ?",
    a: "Photos nettes, état du matériel, contenu du pack (câbles, flight case…), tarif clair, zone de retrait / livraison, caution éventuelle, et options facturées à part.",
  },
  {
    q: "Comment sont contrôlées les annonces ?",
    a: "Une vérification peut être faite pour limiter les annonces incomplètes ou non conformes aux règles de la plateforme.",
  },
  {
    q: "Puis-je avoir plusieurs annonces ?",
    a: "Oui. Créez une annonce par matériel ou par pack pour faciliter la recherche et la réservation.",
  },
  {
    q: "Qui voit mon annonce ?",
    a: "Les utilisateurs du site qui consultent le catalogue ; votre adresse exacte peut rester masquée jusqu’après réservation, selon les réglages de la fiche.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Écrivez à contact@getsoundon.com ou utilisez le formulaire du centre d’aide pour toute question sur la publication ou la gestion des réservations.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="mb-8">
      <h3 className="font-landing-heading text-base font-bold text-gs-dark">{question}</h3>
      <p className="font-landing-body mt-2 text-[15px] leading-relaxed text-[#555]">{answer}</p>
    </div>
  );
}

export default function CentreAideProprietairePage() {
  const half = Math.ceil(FAQ_PRESTATAIRE.length / 2);
  const left = FAQ_PRESTATAIRE.slice(0, half);
  const right = FAQ_PRESTATAIRE.slice(half);

  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[1000px] py-12 sm:py-16 md:py-20">
        <Link
          href="/centre-aide"
          className="font-landing-nav text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour au centre d&apos;aide
        </Link>
        <h1 className="font-landing-section-title mt-6 text-gs-dark">Prestataire</h1>
        <p className="font-landing-body mt-4 max-w-[640px] text-base leading-relaxed text-[#555]">
          Tout pour publier votre matériel sur {siteConfig.name}, recevoir des demandes qualifiées et gérer vos
          réservations.
        </p>

        <div className="mt-10 grid gap-x-10 gap-y-2 md:grid-cols-2 md:mt-12">
          <div>
            {left.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
          <div>
            {right.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/auth?tab=signup&userType=owner"
            className="font-landing-btn inline-flex rounded-lg bg-gs-orange px-5 py-2.5 text-sm text-white transition hover:brightness-105"
          >
            Louer mon matériel
          </Link>
          <Link
            href="/comment-ca-marche"
            className="font-landing-nav text-sm font-semibold text-gs-orange hover:underline"
          >
            Comment ça marche →
          </Link>
        </div>

        <Link
          href="/centre-aide"
          className="font-landing-nav mt-10 block text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour au centre d&apos;aide
        </Link>
      </main>
    </PublicSiteShell>
  );
}
