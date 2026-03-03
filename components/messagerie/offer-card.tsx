"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, FileText, Info, Receipt } from "lucide-react";

import { refuseOfferAction } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { ContractAcceptModal } from "@/components/messagerie/contract-accept-modal";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { computePaymentProcessingFeeCents } from "@/lib/payment-processing-fee";
import type { OfferStatus } from "@/lib/types/offer";

export type OfferAcceptancePayload = {
  acceptedAt: string;
  acceptanceVersion: string;
  acceptedContract: true;
  acceptedCgv: true;
};

type Offer = {
  id: string;
  amount_cents: number;
  payment_mode?: "full" | "split";
  upfront_amount_cents?: number;
  balance_amount_cents?: number;
  balance_due_at?: string | null;
  payment_plan_status?:
    | "pending_deposit"
    | "deposit_paid"
    | "balance_scheduled"
    | "balance_paid"
    | "balance_failed"
    | "fully_paid"
    | "expired_unpaid";
  deposit_amount_cents?: number;
  service_fee_cents?: number;
  deposit_refunded_cents?: number;
  deposit_status?: "none" | "held" | "partially_refunded" | "refunded";
  deposit_hold_status?: string;
  expires_at: string;
  status: OfferStatus;
  message: string | null;
  owner_id: string;
  created_at: string;
  event_type?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  contract_path?: string | null;
  cancellation_policy?: "strict" | "moderate" | "flexible" | null;
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  ponctuel: "Ponctuel",
  mensuel: "Mensuel",
};
const CANCELLATION_POLICY_LABEL: Record<"strict" | "moderate" | "flexible", string> = {
  strict: "Stricte",
  moderate: "Modérée",
  flexible: "Flexible",
};
const CANCELLATION_POLICY_HELP: Record<"strict" | "moderate" | "flexible", string> = {
  strict: "Stricte : > J-90 = 100%, J-90 à J-30 = 50%, < J-30 = 0% de remboursement location.",
  moderate: "Modérée : > J-30 = 100%, J-30 à J-15 = 50%, < J-15 = 0% de remboursement location.",
  flexible: "Flexible : > J-7 = 100%, J-7 à J-2 = 50%, < J-2 = 0% de remboursement location.",
};

const STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "En attente",
  paid: "Payée",
  refused: "Refusée",
  expired: "Expirée",
};

const STATUS_CLASS: Record<OfferStatus, string> = {
  pending: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  refused: "bg-slate-200 text-slate-600",
  expired: "bg-slate-200 text-slate-500",
};

type OfferCardProps = {
  offer: Offer;
  userType: "owner" | "seeker";
  currentUserId: string;
  currentUserFullName?: string | null;
  currentUserEmail?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  rulesSummary?: string | null;
  onAcceptAndPay?: (offerId: string, acceptance: OfferAcceptancePayload) => void;
  onRefused?: () => void;
  onNewOffer?: () => void;
};

