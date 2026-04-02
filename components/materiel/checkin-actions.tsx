"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, PackageCheck, PackageOpen } from "lucide-react";

import {
  openCheckInAction,
  confirmCheckInAction,
} from "@/app/actions/gs-bookings";

type Props = {
  bookingId: string;
  initialCheckInStatus: string | null;
};

export function CheckInActions({ bookingId, initialCheckInStatus }: Props) {
  const [status, setStatus] = useState<string | null>(initialCheckInStatus);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPending, startOpen] = useTransition();
  const [confirmPending, startConfirm] = useTransition();

  if (status === "confirmed") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-700">
        <PackageCheck className="h-3.5 w-3.5" />
        Remise confirmée
      </span>
    );
  }

  if (status === "opened") {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[12px] font-semibold text-blue-700">
          <PackageOpen className="h-3.5 w-3.5" />
          Check-in ouvert
        </span>
        {showComment ? (
          <div className="flex w-full flex-col gap-1.5">
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
              placeholder="Commentaire sur l'état du matériel remis (optionnel)"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              disabled={confirmPending}
              onClick={() =>
                startConfirm(async () => {
                  setError(null);
                  const res = await confirmCheckInAction(bookingId, comment);
                  if (res.success) setStatus("confirmed");
                  else setError(res.error ?? "Erreur.");
                })
              }
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {confirmPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirmer la remise
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowComment(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-105"
          >
            <Check className="h-3.5 w-3.5" />
            Confirmer la remise
          </button>
        )}
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }

  // null — pas encore ouvert
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={openPending}
        onClick={() =>
          startOpen(async () => {
            setError(null);
            const res = await openCheckInAction(bookingId);
            if (res.success) setStatus("opened");
            else setError(res.error ?? "Erreur.");
          })
        }
        className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
      >
        {openPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageOpen className="h-3.5 w-3.5" />}
        Ouvrir le check-in
      </button>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
