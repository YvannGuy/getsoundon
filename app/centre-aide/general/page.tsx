import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Questions générales",
  description: "Questions fréquentes et informations générales sur salledeculte.com.",
  alternates: { canonical: buildCanonical("/centre-aide/general") },
};
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const FAQ_GENERAL = [
  {
    q: "Qu'est-ce que salledeculte.com ?",
    a: `${siteConfig.name} est la plateforme de référence pour trouver et proposer des salles dédiées aux événements cultuels : cultes, baptêmes, conférences, célébrations, retraites…`,
  },
  {
    q: "Quels types d'événements sont accueillis ?",
    a: "Cultes réguliers, conférences, baptêmes, célébrations, retraites et tout événement à caractère cultuel. Vous précisez le type lors de votre recherche ou dans votre annonce.",
  },
  {
    q: "La consultation des annonces est-elle payante ?",
    a: "Non, consulter les annonces est gratuit. Les frais sont appliqués uniquement lorsqu'une réservation est payée.",
  },
  {
    q: "Pourquoi l'Île-de-France uniquement ?",
    a: "Nous nous concentrons sur l'Île-de-France pour offrir un service localisé et de qualité. L'extension à d'autres régions est envisagée.",
  },
  {
    q: "Comment fonctionne la mise en relation ?",
    a: "L'organisateur envoie une demande au propriétaire. La confirmation finale et les détails se font directement entre les deux parties via la messagerie.",
  },
  {
    q: "Les annonces sont-elles vérifiées ?",
    a: "Oui. Chaque annonce est contrôlée avant publication pour garantir des informations fiables : capacité, équipements, contraintes, photos.",
  },
  {
    q: "Comment créer un compte ?",
    a: "Cliquez sur « Connexion » ou « Inscription » et choisissez « Je cherche une salle » ou « Je possède une salle ». Suivez les étapes pour créer votre compte.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Écrivez à contact@salledeculte.com. Nous répondons généralement sous 24 à 48 heures ouvrées.",
  },
  {
    q: "Où trouver les questions fréquentes ?",
    a: "La page d'accueil dispose d'une section FAQ en bas. Le centre d'aide propose aussi des réponses par thème : Chercher une salle, Propriétaire, Général.",
  },
  {
    q: "Puis-je utiliser la plateforme sans créer de compte ?",
    a: "Vous pouvez consulter les annonces sans compte. Pour envoyer des demandes ou publier une salle, l'inscription est nécessaire.",
  },
  {
    q: "Comment s'abonner à la newsletter ?",
    a: "Pour l'instant, inscrivez-vous sur la plateforme ou contactez-nous à contact@salledeculte.com pour être tenu au courant des actualités.",
  },
  {
    q: "La plateforme est-elle sécurisée ?",
    a: "Oui. Paiements sécurisés via Stripe, données protégées. Nous nous engageons à protéger vos informations personnelles.",
  },
  {
    q: "Comment signaler un problème ?",
    a: "Contactez-nous à contact@salledeculte.com en décrivant le problème. Nous traiterons votre signalement dans les meilleurs délais.",
  },
  {
    q: "Où sont les mentions légales et CGU ?",
    a: "Les liens vers les mentions légales, CGU et politique de confidentialité figurent dans le pied de page du site.",
  },
  {
    q: "Comment nous rejoindre ?",
    a: "Pour toute question partenariat, collaboration ou presse : contact@salledeculte.com.",
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

export default function CentreAideGeneralPage() {
  const half = Math.ceil(FAQ_GENERAL.length / 2);
  const left = FAQ_GENERAL.slice(0, half);
  const right = FAQ_GENERAL.slice(half);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <SiteHeader />
      <main className="container max-w-[1000px] py-16 px-4">
        <Link href="/centre-aide" className="text-[14px] font-medium text-slate-600 hover:text-black">
          ← Retour au centre d&apos;aide
        </Link>
        <h1 className="mt-6 text-[32px] font-bold tracking-tight text-black">Général</h1>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-slate-600">
          Bienvenue dans le centre d&apos;aide {siteConfig.name}. Retrouvez ici les réponses aux questions les plus
          fréquentes.
        </p>

        <div className="mt-12 grid gap-x-12 gap-y-4 md:grid-cols-2">
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

        <Link href="/#faq" className="mt-6 inline-block text-[14px] font-medium text-[#213398] hover:underline">
          Voir la FAQ sur la page d&apos;accueil →
        </Link>

        <Link href="/centre-aide" className="mt-8 inline-block text-[14px] font-medium text-slate-600 hover:text-black">
          ← Retour au centre d&apos;aide
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
