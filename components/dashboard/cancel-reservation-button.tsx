"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeCancellationRefund } from "@/lib/cancellation-policy";

type CancellationPolicy = "strict" | "moderate" | "flexible";

type CancelReservationButtonProps = {
  offerId: string;
  salleName: string;
  amountCents: number;
  policyLabel: string;
  eventStartAt?: string | null;
  cancellationPolicy?: CancellationPolicy | null;
  actor?: "seeker" | "owner";
  disabled?: boolean;
  disabledReason?: string;
};

export function CancelReservationButton({
  offerId,
  salleName,
  amountCents,
  policyLabel,
  eventStartAt,
  cancellationPolicy,
  actor = "seeker",
  disabled = false,
  disabledReason,
}: CancelReservationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewRefund = useMemo(() => {
    if (actor === "owner") {
      return { refundCents: amountCents, refundPercent: 100 };
    }
    const eventStart = eventStartAt ? new Date(`${eventStartAt}T10:00:00.000Z`) : new Date();
    const outcome = computeCancellationRefund({
      actor: "seeker",
      policy: cancellationPolicy ?? "strict",
      eventStartAt: eventStart,
      now: new Date(),
      amountPaidCents: amountCents,
    });
    const pct = amountCents > 0 ? Math.round((outcome.refundCents / amountCents) * 100) : 0;
    return { refundCents: outcome.refundCents, refundPercent: pct };
  }, [actor, amountCents, eventStartAt, cancellationPolicy]);

  const canSubmit = reason.trim().length >= 3 && !isPending;

  const handleCancelReservation = () => {
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/offers/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            reason: reason.trim(),
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          refundCents?: number;
        };
        if (!res.ok || !data.success) {
          setError(data.error ?? "Annulation impossible pour le moment.");
          return;
        }
        const refund = (data.refundCents ?? 0) / 100;
        const msg =
          refund > 0
            ? `Annulation prise en compte. Remboursement estimé : ${refund.toFixed(2)} €.`
            : "Annulation prise en compte. La réservation a été annulée et le créneau libéré.";
        setSuccess(msg);
        setTimeout(() => {
          setOpen(false);
          setReason("");
          router.refresh();
        }, 900);
      } catch {
        setError("Erreur réseau. Réessayez dans quelques instants.");
      }
    });
  };

  if (disabled) {
    return (
      <Button size="sm" variant="outline" className="border-red-200 text-red-700" disabled title={disabledReason}>
        Annulation indisponible
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        Annuler la réservation
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose={true} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Annuler la réservation ?</DialogTitle>
            <DialogDescription>
              Cette action applique la politique d&apos;annulation de l&apos;offre.
              {actor === "owner" && " Le locataire sera intégralement remboursé."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Salle :</span> {salleName}
              </p>
              <p>
                <span className="font-medium text-slate-900">Montant payé :</span>{" "}
                {(amountCents / 100).toFixed(2)} €
              </p>
              <p>
                <span className="font-medium text-slate-900">Politique :</span> {policyLabel}
              </p>
              {actor === "seeker" ? (
                previewRefund.refundCents > 0 ? (
                  <p className="mt-2 font-medium text-emerald-700">
                    Vous serez remboursé de {(previewRefund.refundCents / 100).toFixed(2)} € (
                    {previewRefund.refundPercent} %).
                  </p>
                ) : (
                  <p className="mt-2 text-amber-700">
                    Aucun remboursement selon la politique choisie. La réservation sera annulée et le créneau libéré.
                  </p>
                )
              ) : (
                <p className="mt-2 font-medium text-emerald-700">
                  Le locataire sera intégralement remboursé.
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Les frais de service (15€) et frais de traitement peuvent ne pas être remboursés selon les règles en
                vigueur.
              </p>
            </div>

            <div>
              <label htmlFor={`cancel-reason-${offerId}`} className="text-sm font-medium text-slate-900">
                Motif d&apos;annulation (obligatoire)
              </label>
              <textarea
                id={`cancel-reason-${offerId}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : changement de planning, événement reporté..."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gs-orange"
                rows={4}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-slate-500">{reason.trim().length}/500</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-700">{success}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Retour
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleCancelReservation}
              disabled={!canSubmit}
            >
              {isPending ? "Annulation..." : "Confirmer l’annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

