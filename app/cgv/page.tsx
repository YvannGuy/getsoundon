import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: `Conditions générales de vente des services payants de ${siteConfig.name}.`,
  alternates: { canonical: buildCanonical("/cgv") },
};

export default function CGVPage() {
  const { editeur, mediation } = legalConfig;

  return (
    <LegalPageLayout title="Conditions générales de vente (CGV)">
      <p className="lead text-[16px] text-slate-600">
        Les présentes Conditions Générales de Vente (ci-après « CGV ») encadrent les services payants proposés sur{" "}
        {siteConfig.name}. Elles s&apos;appliquent à toute transaction conclue via la plateforme.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 1 – Objet</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGV définissent les conditions financières et contractuelles applicables aux réservations de
          salles réalisées via la plateforme {siteConfig.name}, incluant les frais de service, le paiement, la
          caution (empreinte bancaire), l&apos;annulation et le traitement des litiges.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 2 – Identité du vendeur des services plateforme</h2>
        <p className="mt-3 text-slate-600">
          Les services de plateforme sont fournis par :
        </p>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">{editeur.nom}</strong>
          <br />
          SIRET : {editeur.siret}
          <br />
          {editeur.rcs}
          <br />
          {editeur.siegeSocial.adresse}, {editeur.siegeSocial.codePostal} {editeur.siegeSocial.ville}
          <br />
          TVA : non assujetti
          <br />
          Contact :{" "}
          <a href={`mailto:${editeur.email}`} className="text-[#213398] hover:underline">
            {editeur.email}
          </a>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 3 – Champ d&apos;application</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGV s&apos;appliquent aux utilisateurs majeurs (18 ans minimum), juridiquement capables, pour
          des locations situées en France métropolitaine. Les propriétaires référencés sur la plateforme sont des
          professionnels.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 4 – Formation du contrat de réservation</h2>
        <p className="mt-3 text-slate-600">
          Le propriétaire émet une offre précisant notamment le prix, les dates et, le cas échéant, le montant de la
          caution. La réservation est formée lorsque l&apos;organisateur accepte l&apos;offre et effectue le paiement
          via Stripe.
        </p>
        <p className="mt-3 text-slate-600">
          Les montants sont indiqués en euros TTC. La preuve de transaction est constituée par les enregistrements
          électroniques de la plateforme et des prestataires de paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 5 – Prix, frais de service et paiement</h2>
        <p className="mt-3 text-slate-600">
          Le prix de location est fixé par le propriétaire. La plateforme applique des frais de service fixes de 15 €
          par réservation, facturés à l&apos;organisateur.
        </p>
        <p className="mt-3 text-slate-600">
          Les paiements sont sécurisés et réalisés via Stripe Connect. La plateforme peut refuser ou suspendre une
          transaction en cas d&apos;anomalie, de fraude suspectée, ou d&apos;obligation légale.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 6 – Caution par empreinte bancaire</h2>
        <p className="mt-3 text-slate-600">
          Lorsque le propriétaire prévoit une caution, celle-ci est mise en place sous forme d&apos;empreinte bancaire
          (autorisation), sans débit immédiat.
        </p>
        <p className="mt-3 text-slate-600">
          À l&apos;issue de la location, la caution est soit libérée, soit partiellement/totalement retenue en cas de
          dommages justifiés et après arbitrage administratif interne.
        </p>
        <p className="mt-3 text-slate-600">
          Toute demande de retenue doit être documentée (photos, description des dommages, et idéalement devis ou
          facture) et transmise dans un délai raisonnable après la fin de location. En l&apos;absence de justificatifs
          suffisants, la caution est libérée.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 7 – Annulation et remboursement</h2>
        <p className="mt-3 text-slate-600">
          Les conditions d&apos;annulation applicables à la location sont définies par le propriétaire dans l&apos;offre
          et/ou le contrat transmis avant paiement.
        </p>
        <p className="mt-3 text-slate-600">
          En cas d&apos;annulation imputable au propriétaire (indisponibilité, double réservation, inexécution), les
          sommes payées par l&apos;organisateur sont remboursées selon les modalités Stripe, hors cas de faute de
          l&apos;organisateur.
        </p>
        <p className="mt-3 text-slate-600">
          En cas d&apos;annulation imputable à l&apos;organisateur, le remboursement dépend des conditions prévues par le
          propriétaire et acceptées avant paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 8 – Droit de rétractation</h2>
        <p className="mt-3 text-slate-600">
          Pour les utilisateurs consommateurs, le droit de rétractation peut ne pas s&apos;appliquer lorsque le service
          est pleinement exécuté avant la fin du délai légal, après accord exprès et renoncement exprès au droit de
          rétractation.
        </p>
        <p className="mt-3 text-slate-600">
          Cette renonciation est matérialisée lors de l&apos;acceptation des documents contractuels et du paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 9 – Responsabilité</h2>
        <p className="mt-3 text-slate-600">
          La plateforme agit en tant qu&apos;intermédiaire technique. Elle n&apos;est pas responsable des dommages
          survenus pendant l&apos;occupation de la salle, de la conformité des locaux, ni des obligations propres aux
          parties liées au contrat de location.
        </p>
        <p className="mt-3 text-slate-600">
          Chaque partie demeure responsable de ses assurances, autorisations, obligations fiscales et réglementaires.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 10 – Litiges et médiation</h2>
        <p className="mt-3 text-slate-600">
          En cas de litige, les parties s&apos;engagent à rechercher d&apos;abord une solution amiable. L&apos;utilisateur
          consommateur peut recourir gratuitement à un médiateur de la consommation :
        </p>
        <p className="mt-2 text-slate-600">
          {mediation.nom} – {mediation.url}
        </p>
        <p className="mt-3 text-sm text-amber-700">
          Cette information doit être remplacée par un médiateur effectivement désigné avant mise en ligne.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 11 – Droit applicable</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGV sont soumises au droit français. À défaut d&apos;accord amiable, le litige est porté devant
          les juridictions compétentes selon les règles légales applicables.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 12 – Contact</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question relative aux présentes CGV :{" "}
          <a href={`mailto:${editeur.email}`} className="text-[#213398] hover:underline">
            {editeur.email}
          </a>
        </p>
      </section>

      <p className="mt-12 text-sm text-slate-500">Dernière mise à jour : février 2026.</p>
    </LegalPageLayout>
  );
}