export function OfferCard({
  offer,
  userType,
  currentUserId,
  currentUserFullName,
  currentUserEmail,
  contactName,
  contactEmail,
  venueName,
  venueCity,
  rulesSummary,
  onAcceptAndPay,
  onRefused,
  onNewOffer,
}: OfferCardProps) {
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const isOwner = userType === "owner";
  const isFromMe = offer.owner_id === currentUserId;
  const isExpired = offer.status === "pending" && new Date(offer.expires_at) < new Date();
  const effectiveStatus = isExpired ? "expired" : offer.status;
  const canAccept = userType === "seeker" && offer.status === "pending" && !isExpired;
  const canRefuse = userType === "seeker" && offer.status === "pending" && !isExpired;
  const canNewOffer = isOwner && (effectiveStatus === "refused" || effectiveStatus === "expired");

  const handleRefuse = async () => {
    setRefusing(true);
    const res = await refuseOfferAction(offer.id);
    setRefusing(false);
    if (res.success) {
      setRefuseModalOpen(false);
      onRefused?.();
    } else {
      alert(res.error ?? "Erreur");
    }
  };

  const handleAccept = () => {
    if (canAccept) {
      setContractModalOpen(true);
    }
  };

  const handlePayAfterContract = (acceptance: OfferAcceptancePayload) => {
    if (onAcceptAndPay) {
      onAcceptAndPay(offer.id, acceptance);
    }
    setContractModalOpen(false);
  };

  const amountEur = (offer.amount_cents / 100).toFixed(2);
  const paymentMode = offer.payment_mode === "split" ? "split" : "full";
  const upfrontCents =
    paymentMode === "split"
      ? Math.max(0, offer.upfront_amount_cents ?? 0)
      : offer.amount_cents;
  const balanceCents =
    paymentMode === "split"
      ? Math.max(0, offer.balance_amount_cents ?? offer.amount_cents - upfrontCents)
      : 0;
  const depositCents = offer.deposit_amount_cents ?? 0;
  const serviceFeeCents = offer.service_fee_cents ?? 1500;
  const charge1BaseCents = upfrontCents + serviceFeeCents;
  const processingFeeCharge1Cents = computePaymentProcessingFeeCents(charge1BaseCents);
  const charge2BaseCents = balanceCents + depositCents;
  const processingFeeCharge2Cents = computePaymentProcessingFeeCents(charge2BaseCents);
  const totalToPayNowEur = ((charge1BaseCents + processingFeeCharge1Cents) / 100).toFixed(2);
  const balanceDueDate = offer.balance_due_at ? new Date(offer.balance_due_at) : null;
  const balanceDueLabel = balanceDueDate
    ? format(balanceDueDate, "d MMM yyyy", { locale: fr })
    : null;
  const isBalanceDuePast = balanceDueDate ? balanceDueDate.getTime() < Date.now() : false;
  const isBalanceAlreadyPaid =
    offer.payment_plan_status === "fully_paid" || offer.payment_plan_status === "balance_paid";
  const balanceScheduleLabel = (() => {
    if (!balanceDueLabel) return "prélèvement prévu J-7";
    if (isBalanceAlreadyPaid) return `solde déjà prélevé (date cible J-7 : ${balanceDueLabel})`;
    if (isBalanceDuePast) {
      return `date cible J-7 dépassée (${balanceDueLabel}) - prélèvement automatique en attente`;
    }
    return `date cible J-7 : ${balanceDueLabel}`;
  })();
  const balanceStatusLabel =
    offer.payment_plan_status === "fully_paid" || offer.payment_plan_status === "balance_paid"
      ? "Payé"
      : offer.payment_plan_status === "balance_failed"
        ? "Échec de prélèvement"
        : offer.payment_plan_status === "balance_scheduled" || offer.payment_plan_status === "deposit_paid"
          ? isBalanceDuePast
            ? "Planifié (date cible dépassée)"
            : "Planifié (J-7)"
          : "En attente";
  const expiresFormatted = format(new Date(offer.expires_at), "d MMM yyyy", { locale: fr });
  const hasDateRange = offer.date_debut && offer.date_fin;
  const dateRangeFormatted =
    hasDateRange && offer.date_debut && offer.date_fin
      ? `${format(new Date(offer.date_debut), "d MMM yyyy", { locale: fr })} au ${format(new Date(offer.date_fin), "d MMM yyyy", { locale: fr })}`
      : null;
  const cancellationPolicy = (offer.cancellation_policy ?? "strict") as
    | "strict"
    | "moderate"
    | "flexible";

  return (
    <>
      <div
        className={`flex max-w-[85%] flex-col gap-3 rounded-2xl border-2 border-[#213398]/20 bg-white px-4 py-3 shadow-sm ${
          isFromMe ? "ml-auto" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-[#213398]" />
          <span className="font-semibold text-black">Offre de réservation</span>
        </div>
        <div className="space-y-1 text-sm">
          {offer.event_type && (
            <p className="text-slate-600">
              Type : {EVENT_TYPE_LABEL[offer.event_type] ?? offer.event_type}
            </p>
          )}
          <p className="inline-flex items-center gap-1 text-slate-600">
            Annulation : {CANCELLATION_POLICY_LABEL[cancellationPolicy]}
            <Popover modal>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                  aria-label="Voir le détail de la politique d'annulation"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 text-xs text-slate-600">
                {CANCELLATION_POLICY_HELP[cancellationPolicy]}
              </PopoverContent>
            </Popover>
          </p>
          {dateRangeFormatted && (
            <p className="text-slate-600">Valable du {dateRangeFormatted}</p>
          )}
          <p className="font-medium text-black">
            Montant : <span className="tabular-nums">{amountEur} €</span>
          </p>
          {paymentMode === "split" ? (
            <>
              <p className="text-slate-600">
                Acompte à payer maintenant :{" "}
                <span className="tabular-nums">{(upfrontCents / 100).toFixed(2)} €</span>
              </p>
              <p className="text-slate-600">
                Solde : <span className="tabular-nums">{(balanceCents / 100).toFixed(2)} €</span>
                {` (${balanceScheduleLabel})`}
              </p>
              {offer.status === "paid" && (
                <p className="text-xs text-slate-500">
                  Statut solde : {balanceStatusLabel}
                </p>
              )}
            </>
          ) : null}
          {depositCents > 0 && (
            <p className="text-slate-600">
              Caution (empreinte) : <span className="tabular-nums">{(depositCents / 100).toFixed(2)} €</span>
            </p>
          )}
          <p className="text-slate-600">
            Frais plateforme : <span className="tabular-nums">{(serviceFeeCents / 100).toFixed(2)} €</span>
          </p>
          <p className="text-slate-600">
            Frais de traitement paiement :{" "}
            <span className="tabular-nums">{(processingFeeCharge1Cents / 100).toFixed(2)} €</span>
          </p>
          {paymentMode === "split" && (
            <p className="text-xs text-slate-500">
              Frais de traitement estimés à J-7 :{" "}
              <span className="tabular-nums">{(processingFeeCharge2Cents / 100).toFixed(2)} €</span>
              {" "} (sur solde + caution).
            </p>
          )}
          <p className="font-medium text-black">
            {paymentMode === "split" ? "Total à payer maintenant" : "Total à payer"} :{" "}
            <span className="tabular-nums">{totalToPayNowEur} €</span>
          </p>
          {depositCents > 0 && (
            <p className="text-xs text-slate-500">
              La caution est une empreinte bancaire (non débitée immédiatement).
            </p>
          )}
          {offer.status === "paid" && depositCents > 0 && (
            <p className="text-xs text-slate-500">
              Statut caution :{" "}
              {offer.deposit_hold_status === "authorized"
                ? "Empreinte active"
                : offer.deposit_hold_status === "claim_requested"
                  ? "Demande de retenue en revue"
                  : offer.deposit_hold_status === "released"
                    ? "Empreinte libérée"
                    : offer.deposit_hold_status === "captured"
                      ? "Caution capturée"
                      : offer.deposit_hold_status === "failed"
                        ? "Empreinte échouée"
                        : "—"}
            </p>
          )}
          <p className="text-slate-600">Offre valable jusqu&apos;au {expiresFormatted}</p>
          {offer.message && (
            <p className="mt-2 rounded-lg bg-slate-50 p-2 text-slate-700">{offer.message}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[effectiveStatus]}`}
          >
            {STATUS_LABEL[effectiveStatus]}
          </span>
          {canAccept && (
            <Button size="sm" onClick={handleAccept} className="bg-[#213398] hover:bg-[#1a2980]">
              {paymentMode === "split" ? "Voir le contrat et payer l'acompte" : "Voir le contrat et payer"}
            </Button>
          )}
          {canRefuse && (
            <Button size="sm" variant="outline" onClick={() => setRefuseModalOpen(true)}>
              Refuser
            </Button>
          )}
          {canNewOffer && onNewOffer && (
            <Button size="sm" variant="outline" onClick={onNewOffer}>
              Nouvelle offre
            </Button>
          )}
          {offer.status === "paid" && (
            <span className="flex flex-wrap gap-2">
              {offer.contract_path && (
                <a href={`/api/contract/${offer.id}`} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <FileText className="h-4 w-4" />
                    Contrat
                  </Button>
                </a>
              )}
              <a href={`/api/invoice/offer/${offer.id}`} download target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Receipt className="h-4 w-4" />
                  Facture
                </Button>
              </a>
            </span>
          )}
        </div>
        {isOwner && offer.status === "pending" && (
          <p className="text-xs text-slate-500">En attente de réponse du locataire</p>
        )}
      </div>

      <ContractAcceptModal
        offerId={offer.id}
        cancellationPolicy={offer.cancellation_policy ?? "strict"}
        paymentMode={paymentMode}
        eventType={offer.event_type}
        startAt={offer.date_debut}
        endAt={offer.date_fin}
        venueName={venueName}
        venueCity={venueCity}
        organizerName={userType === "seeker" ? currentUserFullName : contactName}
        organizerEmail={userType === "seeker" ? currentUserEmail : contactEmail}
        ownerName={userType === "seeker" ? contactName : currentUserFullName}
        ownerEmail={userType === "seeker" ? contactEmail : currentUserEmail}
        rulesSummary={rulesSummary}
        upfrontAmountCents={upfrontCents}
        balanceAmountCents={balanceCents}
        serviceFeeCents={serviceFeeCents}
        depositAmountCents={depositCents}
        open={contractModalOpen}
        onOpenChange={setContractModalOpen}
        onPay={handlePayAfterContract}
      />

      <Dialog open={refuseModalOpen} onOpenChange={setRefuseModalOpen}>
        <DialogContent showClose={true}>
          <DialogHeader>
            <DialogTitle>Refuser cette offre ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Le propriétaire pourra vous proposer une nouvelle offre.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={handleRefuse}
              disabled={refusing}
            >
              {refusing ? "Refus..." : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
