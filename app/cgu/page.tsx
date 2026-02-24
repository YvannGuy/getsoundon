import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: `Conditions générales d'utilisation de la plateforme ${siteConfig.name}.`,
  alternates: { canonical: buildCanonical("/cgu") },
};

export default function CGUPage() {
  const { editeur } = legalConfig;

  return (
    <LegalPageLayout title="Conditions générales d'utilisation (CGU)">
      <p className="lead text-[16px] text-slate-600">
        Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent l&apos;accès et
        l&apos;utilisation de la plateforme {siteConfig.name}, éditée par {editeur.nom}. En accédant au site et en
        l&apos;utilisant, vous acceptez sans réserve les présentes CGU.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 1 – Objet</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGU ont pour objet de définir les conditions et modalités d&apos;utilisation de la plateforme
          {siteConfig.name}, ainsi que les droits et obligations des parties dans le cadre de la mise en relation entre
          organisateurs d&apos;événements cultuels et propriétaires professionnels de salles en France.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 2 – Définitions</h2>
        <ul className="mt-3 space-y-2 text-slate-600">
          <li>
            <strong className="text-black">Plateforme</strong> : le site {siteConfig.url} et l&apos;ensemble des
            services proposés.
          </li>
          <li>
            <strong className="text-black">Organisateur</strong> : toute personne physique ou morale recherchant une
            salle pour organiser un événement à caractère cultuel.
          </li>
          <li>
            <strong className="text-black">Propriétaire</strong> : toute personne physique ou morale mettant en location
            une salle via la plateforme dans le cadre de son activité professionnelle.
          </li>
          <li>
            <strong className="text-black">Utilisateur</strong> : toute personne accédant à la plateforme.
          </li>
          <li>
            <strong className="text-black">Compte</strong> : l&apos;espace personnel créé par l&apos;utilisateur pour
            accéder aux services.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 3 – Acceptation des CGU</h2>
        <p className="mt-3 text-slate-600">
          L&apos;accès et l&apos;utilisation de la plateforme sont subordonnés à l&apos;acceptation et au respect des
          présentes CGU. En créant un compte, vous confirmez avoir lu, compris et accepté les présentes conditions. En
          cas de désaccord, vous ne devez pas utiliser la plateforme.
        </p>
        <p className="mt-3 text-slate-600">
          {editeur.nom} se réserve le droit de modifier les CGU à tout moment. Les utilisateurs seront informés des
          modifications par tout moyen approprié. L&apos;utilisation de la plateforme après modification vaut acceptation
          des nouvelles CGU.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 4 – Description des services</h2>
        <p className="mt-3 text-slate-600">
          La plateforme {siteConfig.name} propose notamment :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>La consultation gratuite des annonces de salles</li>
          <li>La mise en relation entre organisateurs et propriétaires</li>
          <li>L&apos;organisation de visites et la gestion des disponibilités</li>
          <li>Le paiement de réservations via Stripe Connect</li>
          <li>La gestion d&apos;une caution sous forme d&apos;empreinte bancaire</li>
          <li>Une messagerie interne pour échanger entre parties</li>
          <li>La gestion des annonces pour les propriétaires</li>
        </ul>
        <p className="mt-3 text-slate-600">
          {editeur.nom} opère une place de marché et met à disposition des outils techniques. Les conditions financières
          détaillées applicables aux transactions sont définies dans les{" "}
          <a href="/cgv" className="text-[#213398] hover:underline">
            CGV
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 5 – Création de compte et inscription</h2>
        <p className="mt-3 text-slate-600">
          Pour accéder à certains services, l&apos;utilisateur doit créer un compte en fournissant des informations
          exactes et à jour. Chaque utilisateur est responsable de la confidentialité de ses identifiants et de toutes
          les activités réalisées depuis son compte.
        </p>
        <p className="mt-3 text-slate-600">
          L&apos;inscription est réservée aux personnes de 18 ans ou plus, juridiquement capables de contracter.
        </p>
        <p className="mt-3 text-slate-600">
          L&apos;utilisateur s&apos;engage à ne pas créer plusieurs comptes et à ne pas usurper l&apos;identité d&apos;une
          tierce personne.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 6 – Obligations des utilisateurs</h2>
        <p className="mt-3 text-slate-600">
          Les utilisateurs s&apos;engagent à :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Utiliser la plateforme conformément à son objet et dans le respect des lois en vigueur</li>
          <li>Fournir des informations exactes et sincères</li>
          <li>Ne pas porter atteinte aux droits de tiers</li>
          <li>Ne pas publier de contenu illicite, diffamatoire ou contraire aux bonnes mœurs</li>
          <li>Ne pas tenter de contourner les dispositifs de sécurité de la plateforme</li>
          <li>Respecter l&apos;objet cultuel des événements et des salles proposées</li>
          <li>Ne pas utiliser la plateforme pour des activités frauduleuses ou de blanchiment</li>
        </ul>
        <p className="mt-3 text-slate-600">
          Tout manquement à ces obligations pourra entraîner la suspension ou la résiliation du compte sans préavis.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 7 – Modération et conformité des annonces</h2>
        <p className="mt-3 text-slate-600">
          {editeur.nom} peut contrôler, suspendre, refuser ou retirer toute annonce non conforme aux présentes CGU, à la
          loi, ou à la ligne éditoriale de la plateforme.
        </p>
        <p className="mt-3 text-slate-600">
          Le propriétaire s&apos;engage à publier des informations exactes (capacité, équipements, contraintes, prix,
          disponibilités). Il est seul responsable des contenus qu&apos;il diffuse.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 8 – Propriété intellectuelle</h2>
        <p className="mt-3 text-slate-600">
          La plateforme, sa structure, son design, son contenu (sauf contributions des utilisateurs) et les marques
          associées sont la propriété exclusive de {editeur.nom}. Toute reproduction, exploitation ou utilisation non
          autorisée constitue une contrefaçon passible de poursuites.
        </p>
        <p className="mt-3 text-slate-600">
          Les utilisateurs conservent la propriété de leurs contributions (photos, textes d&apos;annonces). Ils
          accordent à {editeur.nom} une licence non exclusive pour les afficher et les utiliser dans le cadre du
          service.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 9 – Responsabilité</h2>
        <p className="mt-3 text-slate-600">
          {editeur.nom} s&apos;efforce d&apos;assurer le fonctionnement continu de la plateforme mais ne peut garantir
          une disponibilité ininterrompue. La responsabilité de {editeur.nom} est limitée au préjudice direct et
          prévisible résultant d&apos;un manquement à ses obligations.
        </p>
        <p className="mt-3 text-slate-600">
          {editeur.nom} n&apos;est pas responsable du contenu des annonces, de la conformité du bien loué, ni de
          l&apos;exécution matérielle de la location entre utilisateurs. Les litiges liés à l&apos;usage de la salle
          demeurent en premier lieu de la responsabilité des parties concernées.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 10 – Données personnelles</h2>
        <p className="mt-3 text-slate-600">
          Le traitement des données personnelles est décrit dans la{" "}
          <a href="/confidentialite" className="text-[#213398] hover:underline">
            Politique de confidentialité
          </a>
          . En utilisant la plateforme, vous acceptez ce traitement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 11 – Résiliation et suspension</h2>
        <p className="mt-3 text-slate-600">
          L&apos;utilisateur peut fermer son compte à tout moment depuis les paramètres. {editeur.nom} peut suspendre ou
          résilier un compte en cas de manquement aux présentes CGU, sans indemnité.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 12 – Droit applicable et litiges</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGU sont régies par le droit français. En cas de litige, les parties rechercheront une solution
          amiable avant toute action judiciaire. À défaut, le litige sera porté devant les juridictions compétentes selon
          les règles légales applicables.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 13 – Contact</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question relative aux CGU :{" "}
          <a href={`mailto:${editeur.email}`} className="text-[#213398] hover:underline">
            {editeur.email}
          </a>
        </p>
      </section>

      <p className="mt-12 text-sm text-slate-500">
        Dernière mise à jour : février 2026.
      </p>
    </LegalPageLayout>
  );
}
