import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: `Conditions générales d'utilisation de ${siteConfig.name} : compte, annonces, réservations et règles d'usage. Les modalités de paiement, d'annulation, de caution et de litiges sont détaillées dans les CGV.`,
  alternates: { canonical: buildCanonical("/cgu") },
};

export default function CGUPage() {
  return (
    <LegalPageLayout title="Conditions générales d'utilisation (CGU)">
      <p className="lead text-[16px] text-slate-600">
        <strong className="text-black">Conditions générales d&apos;utilisation</strong> — {siteConfig.name}
      </p>
      <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 5 avril 2026</p>
      <p className="text-sm text-slate-500">
        Support :{" "}
        <a href="mailto:support@getsoundon.com" className="text-gs-orange hover:underline">
          support@getsoundon.com
        </a>
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Objet</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGU définissent les conditions d&apos;accès et d&apos;utilisation de la plateforme {siteConfig.name}{" "}
          (la « Plateforme »), service en ligne de mise en relation entre des personnes proposant du matériel en location
          (« Prestataires ») et des personnes souhaitant louer ce matériel (« Clients »).
        </p>
        <p className="mt-3 text-slate-600">
          La Plateforme permet notamment la publication d&apos;annonces, la recherche de matériel, les échanges entre
          utilisateurs, la réservation et, le cas échéant, le traitement des paiements via un prestataire tiers. Les
          conditions commerciales et financières applicables aux réservations sont complétées par les{" "}
          <Link href="/cgv" className="text-gs-orange hover:underline">
            conditions générales de vente (CGV)
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Définitions</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Utilisateur</strong> : toute personne disposant d&apos;un compte ou naviguant sur
            la Plateforme.
          </li>
          <li>
            <strong className="text-black">Prestataire</strong> : Utilisateur qui publie une ou plusieurs annonces de
            location de matériel et conclut des réservations avec des Clients.
          </li>
          <li>
            <strong className="text-black">Client</strong> : Utilisateur qui effectue une demande ou une réservation de
            matériel auprès d&apos;un Prestataire.
          </li>
          <li>
            <strong className="text-black">Annonce</strong> : fiche descriptive du matériel, des options, des modalités de
            retrait ou de livraison et, le cas échéant, du montant de la caution ou des conditions d&apos;annulation
            affichées sur la Plateforme.
          </li>
          <li>
            <strong className="text-black">Réservation</strong> : engagement contractuel entre Prestataire et Client
            concernant la location du matériel, tel que formalisé sur la Plateforme (y compris via messagerie ou flux de
            paiement lorsqu&apos;ils sont proposés).
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Acceptation</h2>
        <p className="mt-3 text-slate-600">
          L&apos;utilisation de la Plateforme (navigation, création de compte, publication ou réservation) vaut
          acceptation sans réserve des présentes CGU et, le cas échéant, des CGV au moment de la réservation ou du
          paiement. Si vous n&apos;acceptez pas ces documents, vous ne devez pas utiliser le service.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Compte utilisateur</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Vous devez fournir des informations exactes, complètes et à jour.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.</li>
          <li>Il est interdit de créer un compte de manière frauduleuse, d&apos;usurper une identité ou de contourner une mesure de sécurité.</li>
          <li>La Plateforme peut refuser l&apos;ouverture d&apos;un compte ou demander des justificatifs conformément à ses procédures.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Services de la Plateforme</h2>
        <p className="mt-3 text-slate-600">
          La Plateforme fournit des outils techniques : hébergement d&apos;annonces, mise en relation, messagerie,
          réservation, et éventuellement paiement en ligne via un prestataire de services de paiement (par ex. Stripe).
          Les fonctionnalités peuvent évoluer ; une fonction n&apos;est offerte que dans la mesure où elle est effectivement
          disponible sur le site ou l&apos;application au moment de l&apos;usage.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Rôle d&apos;intermédiaire technique</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            {siteConfig.name} agit en qualité d&apos;intermédiaire technique : elle ne devient pas propriétaire du
            matériel mis en location et n&apos;est pas partie au contrat de location conclu entre Prestataire et Client,
            sauf stipulation contraire expresse dans les CGV ou sur un document contractuel distinct.
          </li>
          <li>
            Le Prestataire demeure seul responsable du matériel (conformité, état, disponibilité, maintenance, assurances
            éventuellement requises, respect des réglementations applicables à la location du bien).
          </li>
          <li>
            Le Client demeure responsable de l&apos;usage qu&apos;il fait du matériel loué, du respect des consignes du
            Prestataire et des obligations légales qui lui incombent (transport, sécurité, etc.).
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7. Annonces et obligations des Prestataires</h2>
        <p className="mt-3 text-slate-600">En publiant une annonce, le Prestataire garantit notamment :</p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>l&apos;exactitude des informations (matériel, accessoires, état, disponibilités, zone de retrait ou modalités de livraison) ;</li>
          <li>le droit de proposer ledit matériel à la location ;</li>
          <li>l&apos;absence de contenu trompeur, illicite ou portant atteinte aux droits de tiers.</li>
        </ul>
        <p className="mt-3 text-slate-600">
          La Plateforme peut retirer ou refuser une annonce non conforme, incomplète, contraire aux présentes CGU ou aux
          CGV, ou susceptible de porter atteinte à la sécurité ou à la réputation du service.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8. Réservations et exécution</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            Une réservation peut résulter d&apos;un processus de confirmation (immédiat ou après acceptation du
            Prestataire), selon les options proposées sur la Plateforme.
          </li>
          <li>
            Les obligations réciproques du Prestataire et du Client (dates, modalités de remise du Matériel, caution
            / dépôt de garantie, annulation, etc.) résultent de l&apos;annonce, des échanges sur la Plateforme et des
            CGV applicables.
          </li>
          <li>
            Tout engagement conclu en dehors de la Plateforme est sous la seule responsabilité des parties ; la
            Plateforme n&apos;en garantit ni la traçabilité ni l&apos;exécution.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9. Paiements (synthèse)</h2>
        <p className="mt-3 text-slate-600">
          Lorsque le paiement en ligne est proposé, il est traité par un prestataire de paiement tiers. Les montants, les
          frais de service, les échéances (acompte, solde), les délais de virement au Prestataire et les cas de
          remboursement sont décrits dans les{" "}
          <Link href="/cgv" className="text-gs-orange hover:underline">
            CGV
          </Link>
          . La Plateforme n&apos;est pas une banque et ne conserve pas les fonds hors du cadre défini avec le prestataire
          de paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">10. Caution, incidents et annulations (synthèse)</h2>
        <p className="mt-3 text-slate-600">
          Une caution peut être prévue pour certaines locations ; elle n&apos;est pas une pénalité contractuelle au sens
          d&apos;une sanction forfaitaire, mais un mécanisme de garantie encadré par les CGV. Les délais de déclaration
          d&apos;incident, les règles de preuve, les remboursements et les politiques d&apos;annulation (flexible,
          standard, stricte, etc.) sont intégralement précisés dans les{" "}
          <Link href="/cgv" className="text-gs-orange hover:underline">
            CGV
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">11. Messagerie et conduite des échanges</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Les échanges doivent rester courtois, loyaux et professionnels.</li>
          <li>Sont interdits : harcèlement, menaces, discrimination, contenus illicites ou contraires aux bonnes mœurs.</li>
          <li>
            Il est recommandé de conserver sur la Plateforme les échanges relatifs à une réservation ; ils peuvent servir
            d&apos;éléments d&apos;information en cas de difficulté, dans les limites prévues par les CGV et la loi.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">12. Propriété intellectuelle</h2>
        <p className="mt-3 text-slate-600">
          La structure du site, les marques, logos et contenus éditoriaux de {siteConfig.name} sont protégés. Les
          contenus publiés par les Utilisateurs (textes, photos) restent leur propriété ; en les publiant, ils accordent
          à la Plateforme une licence non exclusive d&apos;exploitation pour les besoins du service (affichage,
          promotion raisonnable du service). L&apos;Utilisateur garantit disposer des droits nécessaires sur les contenus
          transmis.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">13. Sécurité, fraude et sanctions</h2>
        <p className="mt-3 text-slate-600">
          La Plateforme peut limiter, suspendre ou clôturer un compte en cas de fraude ou de suspicion sérieuse, de
          non-respect des CGU ou des CGV, de comportement abusif envers d&apos;autres Utilisateurs ou de tentative
          d&apos;atteinte à la sécurité du service.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">14. Données personnelles</h2>
        <p className="mt-3 text-slate-600">
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/confidentialite" className="text-gs-orange hover:underline">
            politique de confidentialité
          </Link>
          . Les traceurs et cookies sont couverts par la{" "}
          <Link href="/cookies" className="text-gs-orange hover:underline">
            politique cookies
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">15. Responsabilité</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            La Plateforme s&apos;efforce d&apos;assurer la disponibilité du service mais ne garantit pas une absence totale
            d&apos;interruptions ni l&apos;adéquation du matériel loué aux besoins spécifiques du Client.
          </li>
          <li>
            Sauf faute lourde ou obligation légale impérative, la responsabilité de {siteConfig.name} ne saurait être
            engagée pour les dommages indirects ou pour les litiges nés exclusivement entre Prestataire et Client, sous
            réserve des stipulations des CGV concernant le rôle du service de paiement.
          </li>
          <li>
            La Plateforme n&apos;est pas responsable des dommages causés par le matériel loué, de son mauvais usage ou
            des événements survenant hors de son périmètre technique strict.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">16. Support</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question relative au fonctionnement du service :{" "}
          <a href="mailto:support@getsoundon.com" className="text-gs-orange hover:underline">
            support@getsoundon.com
          </a>
          . Merci d&apos;indiquer la référence de réservation ou le lien de l&apos;annonce et, si possible, des captures
          d&apos;écran.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">17. Modification des CGU</h2>
        <p className="mt-3 text-slate-600">
          Les CGU peuvent être mises à jour. La version applicable est celle publiée sur le site à la date d&apos;utilisation
          du service, sous réserve des dispositions impératives. Pour les réservations en cours, les documents acceptés au
          moment de la commande demeurent pertinents pour cette commande, complétés par les mises à jour légalement
          notifiées le cas échéant.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">18. Droit applicable</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGU sont régies par le droit français. En cas de litige relatif à l&apos;utilisation de la
          Plateforme, les parties rechercheront une solution amiable avant toute action judiciaire. Les tribunaux
          compétents sont déterminés conformément aux règles de droit commun, sous réserve d&apos;éventuelles dispositions
          impératives applicables aux consommateurs.
        </p>
      </section>

      <section className="mt-12 border-t border-slate-200 pt-10">
        <h2 className="text-xl font-semibold text-black">Documents liés</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <Link href="/cgv" className="text-gs-orange hover:underline">
              Conditions générales de vente (CGV)
            </Link>{" "}
            — paiement, annulation, caution, litiges et remboursements.
          </li>
          <li>
            <Link href="/confidentialite" className="text-gs-orange hover:underline">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <Link href="/cookies" className="text-gs-orange hover:underline">
              Politique de cookies
            </Link>
          </li>
          <li>
            <Link href="/mentions-legales" className="text-gs-orange hover:underline">
              Mentions légales
            </Link>
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          Le présent document est fourni à titre informatif et peut nécessiter une relecture juridique avant adoption
          définitive.
        </p>
      </section>
    </LegalPageLayout>
  );
}
