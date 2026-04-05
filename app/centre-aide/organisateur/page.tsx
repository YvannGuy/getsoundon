import type { Metadata } from "next";
import Link from "next/link";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Louer du matériel — aide",
  description: `Tout savoir pour louer du matériel événementiel sur ${siteConfig.name} : recherche, réservation, options et paiement.`,
  alternates: { canonical: buildCanonical("/centre-aide/organisateur") },
};

const FAQ_CLIENT = [
  {
    q: "Comment trouver du matériel sur GetSoundOn ?",
    a: "Utilisez le catalogue ou la recherche : filtres par catégorie (sono, DJ, lumière, vidéo…), zone et budget. Ouvrez une fiche pour voir photos, tarif à la journée, options et zone d’intervention indicative.",
  },
  {
    q: "La consultation des annonces est-elle payante ?",
    a: "Non. Parcourir le catalogue est gratuit. Vous payez uniquement lorsque vous validez une réservation (ou un acompte) selon les conditions de l’annonce.",
  },
  {
    q: "Quelle est la différence entre confirmation immédiate et validation par le prestataire ?",
    a: "Certaines annonces permettent de réserver tout de suite ; d’autres exigent d’abord une demande que le prestataire accepte. C’est indiqué sur la fiche matériel.",
  },
  {
    q: "Comment fonctionnent les demandes et les échanges avec un prestataire ?",
    a: "Vous pouvez envoyer une demande ou réserver selon le cas, puis échanger avec le prestataire depuis votre espace (réservations matériel, fil de messages lié à la réservation) pour préciser dates, retrait ou livraison, etc.",
  },
  {
    q: "Puis-je ajouter la livraison ou un technicien ?",
    a: "Si le prestataire les propose, vous les sélectionnez sur la fiche (ou dans le parcours de réservation). Les montants affichés sont indicatifs jusqu’à confirmation.",
  },
  {
    q: "Comment payer ma location ?",
    a: "Lorsque le parcours le prévoit, le paiement se fait en ligne de façon sécurisée (Stripe). Sinon, suivez les instructions du prestataire indiquées après accord.",
  },
  {
    q: "Que couvre la caution affichée ?",
    a: "La caution est une garantie ; elle n’est en principe pas débitée comme le paiement principal de la réservation. Les modalités exactes figurent sur l’annonce et le contrat / conditions associées.",
  },
  {
    q: "Puis-je annuler ou modifier des dates ?",
    a: "Les conditions d’annulation et de modification dépendent du prestataire et de l’annonce. Vérifiez la fiche et les messages échangés ; en cas de doute, contactez le support.",
  },
  {
    q: "Comment suivre mes réservations ?",
    a: "Rendez-vous dans votre tableau de bord (espace client) : réservations matériel, documents utiles et suivi y sont centralisés.",
  },
  {
    q: "Pourquoi la zone affichée est-elle approximative ?",
    a: "Pour protéger le prestataire, la carte ou le libellé de zone peut être indicatif (ville / département). L’adresse précise est communiquée après validation de la location.",
  },
  {
    q: "Puis-je contacter plusieurs prestataires ?",
    a: "Oui, vous pouvez comparer plusieurs annonces et mener des échanges en parallèle tant qu’aucune réservation ferme n’a été validée.",
  },
  {
    q: "La recherche est-elle limitée géographiquement ?",
    a: `${siteConfig.name} met l’accent sur l’Île-de-France pour la logistique. Élargissez les critères ou contactez le support si vous ne trouvez pas de matériel adapté.`,
  },
  {
    q: "Comment contacter le support ?",
    a: `Écrivez à ${siteConfig.supportEmail} ou passez par le formulaire du centre d’aide.`,
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

export default function CentreAideOrganisateurPage() {
  const half = Math.ceil(FAQ_CLIENT.length / 2);
  const left = FAQ_CLIENT.slice(0, half);
  const right = FAQ_CLIENT.slice(half);

  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[1000px] py-12 sm:py-16 md:py-20">
        <Link
          href="/centre-aide"
          className="font-landing-nav text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour au centre d&apos;aide
        </Link>
        <h1 className="font-landing-section-title mt-6 text-gs-dark">Louer du matériel</h1>
        <p className="font-landing-body mt-4 max-w-[640px] text-base leading-relaxed text-[#555]">
          Guides et réponses pour chercher du matériel, comprendre le parcours de réservation et utiliser {siteConfig.name}{" "}
          sereinement.
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
            href="/catalogue"
            className="font-landing-btn inline-flex rounded-lg bg-gs-orange px-5 py-2.5 text-sm text-white transition hover:brightness-105"
          >
            Voir le catalogue
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
