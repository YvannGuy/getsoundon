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

type ContractAcceptModalProps = {
  offerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPay: () => void;
};

export function ContractAcceptModal({
  offerId,
  open,
  onOpenChange,
  onPay,
}: ContractAcceptModalProps) {
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (open && offerId) {
      setAccepted(false);
      fetch(`/api/contract/salle-pdf/${offerId}`)
        .then((res) => setPdfAvailable(res.ok))
        .catch(() => setPdfAvailable(false));
    }
  }, [open, offerId]);

  const canPay = accepted;

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

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            J&apos;accepte les conditions. Le paiement vaut validation définitive.
          </span>
        </label>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onPay}
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
