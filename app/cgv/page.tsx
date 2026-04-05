import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: `${siteConfig.name} — CGV : réservation, paiement (Stripe), frais, caution, annulation, incidents, virement prestataire et facturation.`,
  alternates: { canonical: buildCanonical("/cgv") },
};

export default function CGVPage() {
  return (
    <LegalPageLayout title="Conditions générales de vente (CGV)">
      <p className="lead text-[16px] text-slate-600">
        <strong className="text-black">Conditions générales de vente et conditions financières</strong> — {siteConfig.name}
      </p>
      <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 5 avril 2026</p>
      <p className="text-sm text-slate-500">
        Support :{" "}
        <a href="mailto:support@getsoundon.com" className="text-gs-orange hover:underline">
          support@getsoundon.com
        </a>
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Préambule</h2>
        <p className="mt-3 text-slate-600">
          Les présentes CGV complètent les{" "}
          <Link href="/cgu" className="text-gs-orange hover:underline">
            conditions générales d&apos;utilisation (CGU)
          </Link>
          . Elles encadrent les aspects financiers et contractuels des réservations de location de matériel (et, le cas
          échéant, de prestations associées explicitement prévues sur l&apos;Annonce ou la Réservation), lorsque le
          paiement ou la réservation passent par la Plateforme {siteConfig.name} (la « Plateforme »).
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Document fourni à titre de base contractuelle ; une validation par un conseil juridique reste recommandée.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 1 — Objet</h2>
        <p className="mt-3 text-slate-600">Les présentes CGV ont pour objet de définir les droits et obligations des parties dans le cadre :</p>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-600">
          <li>de la conclusion et de l&apos;exécution des Réservations ;</li>
          <li>du paiement et, le cas échéant, de la sécurisation des fonds via un prestataire de paiement agréé (notamment Stripe, y compris Stripe Connect) ;</li>
          <li>de la caution ou dépôt de garantie lorsqu&apos;il est prévu ;</li>
          <li>des annulations et remboursements ;</li>
          <li>des incidents et litiges ;</li>
          <li>du virement au Prestataire ;</li>
          <li>de la facturation et des documents comptables associés.</li>
        </ol>
        <p className="mt-3 text-slate-600">
          Elles s&apos;appliquent sans préjudice des dispositions légales et réglementaires impératives, notamment en matière
          de consommation.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 2 — Définitions</h2>
        <p className="mt-3 text-slate-600">
          Les termes ci-dessous, lorsqu&apos;ils sont employés avec une majuscule dans les présentes, ont la signification
          suivante :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Plateforme</strong> : le site, l&apos;application et les services fournis par{" "}
            {siteConfig.name}.
          </li>
          <li>
            <strong className="text-black">Prestataire</strong> : utilisateur proposant à la location du Matériel via une Annonce.
          </li>
          <li>
            <strong className="text-black">Client</strong> ou <strong className="text-black">Réservataire</strong> : utilisateur effectuant une Réservation.
          </li>
          <li>
            <strong className="text-black">Annonce</strong> : fiche descriptive du Matériel, des modalités de mise à disposition, du prix, des options, de la politique d&apos;annulation affichée et, le cas échéant, du montant de Caution.
          </li>
          <li>
            <strong className="text-black">Réservation</strong> : engagement entre le Prestataire et le Client portant sur la location du Matériel pour une période déterminée, formalisé par les informations validées sur la Plateforme.
          </li>
          <li>
            <strong className="text-black">Matériel</strong> : biens mobiliers objet de la location.
          </li>
          <li>
            <strong className="text-black">Prix de location</strong> : rémunération due au Prestataire pour la location, hors Frais de service Client (le cas échéant) et hors Caution.
          </li>
          <li>
            <strong className="text-black">Frais de service</strong> : rémunération de la Plateforme payée par le Client en sus du Prix de location, selon le taux affiché avant paiement.
          </li>
          <li>
            <strong className="text-black">Commission plateforme</strong> : rémunération prélevée par la Plateforme sur le Prix de location pour l&apos;intermédiation et les moyens de paiement.
          </li>
          <li>
            <strong className="text-black">Caution</strong> : somme donnée en garantie, distincte du Prix de location, encadrée aux articles 9 et 12.
          </li>
          <li>
            <strong className="text-black">Incident</strong> : contestation relative à l&apos;état du Matériel, à son utilisation ou à l&apos;exécution de la Réservation, déclarée selon l&apos;article 12.
          </li>
          <li>
            <strong className="text-black">Stripe</strong> : prestataire de services de paiement utilisé pour
            l&apos;encaissement et les virements.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 3 — Champ d&apos;application</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">3.1.</strong> Les présentes CGV s&apos;appliquent à toute Réservation pour laquelle le Client et le Prestataire utilisent la Plateforme et un paiement en ligne est réalisé via les parcours proposés (notamment Stripe Checkout).
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">3.2.</strong> Toute réservation conclue hors Plateforme ou sans recours au paiement en ligne proposé relève exclusivement des accords directs entre le Client et le Prestataire ; la Plateforme n&apos;en garantit ni l&apos;exécution ni le recouvrement.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">3.3.</strong> Le Client reconnaît avoir pris connaissance des CGU, des présentes CGV, de l&apos;Annonce et des informations affichées avant le paiement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 4 — Rôle de la Plateforme</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">4.1.</strong> {siteConfig.name} agit en qualité d&apos;opérateur de plateforme en ligne mettant en relation le Prestataire et le Client. Sauf stipulation expresse conforme à la réalité juridique de l&apos;opération, la Plateforme n&apos;est pas propriétaire du Matériel, ne loue pas le Matériel en son nom propre et n&apos;exécute pas la mise à disposition physique du Matériel.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">4.2.</strong> La Plateforme fournit notamment la mise en ligne des Annonces, des outils de messagerie, l&apos;enregistrement des Réservations, le traitement technique des paiements via Stripe, le suivi des statuts et les mécanismes de déclaration d&apos;Incident.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">4.3.</strong> Les fonds correspondant au Prix de location et aux Frais de service sont encaissés via Stripe. La Commission plateforme est retenue sur le Prix de location (article 6). Le solde dû au Prestataire fait l&apos;objet d&apos;un virement selon l&apos;article 13.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">4.4.</strong> La Plateforme ne garantit pas la disponibilité permanente du service, l&apos;adéquation du Matériel à un usage particulier, ni l&apos;absence d&apos;erreur dans les contenus publiés par les utilisateurs.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 5 — Création et validation d&apos;une Réservation</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">5.1.</strong> La Réservation est formée à partir des éléments affichés sur la Plateforme : Matériel, période, Prix de location, options, politique d&apos;annulation, Caution éventuelle, modalités de remise et de retour.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">5.2.</strong> Selon le paramétrage de l&apos;Annonce : en mode « demande », la Réservation n&apos;est ferme qu&apos;après acceptation par le Prestataire ; en réservation instantanée, elle peut être ferme dès validation par le Client, sous réserve du paiement lorsqu&apos;il est requis.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">5.3.</strong> Lorsque le paiement en ligne est obligatoire pour confirmer la Réservation, celle-ci n&apos;est définitivement validée qu&apos;après confirmation du paiement par le prestataire de paiement.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">5.4.</strong> Les données enregistrées sur la Plateforme (horodatages, montants, statuts, messages liés à la Réservation dans la mesure autorisée) font foi entre les parties et à l&apos;égard de la Plateforme, sauf preuve contraire et sous réserve des droits des consommateurs.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 6 — Prix, frais de service, commission</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">6.1.</strong> Le Prix de location est fixé par le Prestataire et affiché avant validation de la Réservation.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">6.2.</strong> Des Frais de service peuvent être ajoutés en sus du Prix de location. Leur montant ou taux, le détail et le total dû sont affichés avant paiement. À la date des présentes, le taux de référence appliqué sur la Plateforme est de{" "}
          <strong className="text-black">trois pour cent (3 %)</strong> du Prix de location (arrondi selon les règles du système de paiement).
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">6.3.</strong> La Commission plateforme est calculée sur le Prix de location (et non sur les Frais de service Client). À la date des présentes, le taux de référence est de{" "}
          <strong className="text-black">quinze pour cent (15 %)</strong> du Prix de location ; le montant net versé au Prestataire correspond au Prix de location diminué de cette Commission.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">6.4.</strong> Les montants sont présentés tels qu&apos;affichés sur la Plateforme au moment de la commande (TTC ou HT selon le cas applicable). Le Prestataire demeure responsable de la conformité fiscale de ses prix et de sa facturation lorsqu&apos;il y est tenu.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">6.5.</strong> Des frais bancaires ou de traitement peuvent être appliqués par les réseaux ou Stripe (notamment en cas de remboursement ou de litige). S&apos;ils ne sont pas remboursables par le prestataire de paiement, ils peuvent affecter le montant restitué au Client.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 7 — Paiement de la Réservation</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">7.1.</strong> Le paiement s&apos;effectue par les moyens proposés par Stripe Checkout. Le Client autorise le débit du montant total affiché.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">7.2.</strong> Sauf mention contraire sur le parcours de paiement, le Client règle en une fois le Prix de location et les Frais de service (et les postes listés explicitement au Checkout).
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">7.3.</strong> Si la Plateforme proposait ultérieurement un échéancier (acompte puis solde), les montants, dates et conséquences en cas de défaut figureraient expressément sur le parcours de paiement et prévaudraient pour ces seuls éléments sur la présente version générale.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">7.4.</strong> Tout paiement refusé ou incomplet empêche la validation définitive de la Réservation.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">7.5.</strong> Le virement au Prestataire suppose un compte Stripe Connect valide et conforme ; à défaut, la Plateforme peut suspendre l&apos;encaissement ou la finalisation de la Réservation.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 8 — Acompte, solde et échéancier</h2>
        <p className="mt-3 text-slate-600">
          Le flux standard de réservation matériel sur la Plateforme prévoit un règlement unique au moment du Checkout. Lorsqu&apos;un échéancier différent serait proposé, les modalités affichées au moment de la commande prévalent. Les références à un acompte et à un solde dans les présentes CGV s&apos;appliquent uniquement si et dans la mesure où un tel parcours est effectivement activé et accepté par le Client.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 9 — Caution / dépôt de garantie</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">9.1.</strong> La Caution n&apos;est ni un prix de location ni une pénalité forfaitaire au sens d&apos;une sanction contractuelle autonome. Elle constitue une garantie permettant, le cas échéant, de couvrir des dommages ou manquements liés à la Réservation, dans le respect du droit applicable.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">9.2.</strong> Le montant est indiqué sur l&apos;Annonce et/ou avant validation du paiement. Son absence vaut absence de Caution gérée via la Plateforme.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">9.3.</strong> Lorsqu&apos;une Caution est requise, la Plateforme met en œuvre via Stripe un mécanisme d&apos;autorisation de paiement (empreinte) sur une intention de paiement distincte, en capture manuelle, de sorte que la somme n&apos;est pas débitée immédiatement sur le compte du Client sauf décision de capture conformément au présent article et aux capacités techniques de Stripe.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">9.4.</strong> En l&apos;absence d&apos;Incident ouvert dans les conditions de l&apos;article 12 et sous réserve des délais bancaires, l&apos;empreinte est levée ou la Caution restituée selon les délais calculés à partir de la fin de la période de location enregistrée sur la Réservation. À titre indicatif, la Plateforme vise une levée automatique au plus tard sept (7) jours calendaires après la date de fin de location, sauf Incident ou traitement spécifique.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">9.5.</strong> Toute retenue sur la Caution doit être justifiée. Le Prestataire doit apporter des preuves (photographies, description factuelle, cohérence avec les échanges sur la Plateforme). Sans preuve suffisante, la retenue ne peut être validée.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">9.6.</strong> Si la location n&apos;a pas lieu du fait d&apos;une annulation avant capture, l&apos;empreinte est levée selon les délais techniques. Si une capture intervenait à tort, le Client peut contacter le support ; la Plateforme coopère avec Stripe dans les limites du cadre contractuel applicable.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 10 — Annulation et remboursement</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.1.</strong> Chaque Annonce comporte une politique d&apos;annulation parmi les familles suivantes : <strong className="text-black">Flexible</strong>, <strong className="text-black">Standard</strong> (dénommée en interne « moderate »), <strong className="text-black">Strict</strong>. Elle informe le Client avant paiement des conséquences financières attendues.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.2.</strong> Sous réserve de l&apos;article 10.3, les grilles suivantes s&apos;appliquent au remboursement du <strong className="text-black">Prix de location</strong> (hors Frais de service, sauf disposition contraire ci-dessous) :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Flexible</strong> : plus de 7 jours avant le début — 100 % ; entre 7 jours inclus et 2 jours avant — 50 % ; à moins de 2 jours — 0 %.
          </li>
          <li>
            <strong className="text-black">Standard</strong> : plus de 30 jours avant — 100 % ; entre 30 jours inclus et 15 jours avant — 50 % ; à moins de 15 jours — 0 %.
          </li>
          <li>
            <strong className="text-black">Strict</strong> : plus de 90 jours avant — 100 % ; entre 90 jours inclus et 30 jours avant — 50 % ; à moins de 30 jours — 0 %.
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.3.</strong> Les annulations et remboursements sont instruits via les fonctionnalités de la Plateforme (notamment demande de la part du Client et traitement par les équipes habilitées), compte tenu de la politique affichée, du calendrier, des preuves, de l&apos;état d&apos;avancement de la Réservation (y compris virement au Prestataire) et des contraintes Stripe. Aucun remboursement automatique n&apos;est garanti hors du cadre effectivement implémenté sur la Plateforme au moment de la demande.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.4.</strong> Sauf faute imputable au Prestataire ou cas exceptionnel dûment motivé par la Plateforme, les Frais de service restent acquis à la Plateforme lorsqu&apos;ils ont été facturés au Client, dans la mesure où ils correspondent à des services déjà rendus (mise en relation, traitement du paiement).
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.5.</strong> L&apos;absence du Client aux modalités de remise convenues (no-show) peut être traitée comme une annulation tardive au sens de la politique applicable, sauf preuve contraire ou faute du Prestataire.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.6.</strong> Sauf accord des parties constaté sur la Plateforme, un changement de dates peut être traité comme une annulation suivie d&apos;une nouvelle Réservation.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.7.</strong> En cas d&apos;annulation par le Prestataire hors faute du Client, le Client peut prétendre, selon les circonstances, au remboursement intégral du Prix de location, à la levée de toute empreinte de Caution et au remboursement des Frais de service dans la mesure du possible techniquement via Stripe.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.8.</strong> Une demande d&apos;annulation peut être refusée ou différée lorsqu&apos;un Incident est ouvert, qu&apos;un virement au Prestataire a déjà été effectué ou que la Réservation est dans un état terminal incompatible avec l&apos;annulation en ligne ; le Client est alors invité à contacter le support.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">10.9.</strong> Pour les consommateurs, le droit de rétractation prévu par le Code de la consommation peut ne pas s&apos;appliquer selon les exceptions légales applicables aux contrats de services datés ou de location de biens datés. Les modalités exactes dépendent de la qualification juridique de l&apos;opération et doivent être validées par un conseil juridique.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 11 — Exécution de la location (retrait / retour)</h2>
        <p className="mt-3 text-slate-600">
          Le Prestataire et le Client exécutent la location conformément à l&apos;Annonce (lieu, horaires, état du Matériel). Le Prestataire peut confirmer le retour du Matériel sur la Plateforme. Cette confirmation matérialise, sauf erreur manifeste, la fin de la phase de location côté Plateforme pour l&apos;ouverture du délai d&apos;Incident prévu à l&apos;article 12.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 12 — Incidents, litiges et suspension des flux</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">12.1.</strong> Le Prestataire peut déclarer un Incident dans un délai de quarante-huit (48) heures à compter de la confirmation du retour du Matériel sur la Plateforme, sauf faute du Prestataire ayant empêché la déclaration.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">12.2.</strong> Toute déclaration doit être documentée (photos, description factuelle, références aux échanges). Sans éléments probants sérieux, la Plateforme peut clôturer la déclaration.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">12.3.</strong> La Plateforme peut suspendre la levée d&apos;empreinte de Caution et/ou le virement au Prestataire tant qu&apos;un Incident n&apos;est pas résolu, dans les limites techniques de Stripe et des statuts de la Réservation.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">12.4.</strong> Les parties coopèrent de bonne foi. La Plateforme peut proposer une médiation interne (remboursement partiel, retenue de Caution justifiée, etc.). Aucune décision de la Plateforme ne substitue une juridiction compétente.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">12.5.</strong> Toute retenue sur Caution doit être proportionnée au préjudice allégué et justifiée ; les captures via Stripe sont effectuées conformément aux règles du prestataire de paiement et aux présentes CGV.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 13 — Virement au Prestataire</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">13.1.</strong> Le virement correspond au montant net issu du Prix de location après déduction de la Commission plateforme, hors Frais de service Client.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">13.2.</strong> Le virement n&apos;est pas instantané. Il intervient après la date de fin de la Réservation, sous réserve de l&apos;absence d&apos;Incident bloquant, de Caution en cours de traitement, de conformité du compte Stripe Connect et de la réussite des opérations techniques.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">13.3.</strong> À titre indicatif, la Plateforme programme le virement net au Prestataire pour une échéance de deux (2) jours calendaires après la date de fin de la période couverte par la Réservation (calcul selon les règles techniques en vigueur), puis exécute les virements via Stripe. Ce délai peut varier en cas d&apos;incident bancaire, week-end, jour férié ou examen d&apos;un litige.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">13.4.</strong> En cas d&apos;Incident ouvert, de Caution en statut de capture en cours, d&apos;anomalie de paiement ou de demande d&apos;annulation en cours de traitement, le virement peut être retardé ou bloqué jusqu&apos;à résolution.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">13.5.</strong> Le Prestataire doit maintenir des informations bancaires et fiscales exactes sur Stripe et reconnaît que la Plateforme ne peut garantir un délai bancaire inférieur à celui imposé par Stripe ou les banques.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 14 — Facturation</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">14.1.</strong> La confirmation émise par Stripe (reçu de transaction) fait foi du paiement du montant débité au Client, dans la limite des informations fournies par Stripe.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">14.2.</strong> La Plateforme peut générer un document PDF récapitulatif après clôture de la Réservation et virement effectué, mentionnant notamment le montant net versé au Prestataire, la période, le Matériel et une référence de paiement Stripe. Selon la qualification juridique retenue, ce document peut ne pas tenir lieu de facture TVA au sens du droit fiscal ; il informe les parties et doit être complété le cas échéant par la facturation du Prestataire ou de la Plateforme selon le régime applicable.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">14.3.</strong> Lorsque le Prestataire est tenu de facturer, il reste seul responsable de délivrer au Client les factures conformes, sauf si un mandat ou une facturation centralisée est légalement mis en place et accepté par écrit par les parties.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">14.4.</strong> Le Client est invité à conserver les documents transmis par courriel ou téléchargés depuis son compte.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 15 — Obligations du Client</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>utiliser le Matériel conformément aux usages, aux consignes du Prestataire et à la loi ;</li>
          <li>restituer le Matériel dans l&apos;état convenu, sous réserve de l&apos;usure normale ;</li>
          <li>fournir des informations exactes pour le paiement et la facturation ;</li>
          <li>coopérer en cas d&apos;Incident.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 16 — Obligations du Prestataire</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>décrire le Matériel loyalement et le mettre à disposition conforme à l&apos;Annonce ;</li>
          <li>
            respecter les délais, horaires et modalités de remise du Matériel convenus et la politique
            d&apos;annulation affichée ;
          </li>
          <li>déclarer les Incidents dans les délais ;</li>
          <li>respecter les obligations légales (assurances éventuelles, réglementations, fiscalité).</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 17 — Responsabilité</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">17.1.</strong> Le Prestataire est responsable du Matériel, de sa conformité, de la sécurité de sa mise à disposition et des dommages causés au Client par un manquement à ses obligations.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">17.2.</strong> Le Client est responsable des dommages causés au Matériel par une faute ou une utilisation non conforme.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">17.3.</strong> Sous réserve des garanties légales impératives, la responsabilité de {siteConfig.name} est limitée aux dommages directs prouvés résultant d&apos;une faute prouvée dans la fourniture du service de plateforme. Sont notamment exclus les dommages indirects, la perte de chance, la perte de revenus, les dysfonctionnements indépendants de sa volonté (réseaux, Stripe, force majeure).
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">17.4.</strong> La Plateforme ne garantit pas la qualité intrinsèque du Matériel comme si elle en était productrice ou vendeuse professionnelle du bien.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 18 — Force majeure</h2>
        <p className="mt-3 text-slate-600">
          Aucune partie n&apos;encourt de responsabilité pour un manquement dû à un cas de force majeure au sens du droit français, dès lors qu&apos;il est irrésistible, imprévisible et extérieur, sous réserve des obligations pécuniaires déjà exécutées et des remboursements dus en application des présentes CGV et du droit applicable.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 19 — Réclamations et support</h2>
        <p className="mt-3 text-slate-600">
          Les réclamations relatives aux présentes CGV, aux paiements ou aux Réservations peuvent être adressées à l&apos;adresse{" "}
          <a href="mailto:support@getsoundon.com" className="text-gs-orange hover:underline">
            support@getsoundon.com
          </a>
          . La Plateforme s&apos;efforce d&apos;y répondre dans un délai raisonnable. Le support peut demander des éléments (captures d&apos;écran, références de réservation) pour instruire la demande.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">Article 20 — Modification des CGV, droit applicable et médiation</h2>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">20.1.</strong> {siteConfig.name} peut modifier les présentes CGV. La version applicable est celle en ligne au moment de la validation du paiement ou, à défaut de paiement en ligne, au moment de la formation de la Réservation. Les Réservations en cours demeurent régies, pour leur exécution, par la version acceptée au moment de la commande, complétée des modifications impératives ou réglementaires notifiées conformément à la loi.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">20.2.</strong> Les présentes CGV sont régies par le droit français. Le Client consommateur bénéficie des règles d&apos;attribution de juridiction et, le cas échéant, des dispositions relatives à la médiation de la consommation (notamment articles L. 612-1 et suivants du Code de la consommation). Les coordonnées du médiateur de la consommation et, le cas échéant, le lien vers la plateforme européenne RLL doivent être communiqués conformément à la réglementation une fois le dispositif désigné par {siteConfig.name}.
        </p>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">20.3.</strong> À défaut de disposition impérative contraire pour les professionnels, tout litige relatif aux présentes CGV pourra être porté devant les tribunaux compétents selon les règles de droit commun.
        </p>
      </section>

      <section className="mt-12 border-t border-slate-200 pt-10">
        <h2 className="text-xl font-semibold text-black">Documents liés</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <Link href="/cgu" className="text-gs-orange hover:underline">
              Conditions générales d&apos;utilisation (CGU)
            </Link>
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
      </section>
    </LegalPageLayout>
  );
}
