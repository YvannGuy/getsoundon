import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: `Conditions générales d'utilisation de la plateforme ${siteConfig.name}, politique d'annulation et politique litiges/caution.`,
  alternates: { canonical: buildCanonical("/cgu") },
};

export default function CGUPage() {
  return (
    <LegalPageLayout title="Conditions générales d'utilisation (CGU)">
      <p className="lead text-[16px] text-slate-600">
        <strong className="text-black">1) CGU — Conditions Générales d&apos;Utilisation</strong>
      </p>
      <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 03 mars 2026 à 22:37</p>
      <p className="text-sm text-slate-500">
        Support :{" "}
        <a href="mailto:contact@salledeculte.com" className="text-[#213398] hover:underline">
          contact@salledeculte.com
        </a>
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Objet</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGU définissent les règles d&apos;utilisation de salledeculte.com (la « Plateforme »), qui met en relation :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>des Propriétaires qui proposent des lieux ;</li>
          <li>des Organisateurs qui recherchent un lieu.</li>
        </ul>
        <p className="mt-3 text-slate-600">
          La Plateforme fournit des outils (annonces, demandes, messagerie, visites, offres, réservations, documents, état des lieux, litiges).
          Certaines fonctionnalités de paiement en ligne sont optionnelles.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Création de compte</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Vous devez fournir des informations exactes et à jour.</li>
          <li>Vous êtes responsable de la confidentialité de votre compte et de vos accès.</li>
          <li>Vous vous engagez à ne pas créer de compte frauduleux ni usurper une identité.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Rôle de la Plateforme (important)</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>La Plateforme est un intermédiaire technique.</li>
          <li>Elle ne possède pas les lieux et n&apos;organise pas les événements.</li>
          <li>Le Propriétaire reste responsable du lieu (disponibilité, conformité, sécurité, accès, règles, etc.).</li>
          <li>L&apos;Organisateur reste responsable du bon déroulement de son événement et du respect des règles.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Règles de publication (Propriétaires)</h2>
        <p className="mt-3 text-slate-600">En publiant une annonce, vous vous engagez à :</p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>fournir des informations claires (capacité, adresse/zone, règles, contraintes sonores, horaires),</li>
          <li>publier des photos représentatives,</li>
          <li>indiquer un prix cohérent,</li>
          <li>maintenir vos disponibilités à jour,</li>
          <li>ne pas publier de contenu trompeur ou illégal.</li>
        </ul>
        <p className="mt-3 text-slate-600">La Plateforme peut refuser ou retirer une annonce si elle est mensongère, non conforme, incomplète ou contraire à l&apos;objet du service.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Règles d&apos;échange (messagerie)</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Restez respectueux, clair et professionnel.</li>
          <li>Aucun harcèlement, menace, discrimination, contenu illégal.</li>
          <li>Évitez de sortir les échanges de la plateforme : les messages servent aussi de preuve en cas de litige.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Demandes, visites, offres, réservations</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>L&apos;Organisateur peut envoyer une demande et proposer une visite si l&apos;option est disponible.</li>
          <li>Le Propriétaire peut accepter ou refuser.</li>
          <li>Une Offre peut être envoyée via la messagerie (prix, dates, caution, annulation…).</li>
          <li>Une réservation est confirmée selon les règles de l&apos;Offre et, si applicable, après paiement.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7. Paiement en ligne (optionnel)</h2>
        <p className="mt-3 text-slate-600">
          Quand le paiement en ligne est utilisé :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>il est traité via un prestataire de paiement (Stripe Connect),</li>
          <li>les règles de paiement, d&apos;acompte, de solde, de caution et de délais s&apos;appliquent selon la CGV et la politique litige/caution.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8. Contenus & droits</h2>
        <p className="mt-3 text-slate-600">
          Vous restez propriétaire de vos contenus (photos/textes), mais vous accordez à la Plateforme le droit de les afficher pour le fonctionnement du service (site, app, marketing).
        </p>
        <p className="mt-3 text-slate-600">Vous garantissez détenir les droits nécessaires sur les contenus publiés.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9. Sécurité & fraude</h2>
        <p className="mt-3 text-slate-600">La Plateforme peut limiter, suspendre ou fermer un compte en cas de :</p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>fraude ou suspicion,</li>
          <li>non-respect des CGU/CGV,</li>
          <li>comportements abusifs,</li>
          <li>atteinte à la sécurité.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">10. Responsabilité</h2>
        <p className="mt-3 text-slate-600">La Plateforme n&apos;est pas responsable :</p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>des annulations décidées par les utilisateurs (sauf règles prévues),</li>
          <li>de l&apos;état réel des lieux,</li>
          <li>des dommages pendant l&apos;événement,</li>
          <li>des engagements pris hors plateforme.</li>
        </ul>
        <p className="mt-3 text-slate-600">
          La Plateforme s&apos;engage à fournir un service fonctionnel, mais ne garantit pas l&apos;absence d&apos;interruptions.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">11. Support</h2>
        <p className="mt-3 text-slate-600">
          Contact :{" "}
          <a href="mailto:contact@salledeculte.com" className="text-[#213398] hover:underline">
            contact@salledeculte.com
          </a>
        </p>
        <p className="mt-3 text-slate-600">Merci de préciser : lien de l&apos;annonce / référence réservation / captures utiles.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">12. Modification des CGU</h2>
        <p className="mt-3 text-slate-600">
          Les CGU peuvent évoluer. La version applicable est celle publiée sur le site au moment de l&apos;utilisation.
        </p>
      </section>

      <section className="mt-14 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-semibold text-black">2) Politique d&apos;annulation — salledeculte.com (V1)</h2>
        <p className="mt-3 text-slate-600">
          Objectif : une politique claire, standardisée, choisie par le propriétaire et acceptée par l&apos;organisateur avant paiement.
        </p>
        <h3 className="mt-5 text-lg font-semibold text-black">Qui choisit la politique ?</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Le Propriétaire choisit la politique applicable (dans l&apos;annonce ou dans l&apos;Offre).</li>
          <li>L&apos;Organisateur l&apos;accepte au moment du paiement.</li>
        </ul>
        <h3 className="mt-5 text-lg font-semibold text-black">Important</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Les frais de service (15 €) ne sont pas remboursables, sauf annulation imputable au Propriétaire.</li>
          <li>Les frais de traitement paiement (frais bancaires) peuvent ne pas être remboursables.</li>
          <li>La caution n&apos;est jamais une pénalité : si la prestation n&apos;a pas lieu, la caution est remboursée intégralement.</li>
        </ul>
        <h3 className="mt-5 text-lg font-semibold text-black">Politique FLEXIBLE</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Annulation &gt; J-7 : remboursement 100% de la location (acompte inclus)</li>
          <li>Annulation J-7 à J-2 : remboursement 50% de la location</li>
          <li>Annulation &lt; J-2 : remboursement 0% de la location</li>
        </ul>
        <h3 className="mt-5 text-lg font-semibold text-black">Politique STANDARD</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Annulation &gt; J-30 : 100%</li>
          <li>Annulation J-30 à J-15 : 50%</li>
          <li>Annulation &lt; J-15 : 0%</li>
        </ul>
        <h3 className="mt-5 text-lg font-semibold text-black">Politique STRICT</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>Annulation &gt; J-90 : 100%</li>
          <li>Annulation J-90 à J-30 : 50%</li>
          <li>Annulation &lt; J-30 : 0%</li>
        </ul>
        <h3 className="mt-5 text-lg font-semibold text-black">Cas particuliers</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>No-show (Organisateur ne vient pas) : traité comme annulation tardive (0%).</li>
          <li>Changement de date : traité comme annulation + nouvelle réservation (pas de report en V1).</li>
          <li>Annulation par le Propriétaire : remboursement 100% location + 100% caution + frais de service (15 €), et frais de traitement dans la mesure du possible.</li>
        </ul>
      </section>

      <section className="mt-14 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-semibold text-black">3) Politique Litiges & Caution — salledeculte.com (V1)</h2>
        <h3 className="mt-5 text-lg font-semibold text-black">Délais à retenir (ponctuel)</h3>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>J-7 : prélèvement du solde + caution (si acompte)</li>
          <li>48h après la fin (heure de fin de l&apos;offre) : délai pour déclarer un incident</li>
          <li>J+3 : paiement location libéré au propriétaire si aucun incident</li>
          <li>J+7 : caution remboursée automatiquement si aucun incident</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-black">A) Caution (dépôt de garantie)</h3>
        <h4 className="mt-4 font-semibold text-black">À quoi sert la caution ?</h4>
        <p className="mt-2 text-slate-600">
          La caution sert à couvrir d&apos;éventuels dommages ou manquements (dégradation, nettoyage exceptionnel, etc.). Ce n&apos;est pas une pénalité.
        </p>
        <h4 className="mt-4 font-semibold text-black">Quand est-elle prélevée ?</h4>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>Paiement 100% : caution prélevée au paiement (si prévue)</li>
          <li>Acompte + solde : caution prélevée à J-7 (avec le solde)</li>
        </ul>
        <h4 className="mt-4 font-semibold text-black">Quand est-elle remboursée ?</h4>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>Ponctuel : remboursée automatiquement au plus tard à J+7 si aucun incident déclaré</li>
          <li>Mensuel : restituée sous 14 jours après fin du contrat mensuel + état des lieux conforme</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-black">B) Litiges (incidents) — process</h3>
        <h4 className="mt-4 font-semibold text-black">1) Définition de “fin d&apos;événement”</h4>
        <p className="mt-2 text-slate-600">La fin d&apos;événement = heure de fin indiquée dans l&apos;Offre. C&apos;est elle qui déclenche le délai.</p>
        <h4 className="mt-4 font-semibold text-black">2) Délai de déclaration</h4>
        <p className="mt-2 text-slate-600">Le Propriétaire peut déclarer un incident jusqu&apos;à 48h après la fin d&apos;événement.</p>
        <h4 className="mt-4 font-semibold text-black">3) Preuves (obligatoires)</h4>
        <p className="mt-2 text-slate-600">Pour qu&apos;une retenue sur caution soit possible, il faut :</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>photos pertinentes (avant/après si possible),</li>
          <li>explication claire,</li>
          <li>cohérence avec les échanges dans la messagerie.</li>
        </ul>
        <p className="mt-2 text-slate-600">Sans preuve : retenue impossible.</p>
        <h4 className="mt-4 font-semibold text-black">4) Statuts litige</h4>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>Incident déclaré</li>
          <li>En discussion</li>
          <li>Résolu</li>
          <li>Retenue caution / remboursement</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-black">C) Paiement propriétaire (payout)</h3>
        <p className="mt-2 text-slate-600">Paiement de la location (ponctuel) :</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>Si aucun incident déclaré sous 48h → paiement location libéré à J+3</li>
          <li>Si incident déclaré → paiement peut être suspendu jusqu&apos;à résolution</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-black">D) Checklist simple</h3>
        <h4 className="mt-4 font-semibold text-black">Organisateur</h4>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>Avant : prendre quelques photos si demandé (ou via l&apos;outil EDL)</li>
          <li>Après : photos de sortie si possible</li>
          <li>Garder les échanges dans la messagerie</li>
        </ul>
        <h4 className="mt-4 font-semibold text-black">Propriétaire</h4>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
          <li>Avant : photos d&apos;entrée (zones sensibles)</li>
          <li>Après : photos de sortie</li>
          <li>En cas de souci : déclarer dans les 48h, avec preuves</li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-black">Liens utiles</h2>
        <p className="mt-3 text-slate-600">
          Les conditions financières détaillées restent définies dans les{" "}
          <a href="/cgv" className="text-[#213398] hover:underline">
            CGV
          </a>
          . La politique de confidentialité est disponible sur{" "}
          <a href="/confidentialite" className="text-[#213398] hover:underline">
            /confidentialite
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
