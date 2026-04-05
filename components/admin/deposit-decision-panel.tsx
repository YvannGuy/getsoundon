"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, DollarSign, Loader2, Unlock } from "lucide-react";

import {
  releaseDepositAdminAction,
  captureDepositAdminAction,
} from "@/app/actions/gs-bookings";

type Props = {
  bookingId: string;
  depositAmount: number;
  depositHoldStatus: string | null;
  depositClaimStatus: string | null;
  depositCapturedAmount: number | null;
};

const CLAIM_LABEL: Record<string, string> = {
  pending_capture: "En attente de décision",
  captured_full: "Capturée (totalité)",
  captured_partial: "Capturée (partielle)",
  released_admin: "Libérée (admin)",
  released_auto: "Libérée (automatique J+7)",
};

export function DepositDecisionPanel({
  bookingId,
  depositAmount,
  depositHoldStatus,
  depositClaimStatus,
  depositCapturedAmount,
}: Props) {
  const [captureAmount, setCaptureAmount] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(depositClaimStatus);
  const [error, setError] = useState<string | null>(null);
  const [releasePending, startRelease] = useTransition();
  const [captureFullPending, startCaptureFull] = useTransition();
  const [capturePartialPending, startCapturePartial] = useTransition();

  const anyPending = releasePending || captureFullPending || capturePartialPending;

  // Caution déjà traitée
  if (done && done !== "pending_capture") {
    const capturedEur = depositCapturedAmount ?? (Number(captureAmount) || 0);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-900">Décision caution</h2>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">
              {CLAIM_LABEL[done] ?? done}
            </p>
            {capturedEur > 0 && (
              <p className="text-sm text-emerald-700">Montant capturé : {capturedEur} €</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pas de caution active
  if (depositHoldStatus !== "authorized" || depositAmount <= 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-900">Décision caution</h2>
        <p className="text-sm text-slate-500">
          {depositAmount <= 0
            ? "Aucune caution sur cette réservation."
            : `Caution non active (état : ${depositHoldStatus ?? "inconnu"}).`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-bold text-slate-900">Décision caution — {depositAmount} € autorisés</h2>

      {/* Raison (optionnelle) */}
      <div className="mb-4">
        <label className="mb-1 block text-[12px] font-medium text-slate-500">
          Motif de la décision (optionnel)
        </label>
        <input
          type="text"
          placeholder="Ex : matériel endommagé, câble manquant…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Libérer */}
        <button
          disabled={anyPending}
          onClick={() =>
            startRelease(async () => {
              setError(null);
              const res = await releaseDepositAdminAction(bookingId, reason);
              if (res.success) setDone("released_admin");
              else setError(res.error ?? "Erreur.");
            })
          }
          className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          {releasePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
          Libérer la caution
        </button>

        {/* Capturer totalité */}
        <button
          disabled={anyPending}
          onClick={() =>
            startCaptureFull(async () => {
              setError(null);
              const res = await captureDepositAdminAction(bookingId, depositAmount, reason);
              if (res.success) {
                setDone("captured_full");
                setCaptureAmount(String(depositAmount));
              } else {
                setError(res.error ?? "Erreur.");
              }
            })
          }
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {captureFullPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="h-4 w-4" />
          )}
          Capturer {depositAmount} € (total)
        </button>
      </div>

      {/* Capture partielle */}
      <div className="mt-4 flex items-end gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <div className="flex-1">
          <label className="mb-1 block text-[12px] font-medium text-slate-500">
            Montant à capturer (€)
          </label>
          <input
            type="number"
            min="0.01"
            max={depositAmount}
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
            value={captureAmount}
            onChange={(e) => setCaptureAmount(e.target.value)}
          />
        </div>
        <button
          disabled={anyPending || !captureAmount}
          onClick={() =>
            startCapturePartial(async () => {
              setError(null);
              const val = parseFloat(captureAmount);
              if (!Number.isFinite(val) || val <= 0) {
                setError("Montant invalide.");
                return;
              }
              if (val > depositAmount) {
                setError(`Le montant dépasse la caution autorisée (${depositAmount} €).`);
                return;
              }
              const res = await captureDepositAdminAction(bookingId, val, reason);
              if (res.success) setDone(val < depositAmount ? "captured_partial" : "captured_full");
              else setError(res.error ?? "Erreur.");
            })
          }
          className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {capturePartialPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="h-4 w-4" />
          )}
          Capturer
        </button>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Libérer : annule l&apos;empreinte (rien n&apos;est prélevé). Capturer : prélève le montant sur la carte du client.
      </p>

      {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
