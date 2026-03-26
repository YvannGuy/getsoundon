import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: `Conditions générales de vente des services payants de ${siteConfig.name} et règles de paiement.`,
  alternates: { canonical: buildCanonical("/cgv") },
};

export default function CGVPage() {
  return (
    <LegalPageLayout title="Conditions générales de vente (CGV)">
      <p className="lead text-[16px] text-slate-600">
        <strong className="text-black">CONDITIONS GENERALES DE VENTE (CGV) - GetSoundOn</strong>
      </p>
      <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 03 mars 2026 à 22:37</p>
      <p className="text-sm text-slate-500">
        Contact :{" "}
        <a href="mailto:contact@getsoundon.com" className="text-[#213398] hover:underline">
          contact@getsoundon.com
        </a>
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1) Objet</h2>
        <p className="mt-3 text-slate-600">Les presentes CGV encadrent les conditions de vente des services payants proposes par GetSoundOn (ci-apres « la Plateforme »), notamment :</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>l&apos;accès aux fonctionnalités de mise en relation et d&apos;outils de gestion ;</li>
          <li>le paiement en ligne optionnel des locations (acompte / solde / caution) ;</li>
          <li>la génération et l&apos;accès aux documents liés aux transactions (reçu/facture, contrat, historique).</li>
        </ul>
        <p className="mt-3 text-slate-600">
          Les services de location du lieu sont fournis par les Propriétaires (loueurs). La Plateforme agit comme intermédiaire technique.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2) Définitions</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>Organisateur : utilisateur recherchant un lieu et initiant une demande/visite/offre.</li>
          <li>Propriétaire : utilisateur proposant un lieu et répondant aux demandes.</li>
          <li>Offre : proposition envoyée par le Propriétaire (prix, dates, conditions, caution, annulation).</li>
          <li>Réservation : confirmation de location après acceptation de l&apos;Offre et paiement (total ou acompte).</li>
          <li>Caution : dépôt de garantie remboursable selon les règles ci-dessous.</li>
          <li>Fin d&apos;événement : heure de fin indiquée dans l&apos;Offre (déclenche le délai litige de 48h).</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3) Fonctionnement de la Plateforme</h2>
        <h3 className="mt-4 text-lg font-semibold text-black">3.1 Mise en relation</h3>
        <p className="mt-3 text-slate-600">
          L&apos;Organisateur consulte une fiche lieu, peut organiser une visite (si proposé), puis échange avec le Propriétaire via la messagerie.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">3.2 Offre → Paiement</h3>
        <p className="mt-3 text-slate-600">
          Le Propriétaire peut envoyer une Offre depuis la messagerie. L&apos;Organisateur peut accepter l&apos;Offre et régler via la Plateforme (si le paiement en ligne est activé et/ou proposé).
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">3.3 Contrat standard</h3>
        <p className="mt-3 text-slate-600">Avant tout paiement, un contrat standard GetSoundOn est affiche et doit etre accepte.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4) Tarifs, frais et affichage</h2>
        <h3 className="mt-4 text-lg font-semibold text-black">4.1 Prix de location</h3>
        <p className="mt-3 text-slate-600">
          Le prix de location est fixé par le Propriétaire dans l&apos;Offre.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">4.2 Frais de service Plateforme (fixe)</h3>
        <p className="mt-3 text-slate-600">
          Des frais de service fixes de 15 € peuvent s&apos;appliquer à chaque paiement. Ils sont affichés avant validation et couvrent l&apos;utilisation des services de la Plateforme (mise en relation, messagerie, outils, assistance, sécurisation du processus).
        </p>
        <p className="mt-3 text-slate-600">Sauf annulation imputable au Propriétaire, les frais de service ne sont pas remboursables.</p>
        <h3 className="mt-4 text-lg font-semibold text-black">4.3 Frais de traitement du paiement (variable)</h3>
        <p className="mt-3 text-slate-600">
          Des frais de traitement peuvent s&apos;ajouter, correspondant aux frais bancaires liés au paiement sécurisé (carte, validation, traitement, protection antifraude). Ils sont affichés au paiement.
        </p>
        <p className="mt-3 text-slate-600">
          Important : en cas de paiement en plusieurs fois (ex : acompte + solde), ces frais peuvent s&apos;appliquer à chaque paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5) Paiement en ligne (optionnel) & modes de règlement</h2>
        <p className="mt-3 text-slate-600">
          Le paiement via la Plateforme peut être optionnel selon le choix du Propriétaire et les fonctionnalités activées.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">5.1 Location ponctuelle — 2 modes</h3>
        <p className="mt-3 text-slate-600">
          A) Paiement total (100%) : paiement immédiat location + frais (service + traitement) + caution si prévue.
        </p>
        <p className="mt-3 text-slate-600">
          B) Acompte 30% + solde automatique à J-7 : paiement initial 30% du montant location + frais, puis solde 70% à J-7 avant le début de la réservation. La caution (si prévue) est capturée à J-7.
        </p>
        <p className="mt-3 text-slate-600">
          En acceptant, l&apos;Organisateur autorise les prélèvements automatiques à J-7 sur le moyen de paiement enregistré.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">5.2 Location mensuelle</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>Paiement mensuel à l&apos;avance selon l&apos;Offre.</li>
          <li>Frais de service : 15 € par paiement (sauf mention différente).</li>
          <li>Caution mensuelle : recommandée à 1 mois (option 2 mois selon risque), restitution sous 14 jours après fin du contrat mensuel, sous réserve d&apos;état conforme et absence de litige.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6) Caution (dépôt de garantie)</h2>
        <h3 className="mt-4 text-lg font-semibold text-black">6.1 Principes</h3>
        <p className="mt-3 text-slate-600">
          La caution est remboursable et n&apos;est pas une pénalité. Si la location n&apos;a pas lieu (annulation), la caution est remboursée intégralement.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">6.2 Ponctuel — délais</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>Incident déclarable par le Propriétaire jusqu&apos;à 48h après la fin d&apos;événement.</li>
          <li>Sans incident déclaré dans ce délai : caution remboursée automatiquement au plus tard à J+7.</li>
        </ul>
        <h3 className="mt-4 text-lg font-semibold text-black">6.3 Retenue de caution — règle de preuve</h3>
        <p className="mt-3 text-slate-600">
          Toute retenue de caution doit être justifiée. Sans preuve suffisante (photos + explication cohérente + échanges), la retenue est impossible.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7) Litiges (incidents) — procédure</h2>
        <h3 className="mt-4 text-lg font-semibold text-black">7.1 Fenêtre de déclaration</h3>
        <p className="mt-3 text-slate-600">
          Le Propriétaire peut déclarer un incident jusqu&apos;à 48 heures après la fin d&apos;événement (heure de fin indiquée dans l&apos;Offre).
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">7.2 Preuves</h3>
        <p className="mt-3 text-slate-600">
          Le Propriétaire doit fournir des éléments (photos avant/après si possible, description, échanges).
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">7.3 Statuts</h3>
        <p className="mt-3 text-slate-600">Incident déclaré → En discussion → Résolu → Retenue / Remboursement.</p>
        <h3 className="mt-4 text-lg font-semibold text-black">7.4 Conséquences</h3>
        <p className="mt-3 text-slate-600">
          Sans incident déclaré dans les 48h : la prestation est présumée conforme. En cas d&apos;incident déclaré : la Plateforme peut suspendre temporairement certains flux (caution / libération paiement) le temps de la résolution.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8) Versement au Propriétaire (payout)</h2>
        <p className="mt-3 text-slate-600">En cas de paiement via la Plateforme :</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>Les fonds destinés au Propriétaire sont libérés à J+3 après la fin d&apos;événement, si aucun incident n&apos;a été déclaré dans le délai de 48h.</li>
          <li>En cas d&apos;incident déclaré : libération possible après résolution.</li>
        </ul>
        <p className="mt-3 text-slate-600">
          Note : les délais exacts de réception sur le compte bancaire dépendent des délais Stripe et de la banque.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9) Annulation & remboursement (location ponctuelle)</h2>
        <p className="mt-3 text-slate-600">
          Le Propriétaire choisit une politique d&apos;annulation applicable à l&apos;Offre : Flexible / Standard / Strict. L&apos;Organisateur l&apos;accepte avant paiement.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">9.1 Règle générale (acompte remboursable selon politique)</h3>
        <p className="mt-3 text-slate-600">
          Si un remboursement est dû, il s&apos;applique aux sommes versées au titre de la location (acompte inclus) selon le pourcentage prévu.
          Les frais de service (15€) ne sont pas remboursables, sauf annulation imputable au Propriétaire.
          La caution est toujours remboursée intégralement si la prestation n&apos;a pas lieu.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-black">9.2 Politiques standard</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>Flexible : J-7 = 100% location ; J-7 à J-2 = 50% location ; &lt; J-2 = 0% location.</li>
          <li>Standard : J-30 = 100% ; J-30 à J-15 = 50% ; &lt; J-15 = 0%.</li>
          <li>Strict : J-90 = 100% ; J-90 à J-30 = 50% ; &lt; J-30 = 0%.</li>
        </ul>
        <h3 className="mt-4 text-lg font-semibold text-black">9.3 Cas particuliers</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>No-show Organisateur : traité comme annulation tardive → remboursement 0% location.</li>
          <li>Changement de date : annulation + nouvelle réservation (pas de report en V1).</li>
          <li>Annulation par le Propriétaire : remboursement 100% location + 100% caution + frais de service 15€ (dans la mesure du possible).</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">10) Paiement en plusieurs fois : acompte + solde</h2>
        <p className="mt-3 text-slate-600">Si l&apos;Offre prévoit un acompte :</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>l&apos;acompte bloque la date selon les conditions du Propriétaire ;</li>
          <li>le solde est prélevé automatiquement à J-7 (sauf conditions différentes dans l&apos;Offre) ;</li>
          <li>le remboursement éventuel (acompte inclus) suit la politique d&apos;annulation (§9).</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">11) Documents : contrat, facture / reçu</h2>
        <p className="mt-3 text-slate-600">Après un paiement via la Plateforme, l&apos;Organisateur peut accéder à :</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>un reçu / facture (selon le moyen de paiement) ;</li>
          <li>le contrat standard accepté ;</li>
          <li>l&apos;historique des transactions dans « Paiement » et « Contrat & facture ».</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">12) Responsabilité</h2>
        <p className="mt-3 text-slate-600">
          La Plateforme fournit un service technique (mise en relation, outils, paiement optionnel). Le Propriétaire demeure responsable de l&apos;exécution matérielle de la location, de l&apos;état du lieu, de la conformité, de la sécurité et des règles appliquées.
        </p>
        <p className="mt-3 text-slate-600">La Plateforme ne saurait être tenue responsable des manquements contractuels entre Organisateur et Propriétaire, ni des dommages survenus pendant l&apos;événement, hors faute prouvée de la Plateforme dans l&apos;exécution de ses services.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">13) Support</h2>
        <p className="mt-3 text-slate-600">
          Support :{" "}
          <a href="mailto:contact@getsoundon.com" className="text-[#213398] hover:underline">
            contact@getsoundon.com
          </a>
        </p>
        <p className="mt-3 text-slate-600">Le support peut demander des éléments (captures, preuve, références d&apos;offre) pour traiter une demande.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">14) Modifications</h2>
        <p className="mt-3 text-slate-600">
          La Plateforme peut modifier les CGV. La version applicable est celle en vigueur à la date d&apos;acceptation au moment du paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">15) Droit applicable — Litiges</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGV sont soumises au droit français. En cas de différend, les parties privilégient une résolution amiable avant toute action judiciaire.
        </p>
      </section>

      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-black">Bonus (microcopy checkout)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Frais de service (15€) : « Couvre l’utilisation de la plateforme : mise en relation, messagerie, outils et assistance. »</li>
          <li>Frais de traitement : « Frais bancaires liés au paiement sécurisé. Peuvent s’appliquer à chaque paiement (acompte + solde). »</li>
          <li>Acompte : « Remboursable selon la politique d’annulation choisie. »</li>
          <li>Caution : « Remboursable. Sans incident déclaré sous 48h, remboursée automatiquement sous 7 jours. »</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}
