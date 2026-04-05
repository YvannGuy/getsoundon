import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `${siteConfig.name} — traitement des données personnelles (compte, annonces, réservations, paiements, messagerie), RGPD, sous-traitants et vos droits.`,
  alternates: { canonical: buildCanonical("/confidentialite") },
};

export default function ConfidentialitePage() {
  const { editeur } = legalConfig;
  const privacyContactEmail = siteConfig.supportEmail;

  return (
    <LegalPageLayout title="Politique de confidentialité">
      <p className="lead text-[16px] text-slate-600">
        La présente politique décrit comment <strong className="text-black">{siteConfig.name}</strong> traite les données
        personnelles des utilisateurs de la plateforme de mise en relation et de réservation autour de la{" "}
        <strong className="text-black">location de matériel</strong> (et, le cas échéant, de services associés), dans le
        respect du Règlement (UE) 2016/679 (« RGPD ») et de la loi n° 78-17 modifiée (« Informatique et Libertés »).
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Elle est distincte des{" "}
        <Link href="/cgu" className="text-gs-orange hover:underline">
          CGU
        </Link>{" "}
        et des{" "}
        <Link href="/cgv" className="text-gs-orange hover:underline">
          CGV
        </Link>
        , qui régissent l&apos;usage du service et les aspects contractuels et financiers.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Responsable du traitement</h2>
        <p className="mt-3 text-slate-600">
          Le <strong className="text-black">responsable du traitement</strong> des données personnelles collectées dans le
          cadre du site et des services {siteConfig.name} est :
        </p>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">{editeur.nom}</strong>
          <br />
          {editeur.siegeSocial.adresse}, {editeur.siegeSocial.codePostal} {editeur.siegeSocial.ville},{" "}
          {editeur.siegeSocial.pays}
          <br />
          {editeur.siret ? <>SIRET : {editeur.siret}</> : null}
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">Contact données personnelles / exercice des droits :</strong>{" "}
          <a href={`mailto:${privacyContactEmail}`} className="text-gs-orange hover:underline">
            {privacyContactEmail}
          </a>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Si un délégué à la protection des données (DPD/DPO) est désigné, ses coordonnées pourront être ajoutées aux
          mentions légales et en tête de la présente politique.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Catégories de données personnelles traitées</h2>
        <p className="mt-3 text-slate-600">
          Selon les fonctionnalités utilisées, {siteConfig.name} est susceptible de traiter les catégories suivantes :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Données de compte et d&apos;authentification</strong> : identifiant
            technique, adresse électronique, mot de passe (stocké sous forme sécurisée par le prestataire
            d&apos;authentification), éventuellement numéro de téléphone ou identifiants de connexion sociale si proposés.
          </li>
          <li>
            <strong className="text-black">Données de profil</strong> : nom ou pseudonyme affiché, type de compte ou rôle
            (par ex. prestataire / client), photo de profil ou avatar, préférences liées au compte.
          </li>
          <li>
            <strong className="text-black">Données relatives aux annonces (Prestataire)</strong> : description du matériel,
            tarifs, options (retrait, livraison, zone), politique d&apos;annulation affichée, photographies et contenus
            multimédias, identifiants techniques de l&apos;annonce.
          </li>
          <li>
            <strong className="text-black">Données relatives aux réservations</strong> : identifiants de réservation,
            périodes de location, montants (prix de location, frais de service, totaux encaissés le cas échéant), statuts
            (demande, acceptation, check-in / check-out, incident, annulation), références liées à la logistique.
          </li>
          <li>
            <strong className="text-black">Données de paiement et de transaction</strong> : {siteConfig.name}{" "}
            <strong className="text-black">ne stocke pas</strong> les numéros complets de carte bancaire. Les paiements
            sont traités par <strong className="text-black">Stripe</strong> (dont Stripe Connect pour les comptes
            prestataires). Sont en revanche conservés des <strong className="text-black">données de transaction</strong>{" "}
            strictement nécessaires : identifiants de paiement ou d&apos;intention de paiement, montants, devises, états
            de transaction, identifiants de compte Stripe lorsqu&apos;ils sont requis pour le service, données relatives
            à la caution (empreinte, capture) lorsque la fonctionnalité est activée.
          </li>
          <li>
            <strong className="text-black">Messagerie et support</strong> : contenu des échanges entre Utilisateurs via
            la Plateforme, pièces jointes autorisées par le produit, demandes adressées au support, journaux de
            traitement associés.
          </li>
          <li>
            <strong className="text-black">Données relatives aux incidents et litiges</strong> : déclarations
            d&apos;incident, motifs, éléments de preuve fournis (notamment photographies), décisions ou suites données
            dans le cadre de la résolution (y compris traitement par l&apos;équipe habilitée).
          </li>
          <li>
            <strong className="text-black">Facturation et documents comptables</strong> : données figurant sur les
            documents émis ou stockés pour la traçabilité des opérations (références de réservation, montants, identités
            des parties dans la mesure nécessaire), fichiers PDF ou équivalents hébergés si la fonctionnalité existe.
          </li>
          <li>
            <strong className="text-black">Données techniques et de sécurité</strong> : adresse IP, journaux serveurs,
            identifiants d&apos;appareil ou de session, horodatages, données de limitation de débit ou de prévention des
            abus, cookies et traceurs conformément à la{" "}
            <Link href="/cookies" className="text-gs-orange hover:underline">
              politique cookies
            </Link>
            .
          </li>
          <li>
            <strong className="text-black">Données issues de l&apos;analytics produit</strong> : lorsque la mesure
            d&apos;audience ou d&apos;usage est activée (par ex. via un outil tiers), événements liés à la navigation ou
            aux actions clés, potentiellement associés à un identifiant de compte ; la finalité est l&apos;amélioration du
            service et la compréhension statistique des parcours, sous réserve du cadre décrit ci-dessous.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Moments et sources de collecte</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Création et gestion de compte</strong> : données fournies par l&apos;Utilisateur
            à l&apos;inscription ou dans les paramètres du compte.
          </li>
          <li>
            <strong className="text-black">Publication et consultation d&apos;annonces</strong> : contenus publiés par le
            Prestataire ; consultation par les Clients et visiteurs dans les limites prévues par le produit.
          </li>
          <li>
            <strong className="text-black">Parcours de réservation et d&apos;exécution</strong> : données générées lors des
            demandes, acceptations, paiements, check-in / check-out, incidents et annulations.
          </li>
          <li>
            <strong className="text-black">Paiement en ligne</strong> : données saisies sur l&apos;interface Stripe ou
            transmises par Stripe à {siteConfig.name} (métadonnées de transaction), ainsi que les confirmations de
            paiement.
          </li>
          <li>
            <strong className="text-black">Messagerie et formulaires</strong> : données saisies volontairement par
            l&apos;Utilisateur.
          </li>
          <li>
            <strong className="text-black">Support</strong> : échanges avec les équipes {siteConfig.name} par courriel ou
            canaux proposés.
          </li>
          <li>
            <strong className="text-black">Automatique</strong> : données techniques collectées lors de l&apos;accès au
            service (logs, sécurité).
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Finalités du traitement</h2>
        <p className="mt-3 text-slate-600">Les données sont traitées notamment pour :</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Fourniture de la Plateforme</strong> : création de compte, authentification,
            affichage du catalogue, mise en relation entre Prestataires et Clients.
          </li>
          <li>
            <strong className="text-black">Gestion des réservations</strong> : enregistrement des demandes, statuts,
            exécution de la location (remise / retour), gestion des incidents et des annulations dans le cadre prévu par
            le produit.
          </li>
          <li>
            <strong className="text-black">Paiements et répartition des fonds</strong> : encaissement, commission,
            reversements aux Prestataires via Stripe Connect, gestion des cautions lorsque applicable.
          </li>
          <li>
            <strong className="text-black">Facturation et obligations comptables</strong> : édition ou conservation de
            pièces justificatives, traçabilité des opérations.
          </li>
          <li>
            <strong className="text-black">Messagerie</strong> : transmission des messages entre Utilisateurs dans le cadre
            d&apos;une réservation ou d&apos;un contact lié au service.
          </li>
          <li>
            <strong className="text-black">Notifications</strong> : courriels transactionnels ou messages de service (état
            de réservation, sécurité du compte), et le cas échéant notifications via des canaux tiers configurés par
            l&apos;Utilisateur ou par le service.
          </li>
          <li>
            <strong className="text-black">Sécurité, prévention de la fraude et des abus</strong> : surveillance
            technique, limitation de débit, analyse d&apos;incidents de sécurité.
          </li>
          <li>
            <strong className="text-black">Amélioration du produit et mesure d&apos;usage</strong> : statistiques
            d&apos;utilisation, analyse des parcours, correction d&apos;erreurs, dans le respect des bases légales
            applicables.
          </li>
          <li>
            <strong className="text-black">Obligations légales et réponses aux autorités</strong> : lorsque la loi
            l&apos;exige.
          </li>
          <li>
            <strong className="text-black">Prospection ou communications marketing</strong> : uniquement sur{" "}
            <strong className="text-black">base de consentement</strong> préalable et distinct lorsque de telles
            communications sont proposées ; possibilité de retirer le consentement à tout moment.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Bases légales (RGPD)</h2>
        <p className="mt-3 text-slate-600">Selon les traitements concernés, la base légale est notamment :</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Exécution du contrat</strong> ou <strong className="text-black">mesures
            précontractuelles</strong> : compte, annonces, réservations, messagerie liée à une location, paiements
            nécessaires à la réservation, communications essentielles au service.
          </li>
          <li>
            <strong className="text-black">Obligation légale</strong> : conservation de certaines données comptables et
            fiscales, réponses aux réquisitions.
          </li>
          <li>
            <strong className="text-black">Intérêt légitime</strong> : sécurité du service, prévention des abus, lutte
            contre la fraude, amélioration et fiabilisation du produit, mesures d&apos;usage proportionnées ; lorsque
            l&apos;intérêt légitime est invoqué, un équilibre est recherché avec vos droits et libertés.
          </li>
          <li>
            <strong className="text-black">Consentement</strong> : cookies non essentiels et traceurs similaires (voir la{" "}
            <Link href="/cookies" className="text-gs-orange hover:underline">
              politique cookies
            </Link>
            ), newsletter ou marketing électronique lorsqu&apos;ils sont proposés, et certaines options facultatives du
            compte.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Destinataires des données</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Personnel habilité de {siteConfig.name}</strong> : accès sur la base du besoin
            d&apos;en connaître (support, administration technique, gestion des litiges graves).
          </li>
          <li>
            <strong className="text-black">Autres Utilisateurs</strong> : dans la logique d&apos;une marketplace, certaines
            informations sont rendues visibles au Prestataire et au Client concernés par une réservation ou une demande
            (par ex. nom ou pseudonyme, contenu de la messagerie, éléments nécessaires à la remise du matériel). Les
            contenus publics des annonces sont visibles selon les règles d&apos;affichage du site.
          </li>
          <li>
            <strong className="text-black">Prestataires techniques (sous-traitants)</strong> : catégorie décrite à la
            section 7.
          </li>
          <li>
            <strong className="text-black">Autorités</strong> : lorsque la loi l&apos;impose ou qu&apos;une réquisition
            valable est adressée au responsable du traitement.
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          {siteConfig.name} ne vend pas vos données personnelles à des tiers à des fins commerciales.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7. Sous-traitants et prestataires techniques</h2>
        <p className="mt-3 text-slate-600">
          Dans le cadre de l&apos;hébergement et de l&apos;exploitation du service, {siteConfig.name} fait appel notamment
          aux catégories de prestataires suivantes (liste non exhaustive, évolutive) :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Supabase</strong> : hébergement de la base de données, authentification,
            stockage de fichiers le cas échéant ; traitement de données personnelles conformément à ses conditions. La
            zone d&apos;hébergement retenue pour le projet doit être documentée contractuellement (souvent Union
            européenne — à vérifier sur votre projet).
          </li>
          <li>
            <strong className="text-black">Vercel</strong> (ou équivalent) : hébergement et exécution de l&apos;application
            web.
          </li>
          <li>
            <strong className="text-black">Stripe</strong> : traitement des paiements, conformité PCI-DSS, Stripe Connect
            pour les comptes prestataires ; politique de confidentialité propre à Stripe applicable aux données collectées
            sur ses interfaces.
          </li>
          <li>
            <strong className="text-black">Prestataire d&apos;envoi d&apos;e-mails transactionnels</strong> (par ex.
            Resend ou équivalent) : acheminement des courriels de service.
          </li>
          <li>
            <strong className="text-black">Outil d&apos;analytics ou de product analytics</strong> (par ex. PostHog ou
            équivalent) lorsqu&apos;il est configuré : mesure d&apos;événements côté serveur ou client ; les données
            transmises sont limitées au nécessaire. L&apos;hébergement peut être situé dans l&apos;Union européenne ou
            hors UE selon la configuration (voir section 9).
          </li>
          <li>
            <strong className="text-black">Infrastructure de cache ou de limitation de débit</strong> (par ex. Redis /
            Upstash) : peut impliquer un traitement temporaire d&apos;identifiants techniques ou d&apos;adresses IP à des
            fins de sécurité et de disponibilité.
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          Les sous-traitants sont sélectionnés pour leurs garanties suffisantes au sens de l&apos;article 28 du RGPD. La
          liste peut évoluer ; une mise à jour substantielle de la présente politique pourra être effectuée pour en tenir
          compte.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8. Durées de conservation</h2>
        <p className="mt-3 text-slate-600">
          Les données sont conservées pour des durées proportionnées aux finalités. À titre indicatif :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Compte actif</strong> : données conservées tant que le compte existe et que
            l&apos;Utilisateur utilise le service.
          </li>
          <li>
            <strong className="text-black">Après clôture de compte</strong> : suppression ou anonymisation lorsque
            possible ; conservation au-delà uniquement si un <strong className="text-black">intérêt légitime</strong>{" "}
            (ex. prévention de la fraude, constat de droits) ou une <strong className="text-black">obligation légale</strong>{" "}
            le justifie (typiquement <strong className="text-black">trois ans</strong> à compter du dernier contact pour
            certaines données relatives aux prospections ou réclamations, sous réserve de la doctrine et du contexte ;
            à affiner avec votre conseil).
          </li>
          <li>
            <strong className="text-black">Données contractuelles et comptables</strong> :{" "}
            <strong className="text-black">dix (10) ans</strong> pour les pièces et données nécessaires aux obligations
            comptables et fiscales applicables en France, sauf durée légale différente.
          </li>
          <li>
            <strong className="text-black">Données de réservation, paiement, incident, facturation</strong> : conservation
            pendant la relation contractuelle puis pour la durée nécessaire aux litiges en cours et aux obligations
            légales (souvent alignée sur le régime comptable pour les éléments financiers).
          </li>
          <li>
            <strong className="text-black">Journaux techniques et sécurité</strong> : durées courtes (par ex. quelques
            semaines à quelques mois) sauf conservation exceptionnelle en cas d&apos;incident ou de demande légale.
          </li>
          <li>
            <strong className="text-black">Cookies</strong> : voir durées indiquées dans la{" "}
            <Link href="/cookies" className="text-gs-orange hover:underline">
              politique cookies
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9. Transferts de données hors de l&apos;Espace économique européen</h2>
        <p className="mt-3 text-slate-600">
          Certains prestataires peuvent être établis ou héberger des données en dehors de l&apos;EEE (notamment sociétés
          américaines : hébergeur d&apos;application, paiement, analytics). Lorsque de tels transferts ont lieu,{" "}
          {siteConfig.name} vise à mettre en œuvre des <strong className="text-black">garanties appropriées</strong> au
          sens du RGPD (notamment <strong className="text-black">clauses contractuelles types</strong> approuvées par la
          Commission européenne, mesures supplémentaires le cas échéant) et/ou à s&apos;appuyer sur une{" "}
          <strong className="text-black">décision d&apos;adéquation</strong> lorsqu&apos;elle existe.
        </p>
        <p className="mt-3 text-slate-600">
          Vous pouvez obtenir une copie des garanties pertinentes sur demande, dans la mesure où elles ne sont pas déjà
          accessibles via les politiques publiques des prestataires.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">10. Cookies et traceurs</h2>
        <p className="mt-3 text-slate-600">
          Le site utilise des cookies et traceurs décrits dans la{" "}
          <Link href="/cookies" className="text-gs-orange hover:underline">
            politique cookies
          </Link>
          . Les traceurs non essentiels sont, le cas échéant, soumis à votre consentement, configurable via les
          mécanismes prévus sur le site.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">11. Sécurité</h2>
        <p className="mt-3 text-slate-600">
          {siteConfig.name} met en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des
          communications (HTTPS), contrôle d&apos;accès, authentification sécurisée, hébergement auprès de prestataires
          reconnus, limitation des accès administrateurs. Les données bancaires sensibles sont traitées par Stripe selon
          les normes applicables ; elles ne transiteront pas sur les serveurs applicatifs de {siteConfig.name} sous la
          forme d&apos;un numéro de carte complet stocké en clair.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">12. Vos droits</h2>
        <p className="mt-3 text-slate-600">Sous les conditions et limites prévues par le RGPD, vous disposez des droits suivants :</p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Accès</strong> et <strong className="text-black">copie</strong> de vos données ;
          </li>
          <li>
            <strong className="text-black">Rectification</strong> des données inexactes ;
          </li>
          <li>
            <strong className="text-black">Effacement</strong> (« droit à l&apos;oubli ») lorsque les conditions légales
            sont réunies ;
          </li>
          <li>
            <strong className="text-black">Limitation</strong> du traitement ;
          </li>
          <li>
            <strong className="text-black">Opposition</strong> au traitement fondé sur l&apos;intérêt légitime, pour des
            motifs tenant à votre situation particulière ;
          </li>
          <li>
            <strong className="text-black">Portabilité</strong> des données que vous avez fournies, lorsque le traitement
            est automatisé et fondé sur le contrat ou le consentement ;
          </li>
          <li>
            <strong className="text-black">Retrait du consentement</strong> lorsque le traitement est fondé sur le
            consentement, sans affecter la licéité du traitement antérieur ;
          </li>
          <li>
            <strong className="text-black">Directives post-mortem</strong> (loi française) selon les modalités prévues par
            la loi.
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          Vous pouvez vous opposer aux traitements à des fins de prospection, notamment commerciale, dans les conditions
          légales.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">13. Modalités d&apos;exercice des droits et réclamations</h2>
        <p className="mt-3 text-slate-600">
          Pour exercer vos droits, adressez une demande à{" "}
          <a href={`mailto:${privacyContactEmail}`} className="text-gs-orange hover:underline">
            {privacyContactEmail}
          </a>
          , en joignant si possible un justificatif d&apos;identité en cas de doute raisonnable sur votre identité.{" "}
          {siteConfig.name} s&apos;efforcera de répondre dans un délai d&apos;un mois, prolongeable conformément au RGPD.
        </p>
        <p className="mt-3 text-slate-600">
          Vous disposez du droit d&apos;introduire une <strong className="text-black">réclamation</strong> auprès de la
          CNIL (
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
        <h2 className="text-xl font-semibold text-black">14. Mineurs</h2>
        <p className="mt-3 text-slate-600">
          Le service s&apos;adresse aux personnes capables de contracter conformément au droit applicable. Les données de
          mineurs ne doivent pas être fournies sans l&apos;autorisation du titulaire de l&apos;autorité parentale lorsque la
          loi l&apos;exige.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">15. Décision automatisée et profilage</h2>
        <p className="mt-3 text-slate-600">
          {siteConfig.name} ne met pas en œuvre, à ce jour, de décision produisant des effets juridiques ou vous affectant
          de manière significative uniquement sur le fondement d&apos;un traitement entièrement automatisé au sens de
          l&apos;article 22 du RGPD. Des mécanismes automatiques de sécurité ou de scoring interne peuvent exister à des
          fins de prévention de la fraude ; ils ne se substituent pas à une décision humaine lorsque la loi l&apos;exige.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">16. Mise à jour de la politique</h2>
        <p className="mt-3 text-slate-600">
          La présente politique peut être modifiée pour refléter l&apos;évolution du service, des fonctionnalités ou des
          obligations légales. La date de dernière mise à jour figure ci-dessous. En cas de changement substantiel, une
          information sur le site ou par courriel pourra être utilisée lorsque la loi ou la pratique l&apos;exige.
        </p>
      </section>

      <p className="mt-12 text-sm text-slate-500">Dernière mise à jour : 5 avril 2026.</p>
    </LegalPageLayout>
  );
}
