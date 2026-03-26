import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales et informations sur l'éditeur du site ${siteConfig.name}.`,
  alternates: { canonical: buildCanonical("/mentions-legales") },
};

export default function MentionsLegalesPage() {
  const { editeur, directeurPublication, hebergeur } = legalConfig;
  const adresseComplete = `${editeur.siegeSocial.adresse}, ${editeur.siegeSocial.codePostal} ${editeur.siegeSocial.ville}, ${editeur.siegeSocial.pays}`;

  return (
    <LegalPageLayout title="Mentions légales">
      <p className="lead text-[16px] text-slate-600">
        Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
        numérique (LCEN), vous trouverez ci-dessous les informations relatives à l&apos;éditeur et à l&apos;hébergeur
        du site {siteConfig.name}.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Éditeur du site</h2>
        <p className="mt-3 text-slate-600">
          Le site {siteConfig.url} est édité par :
        </p>
        <address className="mt-4 not-italic text-slate-600">
          <strong className="text-black">{editeur.nom}</strong>
          <br />
          Capital social : {editeur.capitalSocial}
          <br />
          SIRET : {editeur.siret}
          <br />
          {editeur.rcs}
          <br />
          {adresseComplete}
          <br />
          {editeur.tvaIntracommunautaire
            ? `TVA intracommunautaire : ${editeur.tvaIntracommunautaire}`
            : "TVA : non assujetti"}
          <br />
          <a href={`mailto:${editeur.email}`} className="text-gs-orange hover:underline">
            {editeur.email}
          </a>
        </address>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Directeur de la publication</h2>
        <p className="mt-3 text-slate-600">
          Le directeur de la publication du site est : <strong className="text-black">{directeurPublication}</strong>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Hébergeur</h2>
        <p className="mt-3 text-slate-600">
          Le site est hébergé par :
        </p>
        <address className="mt-4 not-italic text-slate-600">
          <strong className="text-black">{hebergeur.nom}</strong>
          <br />
          {hebergeur.adresse}
          <br />
          <a href={hebergeur.site} target="_blank" rel="noopener noreferrer" className="text-gs-orange hover:underline">
            {hebergeur.site}
          </a>
        </address>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Propriété intellectuelle</h2>
        <p className="mt-3 text-slate-600">
          L&apos;ensemble du contenu de ce site (textes, images, logos, icônes, sons, logiciels, etc.) est protégé par
          le droit d&apos;auteur et le droit des marques. Toute reproduction, représentation, modification, adaptation ou
          exploitation, intégrale ou partielle, sans l&apos;accord préalable écrit de {editeur.nom} est interdite et
          constitutive de contrefaçon.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Limitation de responsabilité</h2>
        <p className="mt-3 text-slate-600">
          {editeur.nom} s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur
          ce site. Toutefois, {editeur.nom} ne peut garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des
          informations mises à disposition. En conséquence, {editeur.nom} décline toute responsabilité pour toute
          imprécision, inexactitude ou omission.
        </p>
        <p className="mt-3 text-slate-600">
          Les liens hypertextes vers d&apos;autres sites ne engagent pas la responsabilité de {editeur.nom} quant au
          contenu de ces sites externes.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Contact</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question relative aux mentions légales, vous pouvez nous contacter à :{" "}
          <a href={`mailto:${editeur.email}`} className="text-gs-orange hover:underline">
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
