"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

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
  upfrontAmountCents: number;
  balanceAmountCents: number;
  serviceFeeCents: number;
  depositAmountCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPay: (acceptance: OfferAcceptancePayload) => void;
};

const POLICY_LABEL: Record<"strict" | "moderate" | "flexible", string> = {
  strict: "Stricte",
  moderate: "Modérée",
  flexible: "Flexible",
};

const CONTRACT_VERSION = "standard-salledeculte-v1";

export function ContractAcceptModal({
  offerId,
  cancellationPolicy,
  paymentMode,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true} className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrat de réservation
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h3 className="text-base font-semibold text-slate-900">
            Contrat standard de location — salledeculte.com (v1)
          </h3>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            IMPORTANT — À lire avant paiement. Ce contrat encadre la réservation réalisée via
            salledeculte.com. Il s&apos;applique à toute offre acceptée et payée sur la plateforme.
          </p>

          <p className="text-xs text-slate-500">Référence offre : {offerId}</p>

          <h4 className="font-semibold text-slate-900">1) Parties</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Le Propriétaire : personne physique ou morale proposant un lieu à la location.</li>
            <li>L&apos;Organisateur : personne physique ou morale réservant un lieu.</li>
            <li>
              salledeculte.com : plateforme de mise en relation et de facilitation des paiements,
              agissant en qualité d&apos;intermédiaire technique.
            </li>
          </ul>

          <h4 className="font-semibold text-slate-900">2) Objet</h4>
          <p>
            Le présent contrat a pour objet la mise à disposition temporaire par le Propriétaire, au
            profit de l&apos;Organisateur, du lieu décrit dans l&apos;offre acceptée.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Location ponctuelle (événement unique)</li>
            <li>Location mensuelle / récurrente (créneaux réguliers)</li>
          </ul>

          <h4 className="font-semibold text-slate-900">3) Valeur contractuelle de l&apos;Offre</h4>
          <p>
            L&apos;Offre envoyée via la messagerie (montant, dates/heures, caution, politique
            d&apos;annulation, conditions) fait partie intégrante du présent contrat. En cas de
            contradiction avec un document externe, l&apos;Offre et le présent contrat prévalent.
          </p>

          <h4 className="font-semibold text-slate-900">4) Rôle de la Plateforme</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Mise en relation Propriétaire / Organisateur</li>
            <li>Outils de gestion (messagerie, visites, offres, suivi)</li>
            <li>Facilitation des paiements</li>
          </ul>
          <p>
            La Plateforme n&apos;est pas propriétaire du Lieu et n&apos;exécute pas la prestation de
            location.
          </p>

          <h4 className="font-semibold text-slate-900">5) Processus de réservation</h4>
          <p>La réservation est confirmée lorsque :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>le Propriétaire envoie une Offre via la Plateforme,</li>
            <li>l&apos;Organisateur accepte l&apos;Offre,</li>
            <li>l&apos;Organisateur effectue le paiement requis (acompte ou total),</li>
            <li>l&apos;Organisateur accepte le présent contrat avant paiement.</li>
          </ul>

          <h4 className="font-semibold text-slate-900">SECTION A — Location ponctuelle</h4>
          <p>
            Fin d&apos;événement = heure de fin indiquée dans l&apos;Offre (déclenche la fenêtre incident
            de 48h).
          </p>
          <p>Paiement possible en 2 modes :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Paiement total (100%) + frais de service 15€ + caution si prévue.</li>
            <li>
              Acompte 30% à la réservation + solde automatique J-7 (avec notification en cas
              d&apos;échec).
            </li>
          </ul>
          <p>
            Caution ponctuelle : capturée à J-7, jamais une pénalité, remboursée intégralement si la
            prestation n&apos;a pas lieu, restitution automatique J+7 sans incident.
          </p>
          <p>
            Incident / litige : le Propriétaire peut déclarer un incident jusqu&apos;à 48h après la fin.
            Toute retenue exige des preuves (photos EDL + messages).
          </p>
          <p>
            Paiement Propriétaire : libération à J+3 après la fin si aucun incident déclaré dans la
            fenêtre des 48h.
          </p>
          <p>
            No-show Organisateur : remboursement 0% location. Changement de date : annulation +
            nouvelle réservation (sauf report V2).
          </p>

          <h4 className="font-semibold text-slate-900">
            SECTION B — Location mensuelle / récurrente
          </h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Paiement mensuel à l&apos;avance.</li>
            <li>
              Caution mensuelle : 1 mois par défaut, 2 mois possible en cas à risque, conservée
              pendant le contrat.
            </li>
            <li>
              Restitution caution : maximum 14 jours après fin de contrat + état des lieux final
              conforme.
            </li>
            <li>Préavis mensuel : 30 jours sauf mention différente dans l&apos;Offre.</li>
            <li>Retenue uniquement avec justificatifs (photos + échanges).</li>
          </ul>

          <h4 className="font-semibold text-slate-900">
            SECTION C — Politique d&apos;annulation (3 options standardisées)
          </h4>
          <p>
            Le Propriétaire choisit une politique (Flexible / Standard / Strict) affichée dans
            l&apos;Offre et acceptée avant paiement.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Flexible : &gt; J-7 = 100%, J-7 à J-2 = 50%, &lt; J-2 = 0%.
            </li>
            <li>
              Standard : &gt; J-30 = 100%, J-30 à J-15 = 50%, &lt; J-15 = 0%.
            </li>
            <li>
              Strict : &gt; J-90 = 100%, J-90 à J-30 = 50%, &lt; J-30 = 0%.
            </li>
          </ul>
          <p>
            Règles générales : frais de service 15€ non remboursables sauf annulation imputable au
            Propriétaire, caution remboursée intégralement si la prestation n&apos;a pas lieu.
          </p>
          <p>
            Annulation par le Propriétaire : remboursement 100% location + 100% caution + 15€ frais
            de service.
          </p>

          <h4 className="font-semibold text-slate-900">SECTION D — Dispositions complémentaires</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Responsabilité : chaque partie reste responsable de ses obligations et dommages
              éventuels.
            </li>
            <li>
              Communications : les échanges doivent passer par la messagerie de la Plateforme.
            </li>
            <li>
              Acceptation : en cliquant sur « Payer », l&apos;Organisateur valide l&apos;Offre, la
              politique d&apos;annulation, le solde auto J-7 (si acompte) et la capture caution J-7
              (si applicable).
            </li>
          </ul>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Politique d&apos;annulation appliquée à cette offre :{" "}
            <span className="font-semibold text-slate-800">{POLICY_LABEL[cancellationPolicy]}</span>.
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
            J&apos;ai lu et j&apos;accepte le Contrat standard salledeculte.com, la politique
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
      </DialogContent>
    </Dialog>
  );
}
