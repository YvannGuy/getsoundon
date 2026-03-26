import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${siteConfig.name} collecte, utilise et protège vos données personnelles.`,
  alternates: { canonical: buildCanonical("/confidentialite") },
};

export default function ConfidentialitePage() {
  const { editeur, dpoEmail } = legalConfig;

  return (
    <LegalPageLayout title="Politique de confidentialité">
      <p className="lead text-[16px] text-slate-600">
        La présente politique de confidentialité définit comment {siteConfig.name} collecte, utilise et protège les
        données personnelles des utilisateurs, dans le respect du Règlement général sur la protection des données (RGPD)
        et de la loi Informatique et Libertés.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Responsable du traitement</h2>
        <p className="mt-3 text-slate-600">
          Le responsable du traitement des données personnelles est :
        </p>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">{editeur.nom}</strong>
          <br />
          {editeur.siegeSocial.adresse}, {editeur.siegeSocial.codePostal} {editeur.siegeSocial.ville}
          <br />
          Email :{" "}
          <a href={`mailto:${dpoEmail}`} className="text-gs-orange hover:underline">
            {dpoEmail}
          </a>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Données collectées</h2>
        <p className="mt-3 text-slate-600">
          Nous collectons les données suivantes :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Données d&apos;identification</strong> : nom, prénom, adresse email (lors de
            l&apos;inscription)
          </li>
          <li>
            <strong className="text-black">Données de contact</strong> : numéro de téléphone (optionnel, pour la mise en
            relation)
          </li>
          <li>
            <strong className="text-black">Données de localisation</strong> : ville, département (pour les recherches et
            annonces)
          </li>
          <li>
            <strong className="text-black">Données relatives aux annonces</strong> : description des salles, photos,
            capacité, équipements (propriétaires)
          </li>
          <li>
            <strong className="text-black">Données de navigation</strong> : adresse IP, type de navigateur, pages visitées
            (voir politique Cookies)
          </li>
          <li>
            <strong className="text-black">Données de paiement</strong> : informations transmises à Stripe pour le
            traitement des réservations ; nous ne stockons pas les numéros de carte bancaire
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          Les données sont collectées directement auprès des utilisateurs lors de l&apos;inscription, de la création
          d&apos;annonces ou des échanges via la messagerie.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Finalités du traitement</h2>
        <p className="mt-3 text-slate-600">
          Les données sont traitées pour les finalités suivantes :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Gestion des comptes utilisateurs</li>
          <li>Mise en relation entre organisateurs et propriétaires</li>
          <li>Publication et gestion des annonces de salles</li>
          <li>Exécution des paiements de réservation et frais de service</li>
          <li>Envoi de communications relatives au service (confirmations, rappels)</li>
          <li>Prévention des fraudes et respect des obligations légales</li>
          <li>Amélioration des services et analyses statistiques agrégées</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Base légale</h2>
        <p className="mt-3 text-slate-600">
          Le traitement repose sur :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">L&apos;exécution du contrat</strong> : gestion du compte, mise en relation,
            paiement des réservations
          </li>
          <li>
            <strong className="text-black">Votre consentement</strong> : newsletter, cookies non essentiels
          </li>
          <li>
            <strong className="text-black">L&apos;intérêt légitime</strong> : sécurité, prévention des abus,
            amélioration du service
          </li>
          <li>
            <strong className="text-black">Une obligation légale</strong> : conservation de certaines données (factures,
            pièces comptables)
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Durée de conservation</h2>
        <p className="mt-3 text-slate-600">
          Les données sont conservées pendant la durée nécessaire aux finalités mentionnées :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Compte actif : jusqu&apos;à sa suppression par l&apos;utilisateur</li>
          <li>Après fermeture du compte : 3 ans pour les données nécessaires à la gestion des litiges et obligations
            légales
          </li>
          <li>Données de paiement : selon les obligations légales (10 ans pour les pièces comptables)</li>
          <li>Cookies : voir la{" "}
            <a href="/cookies" className="text-gs-orange hover:underline">
              politique Cookies
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Destinataires des données</h2>
        <p className="mt-3 text-slate-600">
          Les données peuvent être communiquées à :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Supabase</strong> : hébergement de la base de données (UE)
          </li>
          <li>
            <strong className="text-black">Stripe</strong> : traitement des paiements (conformité PCI-DSS)
          </li>
          <li>
            <strong className="text-black">Vercel</strong> : hébergement du site
          </li>
          <li>
            <strong className="text-black">Les autres utilisateurs</strong> : dans le cadre de la mise en relation
            (ex. : organisateur et propriétaire échangent leurs coordonnées via la messagerie)
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          Aucun transfert de données hors Union européenne n&apos;est effectué sans garanties appropriées (clauses
          contractuelles types, etc.).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7. Vos droits</h2>
        <p className="mt-3 text-slate-600">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Droit d&apos;accès</strong> : obtenir une copie de vos données
          </li>
          <li>
            <strong className="text-black">Droit de rectification</strong> : corriger des données inexactes
          </li>
          <li>
            <strong className="text-black">Droit à l&apos;effacement</strong> : demander la suppression de vos données
          </li>
          <li>
            <strong className="text-black">Droit à la limitation</strong> : limiter le traitement dans certains cas
          </li>
          <li>
            <strong className="text-black">Droit à la portabilité</strong> : recevoir vos données dans un format
            structuré
          </li>
          <li>
            <strong className="text-black">Droit d&apos;opposition</strong> : vous opposer à un traitement fondé sur
            l&apos;intérêt légitime
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          Pour exercer ces droits, contactez-nous à{" "}
          <a href={`mailto:${dpoEmail}`} className="text-gs-orange hover:underline">
            {dpoEmail}
          </a>
          . Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gs-orange hover:underline"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8. Sécurité</h2>
        <p className="mt-3 text-slate-600">
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
          chiffrement des communications (HTTPS), accès restreint, hébergement sécurisé. Les paiements sont traités
          exclusivement par Stripe, sans transit des données bancaires sur nos serveurs.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9. Modifications</h2>
        <p className="mt-3 text-slate-600">
          Cette politique peut être modifiée pour refléter les évolutions de nos pratiques ou des obligations légales.
          La date de dernière mise à jour est indiquée en bas de page. Nous vous invitons à la consulter
          régulièrement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">10. Contact</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question sur cette politique ou vos données personnelles :{" "}
          <a href={`mailto:${dpoEmail}`} className="text-gs-orange hover:underline">
            {dpoEmail}
          </a>
        </p>
      </section>

      <p className="mt-12 text-sm text-slate-500">
        Dernière mise à jour : février 2026.
      </p>
    </LegalPageLayout>
  );
}
