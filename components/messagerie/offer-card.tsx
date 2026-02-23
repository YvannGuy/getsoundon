"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, FileText, Receipt } from "lucide-react";

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

import type { OfferStatus } from "@/lib/types/offer";

type Offer = {
  id: string;
  amount_cents: number;
  expires_at: string;
  status: OfferStatus;
  message: string | null;
  owner_id: string;
  created_at: string;
  event_type?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  contract_path?: string | null;
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  ponctuel: "Ponctuel",
  mensuel: "Mensuel",
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
  onAcceptAndPay?: (offerId: string) => void;
  onRefused?: () => void;
  onNewOffer?: () => void;
};

export function OfferCard({
  offer,
  userType,
  currentUserId,
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

  const handlePayAfterContract = () => {
    if (onAcceptAndPay) {
      onAcceptAndPay(offer.id);
    }
    setContractModalOpen(false);
  };

  const amountEur = (offer.amount_cents / 100).toFixed(2);
  const expiresFormatted = format(new Date(offer.expires_at), "d MMM yyyy", { locale: fr });
  const hasDateRange = offer.date_debut && offer.date_fin;
  const dateRangeFormatted =
    hasDateRange && offer.date_debut && offer.date_fin
      ? `${format(new Date(offer.date_debut), "d MMM yyyy", { locale: fr })} au ${format(new Date(offer.date_fin), "d MMM yyyy", { locale: fr })}`
      : null;

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
          {dateRangeFormatted && (
            <p className="text-slate-600">Valable du {dateRangeFormatted}</p>
          )}
          <p className="font-medium text-black">
            Montant : <span className="tabular-nums">{amountEur} €</span>
          </p>
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
              Voir le contrat et payer
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
          <p className="text-xs text-slate-500">En attente de réponse de l&apos;organisateur</p>
        )}
      </div>

      <ContractAcceptModal
        offerId={offer.id}
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
