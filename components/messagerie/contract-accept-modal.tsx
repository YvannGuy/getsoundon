"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText } from "lucide-react";

import { fulfillmentModeLabel, parseOfferListingSnapshot } from "@/lib/offer-listing-snapshot";
import { computePaymentProcessingFeeCents } from "@/lib/payment-processing-fee";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OfferAcceptancePayload } from "@/components/messagerie/offer-card";

type ContractAcceptModalProps = {
  offerId: string;
  cancellationPolicy: "strict" | "moderate" | "flexible";
  paymentMode: "full" | "split";
  eventType?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  /** Snapshot JSON `offers.listing_snapshot` (v1) si présent */
  listingSnapshot?: unknown;
  venueName?: string | null;
  venueCity?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  rulesSummary?: string | null;
  upfrontAmountCents: number;
  balanceAmountCents: number;
  serviceFeeCents: number;
  depositAmountCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPay: (acceptance: OfferAcceptancePayload) => void;
};

const POLICY_LABEL: Record<"strict" | "moderate" | "flexible", string> = {
  strict: "Strict",
  moderate: "Standard",
  flexible: "Flexible",
};

const CONTRACT_VERSION = "standard-getsoundon-v1";

function formatDateTimeLabel(value?: string | null): string {
  if (!value) return "Non renseigné";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ContractAcceptModal({
  offerId,
  cancellationPolicy,
  paymentMode,
  eventType,
  startAt,
  endAt,
  listingSnapshot,
  venueName,
  venueCity,
  organizerName,
  organizerEmail,
  ownerName,
  ownerEmail,
  rulesSummary,
  upfrontAmountCents,
  balanceAmountCents,
  serviceFeeCents,
  depositAmountCents,
  open,
  onOpenChange,
  onPay,
}: ContractAcceptModalProps) {
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedCgv, setAcceptedCgv] = useState(false);

  const canPay = acceptedContract && acceptedCgv;
  const charge1BaseCents = upfrontAmountCents + serviceFeeCents;
  const processingFeeCharge1Cents = computePaymentProcessingFeeCents(charge1BaseCents);
  const charge1TotalCents = charge1BaseCents + processingFeeCharge1Cents;
  const charge2BaseCents = balanceAmountCents + depositAmountCents;
  const processingFeeCharge2Cents =
    paymentMode === "split" ? computePaymentProcessingFeeCents(charge2BaseCents) : 0;
  const acceptedAtLabel = new Date().toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const startAtLabel = formatDateTimeLabel(startAt);
  const endAtLabel = formatDateTimeLabel(endAt);
  const paymentModeLabel =
    paymentMode === "split" ? "Acompte 30% + solde J-7" : "Paiement total (100%)";
  const eventTypeLabel =
    eventType === "mensuel" ? "Mensuel" : eventType === "ponctuel" ? "Ponctuel" : "Ponctuel / Mensuel";
  const locationAmountEur = ((upfrontAmountCents + balanceAmountCents) / 100).toFixed(2);
  const processingNowEur = (processingFeeCharge1Cents / 100).toFixed(2);
  const processingSecondEur = (processingFeeCharge2Cents / 100).toFixed(2);
  const snap = parseOfferListingSnapshot(listingSnapshot);
  const listingLine = snap
    ? `${snap.listing.title} — ${snap.listing.city?.trim() || "—"}`
    : `${venueName?.trim() || "Annonce matériel"} — ${venueCity?.trim() || "—"}`;
  const organizerLine = `${organizerName?.trim() || "Organisateur"} — ${organizerEmail?.trim() || "Email non renseigné"}`;
  const ownerLine = `${ownerName?.trim() || "Propriétaire"} — ${ownerEmail?.trim() || "Email non renseigné"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true} className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrat de location (matériel / pack)
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="rounded-lg border border-[#213398]/20 bg-[#213398]/5 p-4">
            <div className="flex items-center gap-3">
              <Image src="/images/logosound.png" alt="GetSoundOn" width={38} height={38} className="h-9 w-9 rounded-full object-cover" />
              <div>
                <p className="text-sm font-semibold text-[#213398]">CONTRAT STANDARD GETSOUNDON</p>
                <p className="text-xs text-slate-600">À accepter obligatoirement avant tout paiement</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p><span className="font-semibold">Référence Offre :</span> {offerId}</p>
            <p><span className="font-semibold">Date d&apos;acceptation :</span> {acceptedAtLabel}</p>
            <p><span className="font-semibold">Matériel / pack :</span> {listingLine}</p>
            <p><span className="font-semibold">Dates / Horaires :</span> du {startAtLabel} au {endAtLabel}</p>
            <p><span className="font-semibold">Fin d&apos;événement (référence litiges) :</span> {endAtLabel}</p>
          </div>

          <h4 className="font-semibold text-slate-900">1) Parties</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Organisateur / Locataire : {organizerLine}</li>
            <li>Propriétaire / Loueur : {ownerLine}</li>
            <li>Plateforme : GetSoundOn</li>
          </ul>

          <h4 className="font-semibold text-slate-900">2) Objet</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Location du matériel / pack décrit dans l&apos;Offre (Annexe 1) entre Organisateur et
              Propriétaire (fournisseur).
            </li>
            <li>Utilisation des services de la Plateforme (messagerie, outils, paiement, documents).</li>
          </ul>
          <p>La réservation devient effective après acceptation du contrat et paiement selon l&apos;Offre.</p>

          <h4 className="font-semibold text-slate-900">3) Rôle de la Plateforme (important)</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Mise en relation et centralisation des échanges.</li>
            <li>Outils : visite, offre, réservation, état des lieux, litiges.</li>
            <li>Paiement en ligne optionnel via Stripe Connect.</li>
          </ul>
          <p>
            La Plateforme n&apos;est pas le loueur du matériel et n&apos;exécute pas la prestation sur site,
            sauf mention expresse contraire entre les parties.
          </p>

          <h4 className="font-semibold text-slate-900">4) Offre et conditions applicables</h4>
          <p>
            Les conditions contractuelles (prix, dates, horaires, règles, équipements, annulation, caution)
            sont celles indiquées dans l&apos;Offre acceptée (Annexe 1). En cas de contradiction, l&apos;Offre prévaut.
          </p>

          <h4 className="font-semibold text-slate-900">5) Prix & frais (affichés avant paiement)</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Prix de location (matériel / pack) : {locationAmountEur} €</li>
            <li>Frais de service Plateforme (fixe) : {(serviceFeeCents / 100).toFixed(2)} €</li>
            <li>Frais de traitement paiement (variable) : {processingNowEur} € (paiement actuel)</li>
          </ul>
          {paymentMode === "split" && (
            <p className="text-xs text-slate-600">
              En mode acompte + solde, frais de traitement estimés au second paiement : {processingSecondEur} €.
            </p>
          )}

          <h4 className="font-semibold text-slate-900">6) Paiement (Ponctuel) — 2 options</h4>
          <p>Mode choisi dans cette offre : <span className="font-semibold">{paymentModeLabel}</span>.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Option A : paiement total immédiat (location 100% + frais de service + frais de traitement + caution si prévue).</li>
            <li>Option B : acompte 30% immédiat, puis solde automatique à J-7 (+ caution si prévue).</li>
          </ul>
          <p>
            En acceptant ce contrat, l&apos;Organisateur autorise le prélèvement automatique du solde
            (et de la caution le cas échéant) à J-7 sur le moyen de paiement enregistré.
          </p>

          <h4 className="font-semibold text-slate-900">7) Caution (dépôt de garantie) — règles</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>La caution est un dépôt remboursable, ce n&apos;est pas une pénalité.</li>
            <li>Si paiement total : caution prélevée au paiement.</li>
            <li>Si acompte + solde : caution prélevée à J-7 avec le solde.</li>
            <li>
              Sans incident déclaré dans les 48h après fin d&apos;événement, remboursement automatique visé
              au plus tard à J+7.
            </li>
          </ul>

          <h4 className="font-semibold text-slate-900">8) États des lieux & constat matériel (photos)</h4>
          <p>
            La Plateforme peut proposer un module d&apos;état des lieux / constat du matériel (photos avant /
            après). Les parties s&apos;engagent à fournir les éléments utiles en cas de litige.
          </p>

          <h4 className="font-semibold text-slate-900">9) Incidents & litiges (ponctuel)</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Fin d&apos;événement de référence : {endAtLabel}.</li>
            <li>Délai de déclaration : 48h après la fin d&apos;événement.</li>
            <li>Retenue caution possible uniquement avec preuves suffisantes.</li>
            <li>Statuts : Incident déclaré → En discussion → Résolu.</li>
          </ul>

          <h4 className="font-semibold text-slate-900">10) Annulation & remboursement (ponctuel)</h4>
          <p>
            Politique applicable à cette offre :{" "}
            <span className="font-semibold text-slate-900">{POLICY_LABEL[cancellationPolicy]}</span>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Flexible : &gt; J-7 = 100%, J-7 à J-2 = 50%, &lt; J-2 = 0%.</li>
            <li>Standard : &gt; J-30 = 100%, J-30 à J-15 = 50%, &lt; J-15 = 0%.</li>
            <li>Strict : &gt; J-90 = 100%, J-90 à J-30 = 50%, &lt; J-30 = 0%.</li>
          </ul>
          <p>
            Les frais de service restent non remboursables sauf annulation imputable au Propriétaire.
            Les frais de traitement peuvent ne pas être remboursables (frais bancaires).
          </p>

          <h4 className="font-semibold text-slate-900">11) Libération du paiement Propriétaire (payout)</h4>
          <p>
            Si paiement via la Plateforme, les fonds de location destinés au Propriétaire sont
            libérés à J+3 après la fin d&apos;événement, sauf incident déclaré dans la fenêtre de 48h.
          </p>

          <h4 className="font-semibold text-slate-900">12) Règles d&apos;usage du matériel</h4>
          <p>
            L&apos;Organisateur respecte le périmètre convenu (accessoires, puissance, transport), les horaires
            de prise en charge / retour, la sécurité, l&apos;intégrité du matériel et les conditions prévues
            dans l&apos;Offre.
          </p>

          <h4 className="font-semibold text-slate-900">13) Documents</h4>
          <p>
            Après paiement, l&apos;Organisateur peut accéder (selon disponibilité) à la facture/reçu,
            au contrat, à l&apos;historique des paiements et aux éléments liés à la réservation.
          </p>

          <h4 className="font-semibold text-slate-900">14) Acceptation</h4>
          <p>
            En cochant « J&apos;accepte », les parties valident ce contrat et l&apos;Offre (Annexe 1).
            L&apos;Organisateur autorise les prélèvements automatiques prévus (solde/caution à J-7 si applicable).
          </p>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">ANNEXE 1 — RÉCAPITULATIF DE L&apos;OFFRE</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
              <li>Matériel / pack : {listingLine}</li>
              {snap &&
              (snap.listing.gear_category || snap.listing.gear_brand || snap.listing.gear_model) ? (
                <li>
                  Détail :{" "}
                  {[snap.listing.gear_category, snap.listing.gear_brand, snap.listing.gear_model]
                    .filter(Boolean)
                    .join(" · ")}
                </li>
              ) : null}
              {snap?.logistics.accessories_notes ? (
                <li>Accessoires & périmètre : {snap.logistics.accessories_notes}</li>
              ) : null}
              {snap ? (
                <li>
                  Retrait / livraison : {fulfillmentModeLabel(snap.logistics.mode)}
                  {snap.logistics.notes ? ` — ${snap.logistics.notes}` : ""}
                </li>
              ) : null}
              <li>Type : {eventTypeLabel}</li>
              <li>Période : {startAtLabel} → {endAtLabel}</li>
              <li>Prix location : {locationAmountEur} €</li>
              <li>Mode paiement : {paymentModeLabel}</li>
              <li>Caution : {(depositAmountCents / 100).toFixed(2)} €</li>
              <li>Politique d&apos;annulation : {POLICY_LABEL[cancellationPolicy]}</li>
              <li>Conditions complémentaires : {rulesSummary?.trim() || "Voir l’offre et les messages associés."}</li>
              <li>Fin de période (réf. litiges / EDL) : {endAtLabel}</li>
            </ul>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            Échéances de référence : solde ponctuel à J-7, fenêtre incident 48h après la fin,
            versement propriétaire visé à J+3, libération caution visée à J+7.
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Paiement d&apos;aujourd&apos;hui</p>
          <p>Montant location : {(upfrontAmountCents / 100).toFixed(2)} €</p>
          <p>Frais de service : {(serviceFeeCents / 100).toFixed(2)} €</p>
          <p>Frais de traitement paiement : {(processingFeeCharge1Cents / 100).toFixed(2)} €</p>
          <p className="mt-1 font-semibold text-slate-900">
            Total à payer maintenant : {(charge1TotalCents / 100).toFixed(2)} €
          </p>
          {paymentMode === "split" && (
            <p className="mt-2 text-xs text-slate-500">
              À J-7 (automatique) : solde {(balanceAmountCents / 100).toFixed(2)} € + caution{" "}
              {(depositAmountCents / 100).toFixed(2)} € ; frais de traitement estimés{" "}
              {(processingFeeCharge2Cents / 100).toFixed(2)} €.
            </p>
          )}
        </div>

        <label className="mt-2 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedContract}
            onChange={(e) => setAcceptedContract(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            J&apos;ai lu et j&apos;accepte le Contrat standard GetSoundOn, la politique
            d&apos;annulation affichée, et les modalités de paiement (acompte/solde J-7) et de caution
            (capture J-7) le cas échéant.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedCgv}
            onChange={(e) => setAcceptedCgv(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            J&apos;ai lu et j&apos;accepte les{" "}
            <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-[#213398] underline">
              CGV
            </a>
            . Le paiement vaut validation définitive.
          </span>
        </label>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onPay({
                acceptedAt: new Date().toISOString(),
                acceptanceVersion: CONTRACT_VERSION,
                acceptedContract: true,
                acceptedCgv: true,
              })
            }
            disabled={!canPay}
            className="bg-[#213398] hover:bg-[#1a2980]"
          >
            Payer et valider
          </Button>
        </DialogFooter>
        <p className="text-center text-xs text-slate-500">
          En payant, vous acceptez le Contrat standard GetSoundOn et la politique
          d&apos;annulation indiquée dans l&apos;offre.
        </p>
      </DialogContent>
    </Dialog>
  );
}
