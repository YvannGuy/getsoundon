import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Questions générales",
  description: `Questions fréquentes sur la location de matériel événementiel sur ${siteConfig.name}.`,
  alternates: { canonical: buildCanonical("/centre-aide/general") },
};

const linkLegal =
  "font-semibold text-gs-orange underline-offset-2 hover:underline";

const FAQ_GENERAL: { q: string; a: ReactNode }[] = [
  {
    q: "Qu'est-ce que GetSoundOn ?",
    a: `${siteConfig.name} est une place de marché pour louer ou proposer du matériel événementiel : sono, DJ, lumière, vidéo, micros et services associés (livraison, installation, technicien), en Île-de-France.`,
  },
  {
    q: "Qui peut utiliser la plateforme ?",
    a: "Les clients (particuliers ou pros) pour trouver du matériel, et les prestataires pour publier des annonces et gérer demandes et réservations.",
  },
  {
    q: "La consultation du catalogue est-elle payante ?",
    a: (
      <>
        Non. Parcourir les annonces est gratuit. Pour une réservation payée via la plateforme, un frais de service à la
        charge du client et une commission à la charge du prestataire peuvent s’appliquer selon les{" "}
        <Link href="/cgv" className={linkLegal}>
          CGV
        </Link>{" "}
        (article 6 — typiquement 3 % et 15 % du prix de location).
      </>
    ),
  },
  {
    q: "Pourquoi l’Île-de-France en priorité ?",
    a: "Nous concentrons le service sur l’Île-de-France pour la logistique et la qualité des mises en relation. L’extension à d’autres zones dépendra de l’offre et des partenaires.",
  },
  {
    q: "Comment fonctionne une réservation ?",
    a: "Selon l’annonce : confirmation immédiate ou demande soumise au prestataire. Après accord, le paiement peut passer par la plateforme (Stripe) lorsque c’est proposé. Les détails (dates, caution, options) figurent sur la fiche matériel.",
  },
  {
    q: "Les annonces sont-elles vérifiées ?",
    a: "Les annonces peuvent être contrôlées avant ou après publication pour limiter les contenus incomplets ou trompeurs et garder un catalogue fiable.",
  },
  {
    q: "Comment créer un compte ?",
    a: "Utilisez « Inscription » ou « Connexion » dans l’en-tête. Vous pourrez ensuite accéder au catalogue, à vos réservations matériel et, pour les prestataires, publier du matériel et activer les paiements (Stripe Connect) si besoin.",
  },
  {
    q: "Comment contacter le support ?",
    a: `Écrivez à ${siteConfig.supportEmail} ou utilisez le formulaire du centre d’aide. Réponse en général sous 24 à 48 h ouvrées.`,
  },
  {
    q: "Où en savoir plus sur le fonctionnement ?",
    a: "Consultez la page « Comment ça marche » pour le parcours clients et prestataires, et la FAQ en bas de page d’accueil pour des réponses rapides.",
  },
  {
    q: "Puis-je utiliser le site sans compte ?",
    a: "Vous pouvez consulter le catalogue. Pour envoyer une demande, réserver ou publier une annonce, un compte est nécessaire.",
  },
  {
    q: "Les paiements sont-ils sécurisés ?",
    a: "Lorsque le paiement en ligne est proposé, il est traité via des prestataires reconnus (ex. Stripe). Ne communiquez jamais vos codes carte hors du parcours officiel du site.",
  },
  {
    q: "Comment signaler un problème ?",
    a: `Contactez ${siteConfig.supportEmail} en décrivant la situation (annonce, réservation, utilisateur). Nous traitons les signalements dans les meilleurs délais.`,
  },
  {
    q: "Où sont les mentions légales, les CGU / CGV et la politique de confidentialité ?",
    a: (
      <>
        Elles sont accessibles en pied de page sur toutes les pages, et ici :{" "}
        <Link href="/mentions-legales" className={linkLegal}>
          Mentions légales
        </Link>
        ,{" "}
        <Link href="/cgu" className={linkLegal}>
          CGU
        </Link>
        ,{" "}
        <Link href="/cgv" className={linkLegal}>
          CGV
        </Link>
        ,{" "}
        <Link href="/confidentialite" className={linkLegal}>
          Politique de confidentialité
        </Link>
        . Pour les cookies et le bandeau de consentement :{" "}
        <Link href="/cookies" className={linkLegal}>
          Gestion des cookies
        </Link>
        .
      </>
    ),
  },
  {
    q: "Partenariats ou presse ?",
    a: `Écrivez à ${siteConfig.supportEmail} en indiquant l’objet de votre demande.`,
  },
];

function FaqItem({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="font-landing-heading text-base font-bold text-gs-dark">{question}</h3>
      <p className="font-landing-body mt-2 text-[15px] leading-relaxed text-[#555]">{answer}</p>
    </div>
  );
}

export default function CentreAideGeneralPage() {
  const half = Math.ceil(FAQ_GENERAL.length / 2);
  const left = FAQ_GENERAL.slice(0, half);
  const right = FAQ_GENERAL.slice(half);

  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[1000px] py-12 sm:py-16 md:py-20">
        <Link
          href="/centre-aide"
          className="font-landing-nav text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour au centre d&apos;aide
        </Link>
        <h1 className="font-landing-section-title mt-6 text-gs-dark">Général</h1>
        <p className="font-landing-body mt-4 max-w-[640px] text-base leading-relaxed text-[#555]">
          Réponses aux questions les plus fréquentes sur {siteConfig.name} et la location de matériel événementiel.
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

        <Link
          href="/comment-ca-marche"
          className="font-landing-nav mt-6 inline-block text-sm font-semibold text-gs-orange hover:underline"
        >
          Voir « Comment ça marche » →
        </Link>

        <Link
          href="/centre-aide"
          className="font-landing-nav mt-8 block text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour au centre d&apos;aide
        </Link>
      </main>
    </PublicSiteShell>
  );
}
