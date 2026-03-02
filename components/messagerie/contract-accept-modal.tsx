"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPay: (acceptance: OfferAcceptancePayload) => void;
};

const POLICY_LABEL: Record<"strict" | "moderate" | "flexible", string> = {
  strict: "Stricte",
  moderate: "Modérée",
  flexible: "Flexible",
};

export function ContractAcceptModal({
  offerId,
  cancellationPolicy,
  open,
  onOpenChange,
  onPay,
}: ContractAcceptModalProps) {
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null);
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedCgv, setAcceptedCgv] = useState(false);

  useEffect(() => {
    if (open && offerId) {
      setAcceptedContract(false);
      setAcceptedCgv(false);
      fetch(`/api/contract/salle-pdf/${offerId}`)
        .then((res) => setPdfAvailable(res.ok))
        .catch(() => setPdfAvailable(false));
    }
  }, [open, offerId]);

  const canPay = acceptedContract && acceptedCgv;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true} className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrat de réservation
          </DialogTitle>
        </DialogHeader>

        {pdfAvailable === null && (
          <p className="py-12 text-center text-slate-500">Chargement du contrat...</p>
        )}

        {pdfAvailable === false && (
          <div className="space-y-4">
            <p className="rounded-lg bg-amber-50 py-4 text-center text-sm text-amber-800">
              Le propriétaire n&apos;a pas encore fourni de contrat. Vous pouvez procéder au paiement.
            </p>
          </div>
        )}

        {pdfAvailable === true && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <iframe
              src={`/api/contract/salle-pdf/${offerId}`}
              title="Contrat de réservation"
              className="h-[55vh] w-full border-0"
            />
            <p className="border-t border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Faites défiler le document ci-dessus pour le consulter en entier.
            </p>
          </div>
        )}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            Politique d&apos;annulation appliquée à cette offre :{" "}
            <span className="font-semibold text-slate-800">{POLICY_LABEL[cancellationPolicy]}</span>.
          </p>
          <p className="mt-1">
            Échéances de référence : solde ponctuel à J-7, fenêtre incident jusqu&apos;à 48h après la fin, versement
            propriétaire visé à J+3, libération caution visée à J+7.
          </p>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedContract}
            onChange={(e) => setAcceptedContract(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            J&apos;accepte le contrat de réservation et les conditions particulières affichées.
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
                acceptanceVersion: "v2026-02",
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
